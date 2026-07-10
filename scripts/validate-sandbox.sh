#!/bin/bash
# ========================================
# Sandbox Validation Script (Hardened)
# Verifica que todas las capas de seguridad del sandbox estén operativas.
# ========================================

set -e

echo "🔍 Iniciando validación del sandbox endurecido..."
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0
WARNINGS=0

check_command() {
    local cmd=$1
    local name=$2
    if command -v "$cmd" &> /dev/null; then
        echo -e "${GREEN}✓${NC} $name instalado"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $name NO instalado"
        ((FAILED++))
    fi
}

check_file() {
    local file=$1
    local name=$2
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $name existe"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $name NO existe"
        ((FAILED++))
    fi
}

echo "========== HERRAMIENTAS DEL SISTEMA =========="
check_command "node" "Node.js"
check_command "npm" "npm"
check_command "python3" "Python 3"
check_command "git" "Git"
check_command "docker" "Docker"
check_command "curl" "curl"
echo ""

echo "========== IMAGEN DEL SANDBOX =========="
if docker image inspect mexa-sandbox:latest &> /dev/null; then
    echo -e "${GREEN}✓${NC} Imagen mexa-sandbox:latest construida"
    ((PASSED++))
    # Verificar que NO tiene sudo
    if docker run --rm mexa-sandbox:latest which sudo &> /dev/null; then
        echo -e "${RED}✗${NC} La imagen contiene sudo (debería no tenerlo)"
        ((FAILED++))
    else
        echo -e "${GREEN}✓${NC} Imagen sin sudo"
        ((PASSED++))
    fi
    # Verificar usuario non-root
    USER_INSIDE=$(docker run --rm mexa-sandbox:latest id -u)
    if [ "$USER_INSIDE" = "1000" ]; then
        echo -e "${GREEN}✓${NC} Usuario non-root (uid=1000) en imagen"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} Usuario dentro del contenedor es uid=$USER_INSIDE (esperado 1000)"
        ((FAILED++))
    fi
else
    echo -e "${YELLOW}⚠${NC} Imagen mexa-sandbox:latest NO construida. Ejecuta: bash sandbox/setup.sh"
    ((WARNINGS++))
fi
echo ""

echo "========== RED ALLOWLIST =========="
if docker network inspect mexa-sandbox-net &> /dev/null; then
    echo -e "${GREEN}✓${NC} Red mexa-sandbox-net existe"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠${NC} Red mexa-sandbox-net NO existe. Sandboxes usarán networkMode='none'"
    ((WARNINGS++))
fi

if docker ps --format '{{.Names}}' | grep -q "mexa-squid"; then
    echo -e "${GREEN}✓${NC} Squid proxy corriendo"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠${NC} Squid proxy NO corriendo. Allowlist inactiva."
    ((WARNINGS++))
fi

if docker ps --format '{{.Names}}' | grep -q "mexa-dnsmasq"; then
    echo -e "${GREEN}✓${NC} dnsmasq corriendo"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠${NC} dnsmasq NO corriendo."
    ((WARNINGS++))
fi
echo ""

echo "========== ARCHIVOS DE CONFIGURACIÓN =========="
check_file "sandbox/Dockerfile" "Dockerfile del sandbox"
check_file "sandbox/seccomp-profile.json" "Seccomp profile"
check_file "sandbox/network/squid.conf" "Squid allowlist config"
check_file "sandbox/network/allowlist.txt" "Allowlist de dominios"
check_file "sandbox/network/docker-compose.yml" "Docker-compose de red"
check_file "sandbox/setup.sh" "Script de setup"
check_file "prisma/schema.prisma" "Schema Prisma"
echo ""

echo "========== VARIABLES DE ENTORNO =========="
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✓${NC} .env.local existe"
    ((PASSED++))
    if grep -q "DATABASE_URL" .env.local; then
        echo -e "${GREEN}✓${NC} DATABASE_URL configurada"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} DATABASE_URL no configurada en .env.local"
        ((FAILED++))
    fi
else
    echo -e "${YELLOW}⚠${NC} .env.local no existe (ejecuta bash sandbox/setup.sh)"
    ((WARNINGS++))
fi
echo ""

echo "========== BASE DE DATOS =========="
if [ -f "prisma/dev.db" ] || [ -f "dev.db" ]; then
    echo -e "${GREEN}✓${NC} Base de datos SQLite existe"
    ((PASSED++))
    # Verificar tabla SandboxSession
    if npx prisma db execute --stdin <<< "SELECT name FROM sqlite_master WHERE type='table' AND name='SandboxSession';" 2>/dev/null | grep -q "SandboxSession"; then
        echo -e "${GREEN}✓${NC} Tabla SandboxSession creada"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠${NC} Tabla SandboxSession no encontrada. Ejecuta: npx prisma db push"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠${NC} DB no existe. Ejecuta: npx prisma db push"
    ((WARNINGS++))
fi
echo ""

echo "========== RESUMEN =========="
echo -e "${GREEN}Pasadas: $PASSED${NC}"
echo -e "${RED}Fallidas: $FAILED${NC}"
echo -e "${YELLOW}Advertencias: $WARNINGS${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ Sandbox validado correctamente${NC}"
    exit 0
else
    echo -e "${RED}✗ Sandbox tiene problemas. Revisa los fallos arriba.${NC}"
    exit 1
fi
