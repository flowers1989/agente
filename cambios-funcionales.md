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

## ✅ Cambios Implementados (Fase 3 — Sesión actual)

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

## 🚧 Pendiente — Próximos Pasos

### P1. Botón de Modo Economy / Quality en la UI *(alta prioridad)*

*   **Objetivo:** Un solo botón visible en el `ChatInput` o en el header de la conversación que permita al usuario cambiar entre modo **Rápido** (economy) y modo **Calidad** (quality) con un solo clic, sin terminología técnica.
*   **Archivos a modificar:**
    *   `src/lib/store-app.ts` — añadir campo `agentMode: "economy" | "quality"` al estado persistido y la acción `toggleAgentMode()`.
    *   `src/lib/agents/stream-client.ts` — añadir campo `mode` al `StreamAgentParams` y pasarlo en el body del fetch.
    *   `src/hooks/use-execution.ts` — leer `agentMode` del store y pasarlo a `streamAgentExecution`.
    *   `src/components/agente/chat-panel.tsx` — añadir el botón de toggle en el `ChatInput`, con etiquetas amigables ("Rápido ⚡" / "Calidad ✨") y tooltip explicativo.
*   **UX esperada:** El botón debe ser discreto (pequeño, en la barra del input), con un indicador visual claro del modo activo. Al hacer clic cambia instantáneamente y persiste entre sesiones.

### P2. Bucle de Atención con `todo.md` Dinámico

*   Desarrollar la lógica para que el agente mantenga un `todo.md` interno, planifique pasos, reflexione sobre resultados y ajuste su estrategia en tiempo real.

### P3. Memoria Episódica Persistente

*   Integrar base de datos para almacenar memoria a largo plazo entre sesiones (resultados de herramientas, aprendizajes, contexto de conversaciones anteriores).

### P4. Funcionalidades Completas de Conectores

*   Implementar acciones de escritura (crear, actualizar, eliminar) para Google Drive, Gmail, Slack, GitHub, Notion.
*   Agregar conectores adicionales: Trello, Asana, Jira, Salesforce.

### P5. Herramientas Avanzadas

*   Generación de diapositivas (PPT/PDF).
*   Análisis de video/audio.
*   Generación de imágenes con IA.
*   Programación de tareas recurrentes (cron).

### P6. Pruebas y Documentación

*   Pruebas unitarias, de integración y e2e para sandbox y conectores.
*   Documentación de usuario y de desarrollador.
