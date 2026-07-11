#!/usr/bin/env bash
# ==================== SETUP DEL SANDBOX (HARDENED) ====================
# Prepara todo lo necesario para que el sandbox funcione como Manus/super-z:
#   1. Construye la imagen Docker endurecida (mexa-sandbox:latest)
#      - Reconstruye automáticamente si el Dockerfile o archivos del contexto cambiaron
#   2. Levanta la red allowlist (squid + dnsmasq)
#   3. Aplica migraciones de Prisma (incluye SandboxSession)
#   4. Valida que todo esté en orden
#
# Uso:
#   bash sandbox/setup.sh            # reconstrucción automática si hay cambios
#   bash sandbox/setup.sh --force    # forzar reconstrucción de la imagen
#   bash sandbox/setup.sh --no-build # saltar build de la imagen
set -euo pipefail

IMAGE="mexa-sandbox:latest"
DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$DIR/.." && pwd)"
HASH_FILE="$DIR/.dockerfile-hash"
FORCE_REBUILD=false
SKIP_BUILD=false

for arg in "$@"; do
  case "$arg" in
    --force) FORCE_REBUILD=true ;;
    --no-build) SKIP_BUILD=true ;;
  esac
done

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
err() { echo -e "${RED}✗${NC} $1"; }
info() { echo -e "${BLUE}ℹ${NC} $1"; }

# ====== 0. Verificar Docker ======
echo ""
echo "========== VERIFICANDO DOCKER =========="
if ! command -v docker &> /dev/null; then
  err "Docker no está instalado. Instálalo con: sudo apt-get install -y docker.io"
  exit 1
fi
if ! docker info &> /dev/null; then
  err "El daemon de Docker no está corriendo. Inícialo con: sudo systemctl start docker"
  exit 1
fi
log "Docker disponible"

# ====== 1. Construir imagen endurecida (con detección de cambios) ======
echo ""
echo "========== CONSTRUYENDO IMAGEN DEL SANDBOX =========="

if [ "$SKIP_BUILD" = true ]; then
  warn "Saltando build de la imagen (--no-build)"
elif [ "$FORCE_REBUILD" = true ]; then
  info "Reconstrucción forzada (--force)"
  docker build -t "$IMAGE" "$DIR"
  log "Imagen $IMAGE reconstruida"
else
  # Calcular hash del Dockerfile + archivos del contexto (excluyendo network/ y .dockerfile-hash)
  CURRENT_HASH=$(find "$DIR" -type f \
    ! -path "$DIR/network/*" \
    ! -name ".dockerfile-hash" \
    -exec sha256sum {} \; 2>/dev/null | sort | sha256sum | cut -d' ' -f1)

  NEEDS_REBUILD=false
  if docker image inspect "$IMAGE" &> /dev/null; then
    # Imagen existe — verificar si el hash cambió
    if [ -f "$HASH_FILE" ]; then
      SAVED_HASH=$(cat "$HASH_FILE")
      if [ "$CURRENT_HASH" != "$SAVED_HASH" ]; then
        warn "Detectados cambios en el Dockerfile o archivos del contexto"
        info "  Hash anterior: ${SAVED_HASH:0:12}..."
        info "  Hash actual:   ${CURRENT_HASH:0:12}..."
        NEEDS_REBUILD=true
      else
        log "Imagen $IMAGE actualizada (sin cambios en el contexto)"
      fi
    else
      warn "Imagen existe pero no hay registro de hash previo. Reconstruyendo..."
      NEEDS_REBUILD=true
    fi
  else
    info "Imagen $IMAGE no existe. Construyendo por primera vez..."
    NEEDS_REBUILD=true
  fi

  if [ "$NEEDS_REBUILD" = true ]; then
    docker build -t "$IMAGE" "$DIR"
    echo "$CURRENT_HASH" > "$HASH_FILE"
    log "Imagen $IMAGE construida y hash guardado"
  fi
fi

# Verificar que la imagen está disponible
if ! docker image inspect "$IMAGE" &> /dev/null; then
  err "La imagen $IMAGE no está disponible. Ejecuta: bash sandbox/setup.sh --force"
  exit 1
fi

# ====== 2. Levantar red allowlist (squid + dnsmasq) ======
echo ""
echo "========== LEVANTANDO RED ALLOWLIST =========="
if ! command -v docker compose &> /dev/null; then
  warn "docker compose no disponible. Los sandboxes se crearán con networkMode='none' por defecto."
  warn "Para habilitar allowlist, instala docker compose y ejecuta:"
  warn "  cd sandbox/network && docker compose up -d"
else
  cd "$DIR/network"
  docker compose up -d
  log "Red mexa-sandbox-net lista (squid: 172.28.0.253:3128, dnsmasq: 172.28.0.254:53)"
  cd "$ROOT_DIR"
fi

# ====== 3. Migraciones de Prisma ======
echo ""
echo "========== APLICANDO MIGRACIONES DE PRISMA =========="
cd "$ROOT_DIR"
if [ ! -f ".env.local" ]; then
  warn "Creando .env.local con DATABASE_URL=sqlite por defecto"
  echo 'DATABASE_URL="file:./dev.db"' > .env.local
  echo 'OPENAI_API_KEY=sk-replace-me' >> .env.local
fi
npx prisma generate
npx prisma db push
log "Schema actualizado (incluye modelo SandboxSession)"

# ====== 4. Validación ======
echo ""
echo "========== VALIDACIÓN =========="
bash "$ROOT_DIR/scripts/validate-sandbox.sh" || true

echo ""
log "Setup completo. Ahora puedes:"
echo "  1. npm run dev"
echo "  2. Crear sandbox: curl -X POST http://localhost:3000/api/sandbox \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"taskId\":\"demo-1\",\"networkMode\":\"none\"}'"
echo "  3. Ejecutar comando: curl -X POST http://localhost:3000/api/sandbox/demo-1/exec \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"command\":\"python3 -c \\\"print(1+1)\\\"\"}'"
echo ""
echo "Opciones para próximas ejecuciones:"
echo "  bash sandbox/setup.sh            # reconstrucción automática si hay cambios"
echo "  bash sandbox/setup.sh --force    # forzar reconstrucción"
echo "  bash sandbox/setup.sh --no-build # saltar build de la imagen"
echo ""
