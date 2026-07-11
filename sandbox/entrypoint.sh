#!/bin/bash
# ==================== ENTRYPOINT DEL SANDBOX ====================
# Arranca el escritorio virtual completo estilo Manus IA:
#   1. Xvfb (virtual framebuffer) — pantalla virtual 1280x720
#   2. openbox — window manager mínimo
#   3. x11vnc — servidor VNC para compartir el display
#   4. websockify + noVNC — puente WebSocket→VNC para ver en el navegador
#   5. sleep infinity — mantiene el contenedor vivo
#
# El usuario puede ver el escritorio en http://localhost:6080/vnc.html
# El agente puede abrir Chromium con GUI y el usuario lo ve en tiempo real.

set -e

echo "[entrypoint] Iniciando escritorio virtual del sandbox..."

# 1. Xvfb — virtual framebuffer
Xvfb :0 -screen 0 ${SCREEN_WIDTH}x${SCREEN_HEIGHT}x${SCREEN_DEPTH} &
XVFB_PID=$!
echo "[entrypoint] Xvfb iniciado (PID: $XVFB_PID) en display :0"

# Esperar a que Xvfb esté listo
sleep 1

# 2. openbox — window manager
openbox &
OB_PID=$!
echo "[entrypoint] openbox iniciado (PID: $OB_PID)"

# 3. x11vnc — servidor VNC (sin password, accesible desde el host)
x11vnc -display :0 -forever -shared -nopw -rfbport 5900 -bg -o /tmp/x11vnc.log
echo "[entrypoint] x11vnc iniciado en puerto 5900"

# 4. websockify + noVNC — puente WebSocket→VNC en puerto 6080
#    noVNC está en /usr/share/novnc/ (instalado por el paquete novnc)
NOVNC_DIR=/usr/share/novnc
if [ -d "$NOVNC_DIR" ]; then
    websockify --web=$NOVNC_DIR 6080 localhost:5900 &
    WS_PID=$!
    echo "[entrypoint] noVNC + websockify iniciado en puerto 6080"
else
    # Fallback: crear un noVNC mínimo si no está instalado
    mkdir -p /tmp/novnc
    echo "<!DOCTYPE html><html><body><h1>noVNC no instalado</h1><p>Instala el paquete novnc</p></body></html>" > /tmp/novnc/index.html
    websockify --web=/tmp/novnc 6080 localhost:5900 &
    WS_PID=$!
    echo "[entrypoint] websockify iniciado (sin noVNC) en puerto 6080"
fi

# 5. Abrir Chromium automáticamente al iniciar (página de inicio)
#    El agente puede controlar este Chromium después
sleep 1
chromium --no-sandbox --disable-gpu --start-maximized --app=https://www.google.com &
CHROME_PID=$!
echo "[entrypoint] Chromium iniciado (PID: $CHROME_PID)"

echo ""
echo "============================================"
echo "  SANDBOX LISTO — Escritorio virtual activo"
echo "============================================"
echo "  VNC directo:     puerto 5900"
echo "  noVNC (web):     http://localhost:6080/vnc.html"
echo "  Display:         :0 (${SCREEN_WIDTH}x${SCREEN_HEIGHT})"
echo "  Usuario:         agent (uid 1000)"
echo "  Workspace:       /workspace"
echo "============================================"
echo ""

# Mantener el contenedor vivo
# Si cualquier proceso crítico muere, el contenedor debe seguir
exec sleep infinity
