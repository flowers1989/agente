# Agente IA · Next.js

Agente multi-agente construido con Next.js, TypeScript, Prisma y Playwright.

## Características

- **7 agentes especializados**: Analyzer, Planner, Executor, Verifier, Optimizer, Reporter, Monitor.
- **Respuesta directa** para conversaciones simples y **orquestador completo** para tareas complejas.
- **Integraciones multi-fuente**: Figma, archivos locales y más.
- **Sistema de conectores**: Slack, Gmail, GitHub, Notion, Google Sheets, Discord, Telegram y 20+ esqueletos.
- **Browser Control** con Playwright: navegación, clicks, screenshots, extracción de texto y DOM.
- **Compilación multiplataforma**: Linux (real), Android, Windows, macOS, Android TV (estructura).

## Requisitos

- Node.js 20+ o Bun
- SQLite (usado por Prisma por defecto)
- Playwright browsers instalados
- Una API key de [OpenCode Go](https://opencode.ai) para pruebas reales

## Instalación

```bash
npm install
npx prisma generate
npx playwright install chromium
```

## Configuración

Crea un archivo `.env` en la raíz:

```env
DATABASE_URL=file:./db/custom.db
ENCRYPTION_KEY=tu_clave_de_32_bytes_hex_aqui_64_caracteres
```

> Genera una clave segura: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## Desarrollo

```bash
npm run dev
```

La app estará en `http://localhost:3000`.

## Tests

```bash
npm test
npm run test:coverage
```

## Build de producción

```bash
npm run build
npm run start
```

## Prueba de fuego con OpenCode Go

Ve a `FUEGO.md` para instrucciones detalladas.

## Estructura del proyecto

```
src/
  app/api/         # Route handlers de Next.js
  components/      # Componentes React
  lib/
    agents/        # Orquestador, agentes, ToolRegistry, adaptador LLM
    browser/       # BrowserSession, BrowserControlConnector
    compilation/   # BuildManager, analizador, recomendador, generador
    integrations/  # ConnectorManager, IntegrationManager, conectores
    memory/        # Sistema de memoria persistente
  prisma/          # Schema de Prisma
```

## Seguridad

- Las credenciales de integraciones se encriptan con AES-256-GCM.
- Las API keys ya no viajan al cliente: el chat con OpenCode Go pasa por `/api/chat/completions`.
- Todos los endpoints sensibles tienen rate limiting en memoria.
- Los inputs de API se validan con Zod.
- El middleware añade CSP y headers de seguridad básicos.

## Licencia

MIT
