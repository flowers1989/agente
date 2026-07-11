# Agente IA - Código Fuente Completo

Este ZIP contiene todo el código fuente del agente IA, incluyendo las modificaciones realizadas en esta sesión.

## Tamaño: ~958 KB | 435 archivos

---

## Instalación

```bash
# 1. Descomprimir
unzip agente-codigo-fuente.zip
cd agente

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env  # o crear manualmente:
# DATABASE_URL=file:./db/custom.db
# ENCRYPTION_KEY=<generar con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# 4. Inicializar base de datos
npx prisma generate
npx prisma db push

# 5. Ejecutar en desarrollo
npm run dev

# O compilar para producción
npm run build
cp -r .next/static .next/standalone/.next/
npm run start
```

## Requisitos

- **Node.js 20+** o Bun
- **Docker** (para el sandbox de ejecución de código)
- **Playwright browsers** (`npx playwright install chromium`)
- **API key de OpenCode Go** (https://opencode.ai)

---

## Modificaciones realizadas en esta sesión

### 1. Panel de Sandbox (reemplaza al WorkspacePanel anterior)

**Archivos nuevos:**
- `src/components/agente/sandbox-panel.tsx` — Panel derecho con terminal interactiva, explorador de archivos y editor de código
- `src/lib/sandbox/sandbox-store.ts` — Store Zustand compartido para el estado del sandbox

**Archivos modificados:**
- `src/components/agente/pages/app-page.tsx` — Usa SandboxPanel en lugar de WorkspacePanel
- `src/components/ui/markdown.tsx` — Botón "▶ Ejecutar" en code blocks del chat

**Características:**
- Detección automática de Docker
- Terminal interactiva con soporte bash/python/node
- Explorador de archivos con editor de código (números de línea, Ctrl+S, Tab)
- Auto-inicio del sandbox al ejecutar código
- Multi-archivo: despliegue de proyectos completos

### 2. Generación de documentos multi-formato

**Archivos nuevos:**
- `src/lib/services/document-generator.ts` — Servicio unificado de generación
- `src/app/api/documents/generate/route.ts` — API endpoint

**Formatos soportados:**
- PDF (jsPDF)
- DOCX/Word (docx)
- XLSX/Excel (exceljs)
- PPTX/PowerPoint (pptxgenjs)
- HTML, CSV, JSON, TXT, MD

**Detección de intención:** "dame un pdf", "haz un word", "genera un excel", "crea una presentación", etc.

### 3. Compilación multiplataforma real

**Archivos modificados:**
- `src/lib/services/build-service.ts` — Conecta de verdad con electron-executor y react-native-executor (antes retornaba tamaños hardcodeados)

**Archivos nuevos:**
- `src/app/api/build/jobs/route.ts` — Crear y listar builds
- `src/app/api/build/jobs/[jobId]/route.ts` — Estado y descarga de binarios/código fuente
- `src/app/api/build/toolchains/route.ts` — Verificar toolchains disponibles

**Plataformas:**
- Web (siempre)
- Linux, Windows, macOS (Electron)
- Android, Android TV, iOS (React Native)

Cada build genera: binarios compilados + ZIP con código fuente + vista previa web.

### 4. Generador de proyectos web con frameworks modernos

**Archivos nuevos:**
- `src/lib/services/web-project-generator.ts` — Generador completo
- `src/app/api/web-projects/generate/route.ts` — API endpoint

**Frameworks:**
- Next.js 16 (React 19, App Router, Tailwind 4)
- Vite + React 19
- Vite + Vue 3
- Astro
- SvelteKit

**Tipos de proyecto:** landing, dashboard, blog, ecommerce, portfolio, admin, custom

### 5. Auto-ejecución y multi-archivo en sandbox

**Funciones añadidas a `sandbox-store.ts`:**
- `writeMultipleFilesToSandbox()` — Despliegue de proyectos completos
- `listFilesRecursive()` — Árbol de directorios
- `autoExecuteCode()` — Ejecución automática
- `autoExecuteFromMessage()` — Extrae code blocks y los ejecuta
- `deployWebProjectToSandbox()` — Despliegue de proyectos web

### 6. Hooks de ejecución

**Archivos modificados:**
- `src/hooks/use-execution.ts` — Detector de descarga ampliado para soportar docx, pptx, csv, json vía el nuevo servicio unificado

### 7. Fixes de build (archivos corruptos preexistentes)

**Archivos corregidos:**
- `src/lib/services/monitoring-service.ts`
- `src/lib/services/profiling-service.ts`
- `src/lib/services/testing-service.ts`
- `src/lib/services/versioning-service.ts`
- `src/lib/agents/pdf-generator-executor.ts`
- `src/lib/agents/electron-executor.ts`
- `src/lib/agents/react-native-executor.ts`
- `src/lib/services/build-service.ts`
- `src/lib/services/package-service.ts`
- `src/lib/services/web-preview-service.ts`
- `src/lib/agents/error-recovery.ts`
- `src/lib/agents/loop-context-manager.ts`

Estos archivos tenían `\n` literales en lugar de saltos de línea reales (corrupción por JSON-escape). Script de fix: `/home/z/my-project/scripts/fix-corrupt-files.py`

**Otros fixes:**
- `src/lib/empty-module.ts` — Exporta todos los nombres que el cliente intenta importar
- `src/lib/agents/model-selector.ts` — Añadido `getModelSelector()` singleton
- `src/lib/mock-data.ts` — Escapado de backticks en template literals

---

## Estructura del proyecto

```
agente/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── documents/generate/    # NUEVO: Generación de PDF/DOCX/XLSX/PPTX
│   │   │   ├── web-projects/generate/ # NUEVO: Generador de proyectos web
│   │   │   ├── build/                 # NUEVO: Compilación multiplataforma
│   │   │   │   ├── jobs/
│   │   │   │   └── toolchains/
│   │   │   ├── sandbox/               # Sandbox Docker
│   │   │   ├── agent/execute/         # Orquestador de 7 agentes
│   │   │   ├── chat/completions/      # Proxy LLM (OpenCode Go)
│   │   │   └── ...
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── agente/
│   │   │   ├── sandbox-panel.tsx      # NUEVO: Panel derecho con sandbox
│   │   │   ├── chat-panel.tsx
│   │   │   ├── conversation-sidebar.tsx
│   │   │   └── pages/
│   │   │       └── app-page.tsx       # MODIFICADO: Usa SandboxPanel
│   │   └── ui/
│   │       └── markdown.tsx           # MODIFICADO: Botón "Ejecutar" en code blocks
│   ├── lib/
│   │   ├── services/
│   │   │   ├── document-generator.ts  # NUEVO: PDF/DOCX/XLSX/PPTX/HTML/CSV/JSON/TXT/MD
│   │   │   ├── web-project-generator.ts # NUEVO: Next.js/Vite/Vue/Astro/SvelteKit
│   │   │   ├── build-service.ts       # MODIFICADO: Compilación real multiplataforma
│   │   │   └── ...
│   │   ├── sandbox/
│   │   │   ├── sandbox-store.ts       # NUEVO: Store + auto-ejecución + multi-archivo
│   │   │   ├── sandbox-client.ts
│   │   │   └── SandboxManager.ts
│   │   ├── agents/                    # 7 agentes + orquestador
│   │   ├── integrations/              # 28 conectores
│   │   ├── compilation/               # BuildManager, compilers
│   │   ├── memory/                    # Memoria episódica/semántica
│   │   └── ...
│   └── hooks/
│       └── use-execution.ts           # MODIFICADO: Detección de formatos ampliada
├── prisma/
│   └── schema.prisma
├── sandbox/
│   ├── Dockerfile
│   └── build-image.sh
├── package.json
├── next.config.ts
├── tsconfig.json
└── README.md
```

---

## APIs disponibles

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/documents/generate` | POST | Genera PDF/DOCX/XLSX/PPTX/HTML/CSV/JSON/TXT/MD |
| `/api/documents/generate?detect=<msg>` | GET | Detecta formato de un mensaje |
| `/api/web-projects/generate` | POST | Genera proyecto web (Next.js/Vite/Vue/Astro/SvelteKit) |
| `/api/web-projects/generate` | GET | Lista frameworks disponibles |
| `/api/build/jobs` | POST | Crea y ejecuta build multiplataforma |
| `/api/build/jobs` | GET | Lista todos los builds |
| `/api/build/jobs/:jobId` | GET | Estado del build + descarga de binarios/código |
| `/api/build/toolchains` | GET | Verifica toolchains instaladas |
| `/api/sandbox` | GET/POST | Gestión de sandboxes Docker |
| `/api/sandbox/:taskId` | GET/DELETE | Estado/detención de sandbox |
| `/api/sandbox/:taskId/exec` | POST | Ejecuta comando en sandbox |
| `/api/agent/execute` | POST | Orquestador de 7 agentes (SSE) |
| `/api/chat/completions` | POST | Proxy LLM a OpenCode Go |
| `/api/compile` | POST/GET | Compilación legacy |

---

## Próximos pasos sugeridos

1. **Probar con Docker real** — `sudo systemctl start docker && cd sandbox && bash build-image.sh`
2. **Instalar Android SDK** para builds de Android reales
3. **Integrar el orquestador** para que pida "crea un dashboard" → automáticamente llame a `/api/web-projects/generate` y despliegue en sandbox
4. **Añadir vista previa embebida** en el panel del sandbox
