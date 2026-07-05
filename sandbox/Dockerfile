# ==================== IMAGEN BASE DEL SANDBOX ====================
# Contenedor aislado por tarea donde el agente ejecuta código real.
# Inspirado en el sandbox de Manus IA: shell, filesystem, Python/Node/Bash.

FROM python:3.12-slim

# Evitar prompts interactivos de apt
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    NODE_ENV=production

# Herramientas de sistema: build-essential (gcc/make), curl, git, jq, vim,
# ca-certificates, ripgrep, ffmpeg (multimedia futuro), unzip, wget
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        curl \
        git \
        jq \
        vim \
        ca-certificates \
        ripgrep \
        ffmpeg \
        unzip \
        wget \
        less \
        procps \
    && rm -rf /var/lib/apt/lists/*

# Node.js 20 LTS (para ejecución de JS/TS y servidores web)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g npm@latest

# Librerías Python de uso común para tareas de datos/scraping
RUN pip install --no-cache-dir \
        requests \
        beautifulsoup4 \
        pandas \
        numpy \
        matplotlib \
        openpyxl \
        pillow \
        sympy

# Usuario no-root para que el agente no opere como root dentro del sandbox
RUN useradd --create-home --shell /bin/bash --uid 1000 agent

# Directorio de trabajo del agente (persistente durante la tarea)
WORKDIR /workspace
RUN chown agent:agent /workspace

USER agent

# Comando por defecto: mantener el contenedor vivo (bash interactivo)
CMD ["sleep", "infinity"]
