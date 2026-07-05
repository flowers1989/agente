#!/usr/bin/env bash
# Construye la imagen base del sandbox del agente.
# Ejecutar una vez (o tras cambiar sandbox/Dockerfile):
#   bash sandbox/build-image.sh
set -euo pipefail

IMAGE="mexa-sandbox:latest"
DIR="$(cd "$(dirname "$0")" && pwd)"

echo "→ Construyendo imagen $IMAGE desde $DIR ..."
docker build -t "$IMAGE" "$DIR"
echo "✓ Imagen $IMAGE lista."
echo "  Prueba rápida: docker run --rm $IMAGE python -c 'print(\"sandbox OK\")'"
