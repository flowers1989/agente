# ==================== IMAGEN BASE DEL SANDBOX (MANUS IA STYLE) ====================
# Contenedor aislado por tarea donde el agente ejecuta código real.
# 
# CARACTERÍSTICAS:
#   - Escritorio virtual (Xvfb + openbox) visible vía VNC/noVNC
#   - Navegador Chromium REAL (no headless) para que el usuario lo vea
#   - Python 3.12 + Node.js 20 + Playwright
#   - Streaming de pantalla en tiempo real vía websockify + noVNC
#   - Usuario non-root (uid 1000)
#   - /workspace efímero (tmpfs en runtime)

FROM python:3.12-slim AS builder

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Stage 1: instalar dependencias Python en /opt para copiarlas limpias después
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        curl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir --prefix=/opt/pylibs \
        requests \
        beautifulsoup4 \
        pandas \
        numpy \
        matplotlib \
        openpyxl \
        pillow \
        sympy \
        httpx \
        pyyaml \
        playwright

# ==================== Stage 2: runtime con escritorio virtual ====================
FROM python:3.12-slim

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    NODE_ENV=production \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DISPLAY=:0 \
    SCREEN_WIDTH=1280 \
    SCREEN_HEIGHT=720 \
    SCREEN_DEPTH=24

# Runtime essentials + X11 + VNC + noVNC + Chromium GUI
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        git \
        jq \
        ca-certificates \
        ripgrep \
        unzip \
        wget \
        less \
        procps \
        coreutils \
        # ====== X11 / escritorio virtual ======
        xvfb \
        x11vnc \
        openbox \
        xterm \
        xdotool \
        xclip \
        # ====== noVNC / websockify ======
        python3-websockify \
        novnc \
        # ====== Chromium GUI (no headless) ======
        chromium \
        chromium-driver \
        # ====== Dependencias de Chromium ======
        libnss3 \
        libnspr4 \
        libatk1.0-0 \
        libatk-bridge2.0-0 \
        libcups2 \
        libdrm2 \
        libxkbcommon0 \
        libxcomposite1 \
        libxdamage1 \
        libxfixes3 \
        libxrandr2 \
        libgbm1 \
        libasound2 \
        libatspi2.0-0 \
        libxshmfence1 \
        fonts-liberation \
        fonts-noto-color-emoji \
        fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get purge -y --auto-remove

# Node.js 20 LTS runtime
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g npm@latest --silent

# Copiar librerías Python pre-instaladas del builder (incluye playwright)
COPY --from=builder /opt/pylibs /usr/local

# Instalar Chromium para Playwright (separado del chromium del sistema)
RUN mkdir -p /opt/ms-playwright \
    && PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright python3 -m playwright install chromium \
    && chown -R 1000:1000 /opt/ms-playwright

# Usuario non-root con uid fijo 1000
RUN groupadd -g 1000 agent \
    && useradd --create-home --shell /bin/bash --uid 1000 --gid 1000 --no-user-group agent

# Script de inicio del escritorio virtual + VNC + noVNC
COPY --chown=agent:agent sandbox/entrypoint.sh /home/agent/entrypoint.sh
RUN chmod +x /home/agent/entrypoint.sh

# Directorio de trabajo
WORKDIR /workspace
RUN chown agent:agent /workspace /home/agent /opt/ms-playwright

# PATH y variables de entorno
ENV PATH="/home/agent/.local/bin:${PATH}" \
    PYTHONPATH="/home/agent/.local/lib/python3.12/site-packages:${PYTHONPATH}" \
    PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    CHROME_BIN=/usr/bin/chromium \
    CHROMIUM_BIN=/usr/bin/chromium

USER agent

# El entrypoint arranca Xvfb + openbox + x11vnc + websockify + sleep
ENTRYPOINT ["/home/agent/entrypoint.sh"]
