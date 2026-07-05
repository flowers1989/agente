# Detalles del Proyecto · Agente IA Autónomo

Documento de referencia técnica que describe el funcionamiento completo del agente, las tecnologías usadas, los modelos asignados a cada agente y la arquitectura interna.

---

## 1. Visión General

Este proyecto es un **agente IA autónomo** construido sobre Next.js 16 que puede:

1. **Responder conversaciones simples** directamente con un LLM (preguntas, saludos, explicaciones).
2. **Ejecutar tareas complejas** coordinando **7 agentes especializados** (investigación, código, datos, automatización, contenido).
3. **Interactuar con aplicaciones externas** mediante conectores OAuth2/API key (Gmail, Slack, GitHub, Notion, etc.).
4. **Controlar un navegador real** con Playwright para navegación, scraping y extracción web.
5. **Compilar/generar proyectos** para múltiples plataformas (Linux, Windows, macOS, Android, Android-TV).

El usuario solo ve "Trabajando..." en la interfaz; los 7 agentes operan de forma invisible en segundo plano, cada uno con su modelo asignado.

---

## 2. Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Framework | **Next.js 16** (App Router + Route Handlers) |
| Lenguaje | **TypeScript** estricto |
| Validación | **Zod 4** para inputs de API |
| Base de datos | **Prisma 6** + **SQLite** |
| Testing | **Vitest 4** |
| Estado cliente | **Zustand 5** (con persistencia en localStorage) |
| UI | **Tailwind CSS 4**, **shadcn/ui** (Radix UI), **Framer Motion** |
| LLM | **OpenCode Go** (proxy propio, 13 modelos) |
| Navegador | **Playwright 1.61** |
| Exportación | **jsPDF**, **xlsx**, **file-saver** |
| Markdown | **react-markdown 10** + **remark-gfm** (tablas GFM) |
| Otras | React Query, React Hook Form, react-markdown, date-fns, uuid |

### Scripts disponibles

```bash
npm run dev          # Desarrollo (puerto 3000)
npm run build        # Build de producción
npm test             # Tests unitarios (Vitest)
npm run lint         # ESLint
npx prisma db push   # Sincronizar schema con SQLite
```

---

## 3. Arquitectura General

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (cliente)                      │
│  React 19 + Zustand + Tailwind/shadcn                     │
│                                                            │
│  ChatPanel ←→ useExecutionStore ←→ useExecution (hook)    │
│  WorkspacePanel (Output/Browser/Terminal/Files/Data/Mem)  │
└───────────────────────┬───────────────────────────────────┘
                        │
            ┌───────────┴────────────┐
            │  simple-task-detector  │  ← decide simple vs complejo
            └───────────┬────────────┘
                        │
          ┌─────────────┴──────────────┐
          │                            │
   ┌──────▼──────┐            ┌────────▼────────┐
   │ Respuesta   │            │  AgentOrchest-  │
   │ directa LLM │            │    rator (7)    │
   │ (simple)    │            │  (complejo)     │
   └──────┬──────┘            └────────┬────────┘
          │                            │
          └────────────┬───────────────┘
                       │  fetch + header X-API-Key
                ┌──────▼──────────────────────┐
                │  /api/chat/completions       │  ← proxy backend
                │  (reenvía a OpenCode Go)     │
                └──────┬──────────────────────┘
                       │
                ┌──────▼──────────────────────┐
                │  https://opencode.ai/zen/go  │
                │  /v1/chat/completions        │
                └─────────────────────────────┘
```

El LLM **no se llama directamente desde el cliente** hacia OpenCode Go. Toda llamada pasa por el proxy backend `POST /api/chat/completions`, que recibe la API key en el header `X-API-Key` y la reenvía a `https://opencode.ai/zen/go/v1/chat/completions`. Así la API key no se expone al navegador.

> **Nota importante:** toda la lógica de agentes (`src/lib/agents/**`) está marcada con `"use client"` y se ejecuta en el navegador. El adaptador `OpenCodeGoAdapter` hace `fetch` al proxy. Las acciones que requieren backend (browser, compilación, conectores) se hacen vía los Route Handlers de `/api/`.

---

## 4. Los 7 Agentes Especializados

El orquestador (`src/lib/agents/orchestrator.ts`) coordina el flujo secuencial:

```
1. Analizador  → analiza el objetivo del usuario
2. Planificador → crea un plan ejecutable con pasos
3. Ejecutor     → ejecuta cada paso (vía ToolRegistry)
4. Verificador  → valida resultados (solo en errores; puede pedir retry)
5. Optimizador  → sugiere mejoras (omitido en modo económico)
6. Reportero    → genera el reporte/documento final
7. Monitor      → monitorea en background, detecta anomalías
```

### 4.1 Tabla de agentes y modelos

La **fuente de verdad en runtime** para el modelo de cada agente es `AGENTS` en `src/lib/mock-data.ts`, leída por `BaseAgent` (`src/lib/agents/base-agent.ts:47`) al llamar al LLM:

| # | Agente | Modelo (runtime) | Modelo alternativo | Velocidad | Costo | Calidad |
|---|---|---|---|---|---|---|
| 1 | Analizador | `deepseek-v4-flash` | `mimo-v2.5` | 5 | 5 | 4 |
| 2 | Planificador | `deepseek-v4-flash` | `mimo-v2.5` | 4 | 4 | 5 |
| 3 | Ejecutor | `deepseek-v4-flash` | `mimo-v2.5` | 5 | 5 | 4 |
| 4 | Verificador | `deepseek-v4-flash` | `minimax-m3` | 4 | 3 | 5 |
| 5 | Optimizador | `minimax-m3` | `mimo-v2.5` | 4 | 5 | 4 |
| 6 | Reportero | `minimax-m3` | `deepseek-v4-flash` | 4 | 3 | 5 |
| 7 | Monitor | `mimo-v2.5` | `deepseek-v4-flash` | 5 | 5 | 4 |

> **Discrepancia conocida:** los comentarios del orquestador y `planner-agent.ts:255-265` (`getModelForAgent`) mencionan `qwen3.7-plus` (planificador) y `glm-5.2` (verificador), pero esa función **solo setea metadatos** `step.modelUsed` para mostrar en la UI; **no** afecta la llamada LLM real. La llamada real usa `AGENTS[agentType].modelId` (tabla de arriba).

### 4.2 Responsabilidades por agente

**Analizador** (`analyzer-agent.ts`) — Modelo: DeepSeek V4 Flash
- Extrae entidades (personas, lugares, objetos, acciones)
- Identifica restricciones (tiempo, recursos, acceso)
- Evalúa complejidad (low/medium/high)
- Responde en JSON estructurado

**Planificador** (`planner-agent.ts`) — Modelo: DeepSeek V4 Flash
- Descompone el objetivo en pasos ejecutables
- Intenta generar plan dinámico con LLM; si falla, usa plantilla por categoría
- Identifica dependencias entre pasos y selecciona herramientas
- Estima tiempo total y factores de riesgo

**Ejecutor** (`executor-agent.ts`) — Modelo: DeepSeek V4 Flash
- Prepara parámetros para cada herramienta
- Genera queries de búsqueda optimizados (heurísticas en español→inglés, sin gastar tokens en LLM)
- Ejecuta la herramienta vía `ToolRegistry`
- Guarda resultados en working memory

**Verificador** (`verifier-agent.ts`) — Modelo: DeepSeek V4 Flash
- Valida resultados (en modo económico solo se invoca en errores)
- Analiza causa raíz y decide acción: `retry` / `skip` / `fail`
- Reintenta si probabilidad de éxito > 60%

**Optimizador** (`optimizer-agent.ts`) — Modelo: MiniMax M3
- Analiza ejecución completada, identifica cuellos de botella
- Genera sugerencias de optimización con ahorros estimados
- **Omitido en modo económico** para reducir tokens

**Reportero** (`reporter-agent.ts`) — Modelo: MiniMax M3
- Recopila datos de la ejecución y genera reporte profesional
- Si el último paso generó un documento (tareas de contenido), lo usa como reporte final
- Detecta desajuste de tema (si los resultados no mencionan el objetivo)
- Llama al LLM con `maxTokens: 8192` y pasa hasta 4000 chars por paso

**Monitor** (`monitor-agent.ts`) — Modelo: MiMo-V2.5
- Monitorea la ejecución en tiempo real
- Detecta anomalías: tiempo > 1.5x estimado, costo > 1.5x, >3 errores
- Genera reporte final de anomalías y recomendaciones

---

## 5. Los 13 Modelos OpenCode Go

Definidos en `src/lib/mock-data.ts` (`AI_MODELS`). Precios en USD por millón de tokens:

| ID | Nombre | Contexto | Costo input | Costo output | Especialidad | Badge |
|---|---|---|---|---|---|---|
| `glm-5.2` | GLM-5.2 | 1.0M | 1.4 | 4.4 | Razonamiento avanzado | premium |
| `glm-5.1` | GLM-5.1 | 203K | 1.4 | 4.4 | Razonamiento avanzado | |
| `kimi-k2.7-code` | Kimi K2.7 Code | 262K | 0.95 | 4.0 | Coding especializado | recommended |
| `kimi-k2.6` | Kimi K2.6 | 262K | 0.95 | 4.0 | Coding general | |
| `deepseek-v4-pro` | DeepSeek V4 Pro | 1.0M | 1.74 | 3.48 | Razonamiento complejo | |
| `deepseek-v4-flash` | DeepSeek V4 Flash | 1.0M | 0.14 | 0.28 | Velocidad + costo bajo | fast |
| `mimo-v2.5` | MiMo-V2.5 | 1.0M | 0.14 | 0.28 | Velocidad extrema | cheap |
| `mimo-v2.5-pro` | MiMo-V2.5-Pro | 1.0M | 1.74 | 3.48 | Calidad + velocidad | |
| `minimax-m3` | MiniMax M3 | 1.0M | 0.1 | 0.4 | Mejor relación costo/calidad | cheap |
| `minimax-m2.7` | MiniMax M2.7 | 205K | 0.3 | 1.2 | Coding balanceado | |
| `qwen3.7-max` | Qwen3.7 Max | 1.0M | 2.5 | 7.5 | Máxima calidad | premium |
| `qwen3.7-plus` | Qwen3.7 Plus | 1.0M | 0.4 | 1.6 | Calidad media-alta | |
| `qwen3.6-plus` | Qwen3.6 Plus | 1.0M | 0.5 | 3.0 | Calidad media | |

- **Modelo por defecto del adaptador:** `kimi-k2.7-code` (`opencode-adapter.ts:42`).
- El usuario puede seleccionar otro modelo desde Configuración → API, que hace override del default.

### Modelos usados en herramientas (hardcodeados en `tool-registry.ts`)

| Herramienta | Modelo | maxTokens |
|---|---|---|
| Web Extraction (fallback) | `deepseek-v4-flash` | 1024 |
| Web Search (fallback) | `deepseek-v4-flash` | 1024 |
| Code Generation | `deepseek-v4-flash` | 2048 |
| Document Generation | `deepseek-v4-flash` | 16384 |
| Data Analysis | `deepseek-v4-flash` | 4096 |

---

## 6. Flujo de Ejecución

El punto de entrada es el hook `src/hooks/use-execution.ts`, invocado cuando el usuario envía un mensaje.

### 6.1 Detección simple vs compleja

`simple-task-detector.ts` decide el camino:

- **Conversación simple** (confianza > 0.6): saludos, preguntas conceptuales, explicaciones, opiniones → respuesta directa con LLM (incluye historial de últimos 4 mensajes).
- **Tarea compleja**: contiene palabras de acción (investiga, genera, compila, scrapea, envía, conecta, etc.) → orquestador de 7 agentes.

### 6.2 Orquestación (tarea compleja)

`AgentOrchestrator.executeTask()` en `orchestrator.ts`:

1. Guarda el objetivo en working memory.
2. **Fase 1 — Análisis:** `AnalyzerAgent.analyze()`.
3. **Fase 2 — Planificación:** `PlannerAgent.createPlan()` (detecta categoría: research/code/data/automation/content/general).
4. **Fase 3 — Ejecución + Verificación:** por cada paso del plan:
   - El Ejecutor ejecuta el paso vía `ToolRegistry`.
   - Si falla, el Verificador decide retry/skip/fail.
   - Si el verificador dice `retry`, se reintenta una vez.
5. Captura el `finalOutput` del último paso completado (para tareas de contenido).
6. **Fase 5 — Optimización:** omitida en modo económico.
7. **Fase 6 — Reporte:** `ReporterAgent.generateReport()`.
8. **Fase 7 — Monitoreo final:** reporte de anomalías.
9. Aprende de la conversación → guarda en memoria episódica y semántica.

El usuario recibe callbacks progresivos (`onStepStarted`, `onStepProgress`, `onStepCompleted`, `onReportGenerated`) que actualizan la UI en tiempo real.

### 6.3 Categorías de tarea y plantillas

`detectCategory()` en `mock-data.ts` clasifica en: `research`, `code`, `data`, `automation`, `content`, `general`. Cada categoría tiene una plantilla de pasos en `TASK_TEMPLATES` usada como fallback cuando el planificador LLM falla.

---

## 7. Sistema de Memoria

`src/lib/memory/memory-store.ts` — Zustand con persistencia en localStorage. Tres tipos:

| Tipo | Persistencia | Contenido |
|---|---|---|
| **Working** | Volátil (se limpia entre conversaciones) | Contexto actual, variables del paso, objetivo, resultados de pasos, URLs de browser |
| **Episodic** | Permanente (localStorage) | Historial de tareas, errores y soluciones, resúmenes de conversaciones, reportes generados |
| **Semantic** | Permanente (localStorage) | Patrones aprendidos, mejores prácticas, estrategias que funcionaron (con `confidence` 0-1) |

Los 7 agentes leen y escriben en esta memoria compartida. El Reportero lee working memory para generar el reporte; el Planificador lee episodic para tareas similares; el Monitor lee todo para detectar anomalías.

---

## 8. Herramientas (ToolRegistry)

`src/lib/agents/tool-registry.ts` registra las herramientas ejecutables por el Ejecutor. El catálogo completo son **56 herramientas en 16 categorías** (`TOOLS` en `mock-data.ts`), pero las **implementadas realmente** en el registro son:

| Herramienta | Implementación |
|---|---|
| Browser Navigation / Screenshot / JavaScript Execution | Vía `/api/browser/sessions/:id/actions` (Playwright) |
| Web Extraction / Web Scraping | Navega + extrae texto de hasta 3 URLs; fallback a LLM |
| Web Search | `/api/search` (DuckDuckGo); fallback a LLM |
| HTTP Client | `fetch` genérico |
| Code Generation | LLM (DeepSeek V4 Flash) |
| Document Generation | LLM con contexto web extraído; detecta "N artículos" |
| Data Analysis | LLM sobre contenido web recopilado |
| File Read / File Write | localStorage (archivos virtuales) |
| Email / Chat-Messaging | Conectores OAuth2 |
| Git, Python/Node/Bash Execution, Testing, Deployment | Simulados (Deployment usa `/api/compile`) |

---

## 9. Control de Navegador (Playwright)

`src/lib/browser/BrowserControlConnector.ts` orquesta sesiones de Playwright:

- Cada sesión pertenece a un `userId` y se almacena en un `Map`.
- `belongsToUser(sessionId, userId)` verifica ownership en todos los endpoints.
- Acciones soportadas: `navigate`, `click`, `clickBySelector`, `type`, `scroll`, `screenshot`, `extractText`, `executeScript`, `getDOMRepresentation`.
- **Streaming SSE:** `GET /api/browser/sessions/:id/stream` envía screenshots cada 2s vía Server-Sent Events.
- El hook `use-browser-auto-start.ts` inicia una sesión automáticamente al entrar a la app.
- El componente `BrowserControlView.tsx` abre un `EventSource` con reconexión por backoff exponencial y verificación previa de sesión.

---

## 10. Conectores (Integraciones Externas)

`src/lib/integrations/ConnectorManager.ts` registra y ejecuta conectores. Bases:

- `OAuth2Connector` — flujo OAuth2 completo (Gmail, Slack, GitHub, Notion, etc.)
- `RestConnector` / `GraphQLConnector` — APIs con API key
- `WebhookConnector` — webhooks entrantes/salientes
- `LocalFileConnector` — archivos locales

### Conectores implementados (`src/lib/integrations/connectors/`)

| Conector | Tipo |
|---|---|
| Gmail | OAuth2 |
| Slack | OAuth2 |
| GitHub | OAuth2 |
| Notion | OAuth2 |
| Discord | OAuth2 |
| Telegram | API key |
| Google Sheets | OAuth2 |
| Shopify | OAuth2 |
| Stripe | API key |
| Figma | OAuth2 |
| LocalFile | Local |

- `CredentialManager` encripta tokens con `ENCRYPTION_KEY`.
- `ConnectorAuditLog` (tabla Prisma) guarda logs de auditoría de cada llamada.
- `ConnectorWebhookEvent` (tabla Prisma) almacena webhooks recibidos.

### Endpoints de conectores

- `POST /api/connectors` — listar/registrar conectores
- `GET /api/connectors/:connector/oauth/url` — URL de autorización OAuth2
- `GET /api/connectors/oauth/callback` — callback OAuth2
- `POST /api/connectors/:connector/credentials` — credenciales de app
- `POST /api/connectors/:connector/actions` — ejecutar acción
- `POST /api/webhooks/:source` — recibir webhooks

---

## 11. Compilación Multiplataforma

`src/lib/compilation/BuildManager.ts` crea builds en `uploads/builds/`:

- **Linux:** se compila realmente con Python (`LinuxCompiler.ts` empaqueta `main.py` + `README.md` + Makefile en `.tar.gz`).
- **Windows / macOS / Android / Android-TV:** generan estructura simulada (proyecto + README por plataforma).
- `src/lib/compilation/recommender.ts` recomienda framework/plataforma según el objetivo del usuario.

### Endpoints

- `POST /api/recommendations` — recomendar stack según objetivo
- `POST /api/compile` — crear build
- `GET /api/compile/:id` — estado del build
- `GET /api/compile/download/:buildId/:fileName` — descargar artefacto

---

## 12. API Routes (Backend)

Todos los endpoints en `src/app/api/`. Los sensibles usan `withRateLimit` y validan con Zod.

| Route | Método | Función |
|---|---|---|
| `/api/chat/completions` | POST | Proxy a OpenCode Go (header `X-API-Key`) |
| `/api/search` | POST | Búsqueda web (DuckDuckGo) |
| `/api/browser/sessions` | POST | Crear sesión Playwright |
| `/api/browser/sessions/:id` | GET/DELETE | Info/cerrar sesión |
| `/api/browser/sessions/:id/actions` | POST | Ejecutar acción de navegador |
| `/api/browser/sessions/:id/screenshot` | GET | Screenshot |
| `/api/browser/sessions/:id/stream` | GET | Stream SSE de screenshots |
| `/api/connectors/*` | Varios | OAuth2, credenciales, acciones |
| `/api/webhooks/:source` | POST | Recibir webhooks |
| `/api/compile` | POST | Crear build multiplataforma |
| `/api/compile/:id` | GET | Estado del build |
| `/api/compile/download/...` | GET | Descargar artefacto |
| `/api/recommendations` | POST | Recomendar stack |
| `/api/integrations` | GET/POST | Integraciones registradas |
| `/api/integrations/:source/resources` | GET | Recursos de una integración |
| `/api/resources/recent` | GET | Recursos recientes |
| `/api/uploads/:path` | GET | Servir archivos subidos |

---

## 13. Seguridad

| Mecanismo | Archivo |
|---|---|
| Rate limiting en memoria | `src/lib/api/rate-limit-helper.ts` |
| Validación Zod reutilizable | `src/lib/api/validation.ts` |
| CSP y security headers | `src/middleware.ts` |
| Auth demo (usuario único) | `src/lib/api/auth.ts` (`getUserId()`, `getIdentifier()`) |
| Encriptación de tokens | `ENCRYPTION_KEY` (CredentialManager) |

Reglas del proyecto (ver `AGENTS.md`):
- Todo endpoint que reciba JSON valida con Zod.
- Todo endpoint que escriba/ejecute acciones tiene rate limiting.
- Nunca devolver `accessToken`, `refreshToken`, `apiKey`, `clientSecret` en JSON.
- Usar `path.resolve()` + `startsWith()` para evitar path traversal.
- No exponer stack traces en producción.

El `middleware.ts` excluye las rutas `/api/` del matcher (los headers de seguridad se aplican al resto). El CSP permite `connect-src 'self' https://opencode.ai`.

---

## 14. Frontend

### Páginas (`src/components/agente/pages/`)

`landing`, `auth`, `onboarding`, `app`, `dashboard`, `history`, `reports`, `settings`, `documentation`, `not-found`. El router está en `app-router.tsx` (estado `useAppStore`).

### Componentes principales

| Componente | Función |
|---|---|
| `ChatPanel` | Chat con el agente, muestra pasos y output |
| `WorkspacePanel` | Panel derecho con tabs: Output / Browser / Terminal / Files / Data / Memory |
| `BrowserControlView` | Control manual del navegador Playwright |
| `ConversationSidebar` | Lista de conversaciones |
| `IntegrationMenu` | Menú de conectores/integraciones |

### Stores (Zustand)

| Store | Estado |
|---|---|
| `store-task` | Conversaciones y mensajes |
| `store-execution` | Workspace, agentes activos, ejecución |
| `store-app` | Routing, usuario, config API |
| `store-browser` | Sesión de navegador (screenshot, logs, elementos) |
| `memory-store` | Sistema de memoria (working/episodic/semantic) |

### Renderizado de reportes

El componente `src/components/ui/markdown.tsx` renderiza el contenido con `react-markdown` + `remark-gfm` (títulos, **tablas GFM**, listas, código, blockquotes, enlaces). Se usa en:
- `WorkspacePanel.OutputView` (vista completa del reporte).
- `ChatPanel.OutputBlock` (previsualización compacta con degradado).

### Exportación de reportes

`src/lib/export-report.ts` exporta a 5 formatos desde el mismo contenido:

| Formato | Conversión |
|---|---|
| **PDF** | Markdown → texto plano legible + paginación multi-página (jsPDF) |
| **HTML** | Markdown → HTML con tablas, CSS profesional |
| **Excel** | Extrae tablas Markdown → hojas XLSX |
| **TXT** | Markdown → texto plano legible |
| **Markdown** | Descarga cruda `.md` |

El contenido generado por el LLM es **agnóstico al formato**: los prompts no mencionan "Markdown", así el mismo contenido se exporta limpio a cualquier formato.

---

## 15. Esquema de Base de Datos (Prisma)

`prisma/schema.prisma` con SQLite:

| Modelo | Propósito |
|---|---|
| `User` | Usuarios |
| `Post` | Posts de ejemplo |
| `IntegrationAccount` | Cuentas OAuth2 por usuario (tokens encriptados) |
| `ConnectorCredential` | Credenciales de app OAuth2 por conector |
| `ConnectorAuditLog` | Logs de auditoría de llamadas a conectores |
| `ConnectorWebhookEvent` | Webhooks recibidos |
| `Resource` | Recursos sincronizados de integraciones |

> **Nota:** durante el análisis se detectó un error `NOT NULL constraint failed: session_message.seq` que no corresponde a ningún modelo del schema actual. Si aparece en runtime, indica una tabla huérfana en SQLite o código que referencia un modelo no declarado.

---

## 16. Estructura de Directorios

```
src/
├── app/
│   ├── api/                  # Route Handlers (24 endpoints)
│   └── ...                   # Layouts y páginas Next.js
├── components/
│   ├── agente/               # App del agente (chat, workspace, pages)
│   │   └── browser/          # Control de navegador
│   ├── integration/          # Menú de integraciones
│   └── ui/                   # shadcn/ui + markdown.tsx
├── hooks/
│   ├── use-task.ts           # Conversaciones
│   ├── use-execution.ts      # Ejecución del orquestador
│   └── use-browser-auto-start.ts
├── lib/
│   ├── agents/               # Los 7 agentes + orquestador + tool-registry
│   ├── browser/              # BrowserControlConnector + BrowserSession
│   ├── compilation/          # BuildManager + compilers + recommender
│   ├── integrations/         # ConnectorManager + connectors/
│   ├── memory/               # memory-store (3 tipos)
│   ├── api/                  # auth, rate-limit, validation
│   ├── export-report.ts      # Exportación PDF/HTML/Excel/TXT/MD
│   ├── mock-data.ts          # 13 modelos, 7 agentes, 56 herramientas
│   ├── store-*.ts            # Stores Zustand
│   └── types.ts              # Tipos del dominio
└── middleware.ts             # CSP + security headers
```

---

## 17. Configuración

Variables de entorno (`.env`):

| Variable | Uso |
|---|---|
| `DATABASE_URL` | URL de SQLite (Prisma) |
| `ENCRYPTION_KEY` | Llave para encriptar tokens de conectores |

La **API key de OpenCode Go** se gestiona en el cliente (Configuración → API) y se envía en cada request vía header `X-API-Key` al proxy backend.

---

## 18. Estado del Proyecto

El proyecto está en desarrollo activo. Modos de funcionamiento:

- **Con API key configurada:** llamadas reales a OpenCode Go vía proxy. Resultados reales.
- **Sin API key:** los agentes y herramientas hacen fallback a simulaciones y heurísticas locales (búsquedas en español→inglés, plantillas por categoría, avisos de "API KEY REQUERIDA").

El modo económico (actual) omite verificación de pasos exitosos y optimización para reducir consumo de tokens.
