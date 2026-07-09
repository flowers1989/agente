#!/bin/bash

# ========================================
# Sandbox Validation Script
# Verifica que todas las dependencias y herramientas estén disponibles
# ========================================

set -e

echo "🔍 Iniciando validación del sandbox..."
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contadores
PASSED=0
FAILED=0
WARNINGS=0

# Función para verificar comando
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

# Función para verificar versión
check_version() {
    local cmd=$1
    local name=$2
    local version_flag=${3:---version}
    
    if command -v "$cmd" &> /dev/null; then
        local version=$($cmd $version_flag 2>&1 | head -n1)
        echo -e "${GREEN}✓${NC} $name: $version"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $name NO instalado"
        ((FAILED++))
    fi
}

# Función para verificar puerto
check_port() {
    local port=$1
    local name=$2
    
    if nc -z localhost $port 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Puerto $port ($name) disponible"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠${NC} Puerto $port ($name) NO disponible"
        ((WARNINGS++))
    fi
}

# Función para verificar archivo
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

# Función para verificar directorio
check_dir() {
    local dir=$1
    local name=$2
    
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✓${NC} Directorio $name existe"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} Directorio $name NO existe"
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
check_command "wget" "wget"
check_command "nc" "netcat"
echo ""

echo "========== VERSIONES =========="
check_version "node" "Node.js" "--version"
check_version "npm" "npm" "--version"
check_version "python3" "Python 3" "--version"
check_version "git" "Git" "--version"
echo ""

echo "========== INTÉRPRETES DE CÓDIGO =========="
check_command "python" "Python"
check_command "python3" "Python 3"
check_command "node" "Node.js"
check_command "bash" "Bash"
check_command "sh" "Shell"
echo ""

echo "========== HERRAMIENTAS DE DESARROLLO =========="
check_command "npm" "npm"
check_command "npx" "npx"
check_command "git" "Git"
check_command "docker" "Docker"
check_command "docker-compose" "Docker Compose"
echo ""

echo "========== HERRAMIENTAS DE UTILIDAD =========="
check_command "curl" "curl"
check_command "wget" "wget"
check_command "jq" "jq"
check_command "grep" "grep"
check_command "sed" "sed"
check_command "awk" "awk"
echo ""

echo "========== ARCHIVOS DE PROYECTO =========="
check_file "package.json" "package.json"
check_file "tsconfig.json" "tsconfig.json"
check_file "next.config.ts" "next.config.ts"
check_file "tailwind.config.ts" "tailwind.config.ts"
echo ""

echo "========== DIRECTORIOS DE PROYECTO =========="
check_dir "src" "src"
check_dir "src/lib" "src/lib"
check_dir "src/app" "src/app"
check_dir "src/components" "src/components"
check_dir "node_modules" "node_modules"
echo ""

echo "========== VARIABLES DE ENTORNO =========="
if [ -z "$NODE_ENV" ]; then
    echo -e "${YELLOW}⚠${NC} NODE_ENV no configurada"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓${NC} NODE_ENV=$NODE_ENV"
    ((PASSED++))
fi

if [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${YELLOW}⚠${NC} OPENAI_API_KEY no configurada"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓${NC} OPENAI_API_KEY configurada"
    ((PASSED++))
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠${NC} DATABASE_URL no configurada"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓${NC} DATABASE_URL configurada"
    ((PASSED++))
fi
echo ""

echo "========== PUERTOS =========="
check_port 3000 "Next.js"
check_port 5432 "PostgreSQL"
check_port 6379 "Redis"
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
    echo -e "${RED}✗ Sandbox tiene problemas. Por favor, instala las dependencias faltantes.${NC}"
    exit 1
fi
