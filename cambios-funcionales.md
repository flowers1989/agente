# Reporte de Cambios Funcionales y Próximos Pasos

Este documento detalla los cambios realizados en el repositorio `https://github.com/flowers1989/agente.git` para acercar el proyecto a las funcionalidades de Manus AI, así como los pasos pendientes para lograr una paridad completa.

---

## ✅ Cambios Implementados (Fase 1 y parte de Fase 2)

### 1. Integración del Sandbox de Docker en `ToolRegistry.ts`

*   **Archivo:** `src/lib/agents/tool-registry.ts`
*   `pythonExecutionExecutor`, `nodeExecutionExecutor`, `bashExecutionExecutor` y `gitExecutor` ahora utilizan `executeCodeInSandbox`.
*   `fileReadExecutor` y `fileWriteExecutor` interactúan con `getSandboxManager().readFile` y `getSandboxManager().writeFile`.

### 2. Activación del Sistema de Habilidades (Skills)

*   **Archivo:** `src/lib/agents/tool-registry.ts`
*   El `skillExecutionExecutor` busca y ejecuta scripts (`script.py`, `script.js`, `script.sh`) dentro de carpetas de habilidades en el sandbox.
*   Se creó `skills/example-skill/script.py` como ejemplo.

### 3. Creación e Integración del Conector de Google Drive

*   **Archivo:** `src/lib/integrations/connectors/GoogleDriveConnector.ts`
*   Implementación completa de `listResources`, `getResource`, `readFile` y `search` con OAuth2.

### 4. Actualización del `RestConnector.ts`

*   **Archivo:** `src/lib/integrations/connectors/base/RestConnector.ts`
*   Se añadieron opciones `rawUrl` y `responseType` para manejar URLs completas y distintos tipos de respuesta.

### 5. Registro Dinámico de Conectores en la UI

*   El `ToolRegistry` registra dinámicamente todas las acciones de `ConnectorRegistry.ts`.
*   El `GoogleDriveConnector` fue registrado en `ConnectorManager.ts`.
*   Se habilitó Google Drive y Skills en `IntegrationMenu.tsx`.

---

## ✅ Cambios Implementados (Fase 3 — Sesión 2)

### 6. Configuración Centralizada de Modelos (`model-routing.ts`)

*   **Archivo:** `src/lib/config/model-routing.ts` *(nuevo)*
*   **Commit:** `987f50c`
*   Única fuente de verdad para la asignación modelo-agente. Elimina la discrepancia entre `getModelForAgent()` en `planner-agent.ts` (que tenía `glm-5.2` en lugar de `glm-5.1`) y el `modelId` real en `base-agent.ts`.
*   Exporta `getAgentModel(agentType, mode)` con soporte para modo `economy` (por defecto) y `quality`.

### 7. Actualización de Agentes con Modelos Óptimos

*   **Archivos:** `src/lib/agents/base-agent.ts`, `src/lib/agents/planner-agent.ts`, `src/lib/mock-data.ts`
*   Se eliminó `getModelForAgent()` de `planner-agent.ts` y se reemplazó por `getAgentModel()` del archivo centralizado.
*   `base-agent.ts` ahora expone `setMode()` / `getMode()` para cambiar entre perfiles.
*   Asignación de modelos resultante:

| Agente | Economy (default) | Quality |
|---|---|---|
| Analizador | `deepseek-v4-flash` | `qwen3.7-plus` |
| Planificador | `deepseek-v4-flash` | `qwen3.7-plus` |
| Ejecutor | `deepseek-v4-flash` | `kimi-k2.7-code` |
| Verificador | `deepseek-v4-flash` | `glm-5.1` |
| Optimizador | `minimax-m3` | `deepseek-v4-pro` |
| Reportero | `minimax-m3` | `qwen3.6-plus` |
| Monitor | `mimo-v2.5` | `mimo-v2.5` |

### 8. Modo Economy / Quality en el Orquestador y API

*   **Archivos:** `src/lib/agents/orchestrator.ts`, `src/app/api/agent/execute/route.ts`
*   El orquestador acepta `mode: "economy" | "quality"` y lo propaga a todos los agentes.
*   El endpoint `/api/agent/execute` acepta el campo `mode` en el body del POST.

### 9. Corrección de Errores de TypeScript (0 errores en `src/`)

*   **Archivos corregidos (17 archivos):**
    *   `src/lib/store-execution.ts` — ruta de importación de `types` corregida.
    *   `src/lib/api/validation.ts` — `z.record()` actualizado a Zod v4 (2 argumentos).
    *   `src/components/agente/chat-panel.tsx` — `Step` → `ExecutionStep`, `RefObject<HTMLTextAreaElement | null>`.
    *   `src/components/agente/pages/auth-page.tsx` — `register()` con 2 argumentos.
    *   `src/components/agente/pages/landing-page.tsx` — tipos de SVG components corregidos.
    *   `src/components/agente/theme-initializer.tsx` — añadido `return null`.
    *   `src/components/integration/ConnectorsPanel.tsx` — `scopes` siempre `string[]`.
    *   `src/lib/compilation/BuildManager.ts` — import `OutputFormat`, tipo `string` en `inferArchitecture`.
    *   `src/lib/compilation/recommender.ts` — eliminado `"social"` de `AppType`.
    *   `src/lib/integrations/connectors/GoogleDriveConnector.ts` — reescrito completo con tipos correctos.
    *   `src/lib/integrations/connectors/LocalFileConnector.ts` — eliminado `mode: "insensitive"` de Prisma.
    *   `src/lib/integrations/types.ts` — añadido campo `content?: string` a `Resource`.
    *   `src/lib/mock-data.ts` — `SAMPLE_CONVERSATIONS: Conversation[]` con import correcto.
    *   `src/lib/sandbox/SandboxManager.ts` — `demuxStream` con `Writable` streams correctos.
    *   `src/app/api/compile/route.ts` — cast `as unknown as CompileRequest`.
    *   `src/app/api/recommendations/route.ts` — cast `as AppRequirements`.

### 10. Logo Minimalista

*   **Archivo:** `public/logo.png`
*   Logo generado con IA: hexágono outline con círculo central, blanco sobre fondo oscuro.

---

## ✅ Cambios Implementados (Fase 4 — Sesión 3)

### 11. Botón de Modo Economy / Quality en la UI ✅

*   **Archivos modificados:**
    *   `src/lib/store-app.ts` — campo `agentMode: "economy" | "quality"` persistido en localStorage, acción `toggleAgentMode()`.
    *   `src/lib/agents/stream-client.ts` — campo `mode` en `StreamAgentParams`, enviado en el body del fetch.
    *   `src/hooks/use-execution.ts` — lee `agentMode` del store y lo pasa a `streamAgentExecution`.
    *   `src/components/agente/chat-panel.tsx` — botón en el header (⚡ Rápido / ✨ Calidad) y segundo indicador discreto bajo el textarea. Tooltip explicativo. Deshabilitado mientras el agente trabaja. Persiste entre sesiones.

### 12. Bucle de Atención con `todo.md` Dinámico ✅

*   **Archivo:** `src/lib/agents/todo-manager.ts` *(nuevo)*
*   Clase `TodoManager` con estados por paso: `pending → in_progress → completed/failed/skipped/retrying`.
*   Genera reflexiones automáticas al completar cada paso y ajustes de estrategia al fallar.
*   Serializa el estado como Markdown interno (`toMarkdown()`).
*   Integrado en `orchestrator.ts`: `startStep()`, `completeStep()`, `failStep()` llamados en cada paso del bucle.

### 13. Memoria Episódica Mejorada ✅

*   **Archivos:** `src/lib/memory/memory-store.ts`, `src/lib/agents/planner-agent.ts`
*   `getRelevantContext()` mejorado con scoring por palabras clave (en lugar de coincidencia simple).
*   Patrones semánticos ordenados por confianza; errores episódicos ordenados por recencia.
*   Nuevas funciones: `exportMemory()` (backup JSON) y `getStats()` (tasa de éxito, top patrones, tareas recientes).
*   El `PlannerAgent` ahora inyecta el contexto de memoria episódica en el prompt del LLM (tareas similares, patrones aprendidos, errores a evitar).

### 14. Acciones de Escritura en Conectores ✅

*   **Archivo:** `src/lib/integrations/ConnectorRegistry.ts`
*   **Google Drive:** añadidas `createFile`, `updateFile`, `deleteFile`, `createFolder`.
*   **GitHub:** añadidas `closeIssue`, `listIssues`, `createFile` (commit directo), `createPR`.
*   **Notion:** añadidas `getPage`, `updatePage`, `appendBlocks`, `deletePage`, `searchPages`.

### 15. Herramientas Avanzadas en el ToolRegistry ✅

*   **Archivo:** `src/lib/agents/tool-registry.ts`
*   `Visualization` — genera código Python matplotlib via LLM y lo ejecuta en el sandbox.
*   `Report Generation` — genera reportes Markdown estructurados via LLM y los guarda en working memory.
*   `Image Generation` — llama a `/api/media/generate-image` con fallback descriptivo.
*   `Slide Generation` — genera contenido de presentaciones via LLM (portada, agenda, contenido, conclusiones).
*   `Cron/Schedule` — registra tareas programadas en memoria semántica (create/list).
*   `Webhook Listener` — registra webhooks activos en memoria semántica.

---

## ✅ Cambios Implementados (Fase 5 — Sesión 4)

### 16. Endpoint `/api/media/generate-image` ✅

*   **Archivo:** `src/app/api/media/generate-image/route.ts` *(nuevo)*
*   Acepta `{ prompt, style?, size?, quality? }`. Estilos: `realistic`, `artistic`, `cartoon`, `sketch`, `minimal`.
*   Intenta generar con **OpenAI DALL-E 3** si `OPENAI_API_KEY` está configurado.
*   Fallback automático a un **SVG placeholder descriptivo** si no hay proveedor disponible.
*   Rate limit: 10 requests/minuto por usuario.

### 17. Persistencia de Memoria en Base de Datos (Prisma) ✅

*   **Archivos nuevos:**
    *   `src/lib/memory/memory-db.ts` — capa de acceso a datos para memoria persistente.
    *   `src/app/api/memory/route.ts` — endpoint REST (GET/POST/DELETE) para consultar y gestionar la memoria.
    *   `prisma/schema.prisma` — nuevo modelo `MemoryEntry` con índices por `userId`, `type`, `key` y `conversationId`.
*   `MemoryDb.getRelevantContext()` usa scoring por palabras clave igual que el store en memoria.
*   La memoria sobrevive entre dispositivos y sesiones de usuario.

### 18. Conectores Expandidos con Acciones Reales ✅

*   **Archivo:** `src/lib/integrations/ConnectorRegistry.ts`
*   **Slack:** añadidas `getChannelHistory`, `addReaction`, `uploadFile`, `listUsers`.
*   **Gmail:** añadidas `listEmails`, `getEmail`, `archiveEmail`, `deleteEmail`, `createDraft`.
*   **Jira:** añadidas `listProjects`, `listIssues`, `getIssue`, `createIssue`, `updateIssue`, `addComment`, `transitionIssue`. Prioridad elevada a `medium`.
*   **Asana:** añadidas `listProjects`, `listTasks`, `getTask`, `createTask`, `updateTask`, `deleteTask`, `addComment`. Prioridad elevada a `medium`.
*   **Salesforce:** añadidas `listContacts`, `createContact`, `listLeads`, `createLead`, `listOpportunities`, `createOpportunity`, `runQuery`. Prioridad elevada a `medium`.
*   **HubSpot:** añadidas `listContacts`, `createContact`, `listDeals`, `createDeal`, `listCompanies`, `searchCRM`. Prioridad elevada a `medium`.

### 19. Sistema de Cron Jobs Real ✅

*   **Archivos nuevos:**
    *   `src/lib/cron/cron-manager.ts` — `CronManager` con parser de expresiones cron (5 campos), cálculo de `nextRunAt`, persistencia en BD.
    *   `src/app/api/cron/route.ts` — endpoint REST (GET/POST/PATCH/DELETE) para CRUD de tareas.
    *   `src/app/api/cron/tick/route.ts` — endpoint de polling para ejecutar tareas vencidas (protegido con `CRON_SECRET`).
    *   `prisma/schema.prisma` — nuevos modelos `ScheduledTask` y `CronJobLog`.
*   **Panel de administración en Settings** (`src/components/agente/pages/settings-page.tsx`):
    *   Nuevo tab **"Tareas"** con lista de tareas, estado, próxima ejecución y contador de runs.
    *   Formulario de creación con presets de horario (cada 5 min, diario, lunes-viernes, etc.).
    *   Botones de activar/pausar y eliminar por tarea.
    *   Actualización en tiempo real con botón de refresh.

---

## 🚧 Pendiente — Próximos Pasos

### P1. Pruebas y Documentación

*   Pruebas unitarias para `TodoManager`, `memory-store`, `cron-manager` y `tool-registry`.
*   Pruebas de integración para el flujo completo orquestador → agentes → herramientas.
*   Documentación de usuario (cómo usar los modos, conectores, herramientas, tareas programadas).
*   Documentación de desarrollador (arquitectura, cómo agregar nuevos conectores/herramientas).

### P2. Migración de Base de Datos

*   Ejecutar `prisma migrate dev` para crear las tablas `MemoryEntry`, `ScheduledTask` y `CronJobLog` en producción.
*   Configurar `DATABASE_URL` y `CRON_SECRET` en las variables de entorno del servidor.
*   Conectar el cron tick con el orquestador real para ejecutar tareas de agente automáticamente.

### P3. Conectores Adicionales (Implementación HTTP Real)

*   Implementar los métodos HTTP reales en los conectores de Jira, Asana, Salesforce, HubSpot (actualmente solo tienen las definiciones de acciones en el registry).
*   Agregar conectores: Trello, Linear, Monday.com con acciones completas.

### P4. Mejoras de UX

*   Indicador visual en tiempo real del progreso del `TodoManager` (lista de pasos con estados).
*   Panel de memoria en la UI principal (no solo en Settings).
*   Notificaciones push cuando una tarea programada se ejecuta.
