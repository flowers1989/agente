# ==================== IMAGEN BASE DEL SANDBOX (HARDENED) ====================
# Contenedor aislado por tarea donde el agente ejecuta código real.
# Inspirado en el sandbox de Manus IA, con capas adicionales de seguridad:
#   - Usuario non-root (uid 1000)
#   - Solo Python + Node + herramientas mínimas (sin gcc después de build)
#   - /workspace efímero (tmpfs en runtime)
#   - /home/agent escribible (para pip install --user)
#   - Sin systemd, sin sudo, sin setuid binaries

FROM python:3.12-slim AS builder

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Stage 1: instalar dependencias en /opt para copiarlas limpias después
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        curl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Python deps (pre-instaladas para evitar downloads en runtime)
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
        pyyaml

# ==================== Stage 2: runtime mínimal ====================
FROM python:3.12-slim

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    NODE_ENV=production \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Solo runtime essentials. NO build-essential, NO gcc, NO vim.
# ripgrep para buscar, jq para JSON, git para clonar, curl/wget para fetch.
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
    && rm -rf /var/lib/apt/lists/* \
    && apt-get purge -y --auto-remove

# Node.js 20 LTS runtime solo (sin npm global, sin build tools)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g npm@latest --silent

# Copiar librerías Python pre-instaladas del builder
COPY --from=builder /opt/pylibs /usr/local

# Usuario non-root con uid fijo 1000 (sin sudo, sin password)
RUN groupadd -g 1000 agent \
    && useradd --create-home --shell /bin/bash --uid 1000 --gid 1000 --no-user-group agent \
    && rm -rf /etc/sudoers /etc/sudoers.d /usr/bin/sudo /bin/su

# Directorio de trabajo del agente (será tmpfs en runtime)
WORKDIR /workspace
RUN chown agent:agent /workspace /home/agent

# PATH incluye ~/.local/bin para pip install --user
ENV PATH="/home/agent/.local/bin:${PATH}" \
    PYTHONPATH="/home/agent/.local/lib/python3.12/site-packages:${PYTHONPATH}"

USER agent

# Sin CMD: el SandboxManager inicia con `sleep infinity` via HostConfig
CMD ["sleep", "infinity"]
