#!/bin/bash

# ========================================
# Sandbox Setup Script
# Instala y configura todas las dependencias necesarias
# ========================================

set -e

echo "🚀 Iniciando configuración del sandbox..."
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Función para instalar paquete
install_package() {
    local package=$1
    local name=$2
    
    echo -e "${YELLOW}→${NC} Instalando $name..."
    
    if command -v apt-get &> /dev/null; then
        sudo apt-get update -qq
        sudo apt-get install -y -qq "$package" > /dev/null 2>&1
    elif command -v brew &> /dev/null; then
        brew install "$package" > /dev/null 2>&1
    else
        echo "No se pudo instalar $name - gestor de paquetes no encontrado"
        return 1
    fi
    
    echo -e "${GREEN}✓${NC} $name instalado"
}

echo "========== ACTUALIZANDO SISTEMA =========="
if command -v apt-get &> /dev/null; then
    echo -e "${YELLOW}→${NC} Actualizando apt..."
    sudo apt-get update -qq
fi
echo ""

echo "========== HERRAMIENTAS DEL SISTEMA =========="
# Verificar e instalar herramientas básicas
if ! command -v curl &> /dev/null; then install_package "curl" "curl"; fi
if ! command -v wget &> /dev/null; then install_package "wget" "wget"; fi
if ! command -v git &> /dev/null; then install_package "git" "git"; fi
if ! command -v jq &> /dev/null; then install_package "jq" "jq"; fi
if ! command -v nc &> /dev/null; then install_package "netcat" "netcat"; fi
echo ""

echo "========== INTÉRPRETES =========="
# Verificar e instalar Python
if ! command -v python3 &> /dev/null; then
    install_package "python3" "Python 3"
    install_package "python3-pip" "pip3"
fi

# Verificar e instalar Node.js
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}→${NC} Instalando Node.js..."
    if command -v apt-get &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y -qq nodejs > /dev/null 2>&1
    fi
fi
echo ""

echo "========== DEPENDENCIAS DEL PROYECTO =========="
# Instalar dependencias de Node.js
if [ -f "package.json" ]; then
    echo -e "${YELLOW}→${NC} Instalando dependencias de npm..."
    npm install --legacy-peer-deps > /dev/null 2>&1
    echo -e "${GREEN}✓${NC} Dependencias de npm instaladas"
fi
echo ""

echo "========== CONFIGURACIÓN DE BASE DE DATOS =========="
# Configurar Prisma
if [ -f "prisma/schema.prisma" ]; then
    echo -e "${YELLOW}→${NC} Generando cliente de Prisma..."
    npx prisma generate > /dev/null 2>&1
    echo -e "${GREEN}✓${NC} Cliente de Prisma generado"
fi
echo ""

echo "========== VARIABLES DE ENTORNO =========="
# Crear archivo .env.local si no existe
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}→${NC} Creando archivo .env.local..."
    cat > .env.local << 'EOF'
# Next.js
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000

# OpenAI / LLM
OPENAI_API_KEY=sk-test-key-replace-with-real-key
OPENAI_API_BASE=https://api.openai.com/v1

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/agente_db

# Redis (opcional)
REDIS_URL=redis://localhost:6379

# Playwright
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=false

# Sandbox
SANDBOX_ENABLED=true
SANDBOX_TIMEOUT=300000
EOF
    echo -e "${GREEN}✓${NC} Archivo .env.local creado"
    echo -e "${YELLOW}⚠${NC}  Por favor, actualiza las variables en .env.local con tus valores reales"
fi
echo ""

echo "========== COMPILACIÓN =========="
# Compilar TypeScript
echo -e "${YELLOW}→${NC} Compilando TypeScript..."
npm run build > /dev/null 2>&1 || true
echo -e "${GREEN}✓${NC} Compilación completada"
echo ""

echo "========== VALIDACIÓN =========="
# Ejecutar validación
if [ -f "scripts/validate-sandbox.sh" ]; then
    chmod +x scripts/validate-sandbox.sh
    bash scripts/validate-sandbox.sh
fi
echo ""

echo -e "${GREEN}✓ Sandbox configurado correctamente${NC}"
echo ""
echo "Próximos pasos:"
echo "1. Actualiza las variables en .env.local con tus valores reales"
echo "2. Ejecuta: npm run dev"
echo "3. Abre: http://localhost:3000"
