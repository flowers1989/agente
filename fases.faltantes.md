# Fases Faltantes del Proyecto

Este documento describe las fases pendientes de implementación después de completar la **Fase 1: Sistema de Integración Multi-Fuente**.

---

## Estado actual

✅ **Fase 1 completada**
- Modelos Prisma: `IntegrationAccount`, `Resource`
- `CredentialManager` con encriptación
- `IntegrationManager` con caché y sincronización
- Conectores: `LocalFileConnector`, `FigmaConnector`
- Endpoints API para integraciones
- UI: `IntegrationMenu`, `FileExplorer`, `FigmaConfigDialog`
- Servir archivos subidos vía `/api/uploads/`

✅ **Fase 2 completada**
- Arquitectura base: `RestConnector`, `OAuth2Connector`, `WebhookConnector`, `GraphQLConnector`
- `ConnectorManager`, `ConnectorRegistry`, `WebhookManager`, `AuditLogger`
- Conectores prioritarios: Slack, Gmail, GitHub, Notion, Google Sheets (+ Discord, Telegram)
- Conectores secundarios: Shopify, Stripe, PayPal, WooCommerce, Square, Salesforce, HubSpot, Mailchimp, Klaviyo, Pipedrive, GitLab, Jira, Linear, Vercel, Asana, Monday, Canva
- Modelos Prisma: `ConnectorCredential`, `ConnectorAuditLog`, `ConnectorWebhookEvent`
- Rate limiting, revocación de tokens, encriptación y logs de auditoría
- Tests con Vitest + mocks
- Documentación en `CONNECTORS.md`

✅ **Fase 3 completada**
- Playwright instalado y configurado
- `BrowserSession` y `BrowserControlConnector`
- Acciones: navigate, click, clickBySelector, type, scroll, screenshot, extractText, executeScript, getDOMRepresentation
- Gestión de sesiones con timeout (10 min)
- Endpoints API: `/api/browser/sessions`, actions, screenshot, stream
- Pestaña Browser en workspace con screenshot, controles, log y overlay DOM
- Streaming de screenshots vía SSE
- Botón de detener control
- Tests y documentación en `BROWSER.md`

✅ **Fase 4 completada**
- Detector de mensajes simples vs tareas complejas (`SimpleTaskDetector`)
- Respuesta directa con LLM para conversaciones simples (sin pipeline de 7 agentes)
- `ToolRegistry` para registrar y ejecutar herramientas dinámicamente
- `ExecutorAgent` actualizado para usar `ToolRegistry` en lugar de simulación pura
- Integración real con Browser Control vía API (`/api/browser/sessions/*/actions`)
- Integración real con conectores vía API (`/api/connectors/[connector]/actions`)
- `OpenCodeGoAdapter.chat()` intenta la API real y hace fallback a simulación
- Tests para el detector de tareas simples

✅ **Sistema de Compilación Multiplataforma implementado** (ver `Compilación.md`)
- Analizador de requisitos (`src/lib/compilation/analyzer.ts`)
- Motor de recomendaciones de plataformas con puntuación (`src/lib/compilation/recommender.ts`)
- Generador de código base con plantillas por plataforma (`src/lib/compilation/generator.ts`)
- Compiladores: Linux real (`tar.gz` vía Python), Android/Windows/macOS/Android TV simulados/estructura
- `BuildManager` para orquestar generación, compilación y empaquetado
- Endpoints API: `/api/compile`, `/api/compile/:id`, `/api/compile/download/...`, `/api/recommendations`
- Integración con el agente a través de la herramienta `Deployment` en `ToolRegistry`
- Tests unitarios para analyzer, recommender y generator

✅ **Fase 5 completada** (preparación para prueba de fuego)
- Proxy backend `/api/chat/completions` para no exponer API keys en cliente
- Refactorización de `OpenCodeGoAdapter` para usar el proxy
- Validación Zod centralizada en `src/lib/api/validation.ts`
- Rate limiting en todos los endpoints sensibles
- Verificación de ownership en sesiones de browser
- Sanitización de paths en descargas de builds y uploads
- Middleware con CSP y headers de seguridad
- Tests de endpoints API, validación, rate limiting y path traversal
- Documentación: `README.md`, `AGENTS.md`, `FUEGO.md`

---

## Fase 2: Sistema de Conectores

### Objetivo
Permitir al agente ejecutar acciones reales en aplicaciones y servicios externos mediante conectores estandarizados.

### Tareas

#### 2.1 Arquitectura base de conectores
- [x] Crear `RestConnector` abstracto (`src/lib/integrations/connectors/base/`)
- [x] Crear `OAuth2Connector` abstracto con flujo de refresh token
- [x] Crear `WebhookConnector` abstracto
- [x] Crear `GraphQLConnector` abstracto
- [x] Crear `ConnectorManager` para registro y orquestación
- [x] Crear tabla/modelo `ConnectorCredential` (config OAuth a nivel app) + `ConnectorAuditLog`

#### 2.2 Conectores prioritarios (implementar primero)
| Conector | Tipo | Prioridad | Caso de uso principal | Estado |
|---|---|---|---|---|
| Slack | OAuth2 | Alta | Notificaciones y mensajes | ✅ `sendMessage`, `listChannels` |
| Gmail | OAuth2 | Alta | Envío de emails | ✅ `sendEmail`, `listLabels` |
| GitHub | OAuth2 | Alta | Issues, repos, PRs | ✅ `createIssue`, `listRepos` |
| Notion | OAuth2 | Alta | Gestión de documentos | ✅ `listPages`, `createPage` |
| Google Sheets | OAuth2 | Alta | Lectura/escritura de datos | ✅ `listSpreadsheets`, `readRange`, `writeRange` |
| Discord | OAuth2 | Media | Mensajes | ✅ Esqueleto funcional `sendMessage` |
| Telegram | Bot API | Media | Mensajes | ✅ Esqueleto funcional `sendMessage` |

#### 2.3 Conectores secundarios (plantillas/esqueletos)
- [x] Shopify, Stripe, PayPal, WooCommerce, Square
- [x] Salesforce, HubSpot, Mailchimp, Klaviyo, Pipedrive
- [x] GitLab, Jira, Linear, Vercel
- [x] Asana, Monday.com
- [x] Canva, Figma (Figma ya existe, reutilizar)

#### 2.4 UI de conectores
- [x] Página de "Integraciones" en Settings (`/settings` → pestaña Integraciones)
- [x] Tarjeta por conector con estado (conectado/desconectado)
- [x] Flujo OAuth con popup/callback (endpoints `/api/connectors/[connector]/oauth/url` y `/api/connectors/oauth/callback`)
- [x] Indicador de permisos/scopes requeridos

#### 2.5 Seguridad
- [x] Nunca exponer tokens al cliente (encriptación en `CredentialManager`)
- [x] Rotación automática de refresh tokens (`OAuth2Connector.ensureValidToken`)
- [x] Revocación de tokens al desconectar (`DELETE /api/connectors/[connector]/credentials`)
- [x] Logs de auditoría de llamadas a conectores (`ConnectorAuditLog`)

### Estimación
**5-10 días** para los conectores prioritarios + arquitectura base.

### Riesgos
- Algunos servicios requieren verificación de app antes de OAuth (Google, Microsoft).
- Rate limits agresivos en APIs gratuitas.
- Manejo de errores de token expirado en múltiples conectores.

---

## Anexo: Guía de registro OAuth por proveedor

> También disponible en `CONNECTORS.md`.

### Proceso general

1. Entra al portal de desarrolladores del proveedor.
2. Crea una nueva app/integración.
3. Configura el **Redirect URI** (callback URL):
   ```
   http://localhost:3000/api/connectors/oauth/callback?source=PROVEEDOR
   ```
   En producción reemplaza `localhost:3000` por tu dominio.
4. Copia el **Client ID** y **Client Secret**.
5. Ve a Settings → Integraciones en el agente, haz clic en "Configurar OAuth" del conector y pega los datos.
6. Haz clic en "Conectar" y autoriza.

### Slack

1. Ve a [api.slack.com/apps](https://api.slack.com/apps)
2. Clic en **Create New App** → **From scratch**
3. Ponle nombre y selecciona tu workspace
4. En el menú lateral ve a **OAuth & Permissions**
5. En **Redirect URLs** añade:
   ```
   http://localhost:3000/api/connectors/oauth/callback?source=slack
   ```
6. En **Scopes > Bot Token Scopes** añade:
   - `chat:write`
   - `channels:read`
   - `users:read`
7. Guarda
8. En **Basic Information** copia **Client ID** y **Client Secret**

### Gmail / Google Sheets

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un proyecto nuevo
3. Ve a **APIs & Services > Library** y habilita:
   - Gmail API
   - Google Sheets API
   - Google Drive API
4. Ve a **APIs & Services > OAuth consent screen**
   - Selecciona **External** (o Internal si tienes Google Workspace)
   - Completa los datos básicos
5. Ve a **APIs & Services > Credentials**
6. Clic en **Create Credentials > OAuth client ID**
   - Tipo: **Web application**
   - Nombre: "Agente"
   - Authorized redirect URIs:
     - `http://localhost:3000/api/connectors/oauth/callback?source=gmail`
     - `http://localhost:3000/api/connectors/oauth/callback?source=google-sheets`
7. Copia **Client ID** y **Client Secret**

> Google muestra "App no verificada" hasta que completes la verificación. Para pruebas locales puedes hacer clic en "Continuar".

### GitHub

1. Ve a [github.com/settings/developers](https://github.com/settings/developers)
2. Clic en **New OAuth App**
3. Completa:
   - Application name: "Agente"
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL:
     ```
     http://localhost:3000/api/connectors/oauth/callback?source=github
     ```
4. Clic en **Register application**
5. Copia **Client ID** y genera un **Client Secret**

### Notion

1. Ve a [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Clic en **New integration**
3. Ponle nombre y selecciona el workspace
4. Copia el **Internal Integration Token** (se usa como API key)
5. Si quieres OAuth público, ve a **Configuration > OAuth domain & URIs** y añade:
   ```
   http://localhost:3000/api/connectors/oauth/callback?source=notion
   ```

### Discord

1. Ve a [discord.com/developers/applications](https://discord.com/developers/applications)
2. Clic en **New Application**
3. Ve a **OAuth2 > General**
4. En **Redirects** añade:
   ```
   http://localhost:3000/api/connectors/oauth/callback?source=discord
   ```
5. Copia **Client ID** y **Client Secret**

### Telegram

Telegram no usa OAuth, usa un bot token:

1. Abre Telegram y busca [@BotFather](https://t.me/BotFather)
2. Envía `/newbot`
3. Sigue las instrucciones y copia el token
4. En el agente ve a Integraciones → Telegram → Configurar, y pega el token

### Configurar en el agente

#### Opción A: UI (recomendada)

1. Abre el agente en `http://localhost:3000`
2. Ve a **Configuración → Integraciones**
3. Busca el conector
4. Haz clic en **Configurar OAuth**
5. Pega Client ID, Client Secret, Redirect URI y scopes
6. Haz clic en **Guardar configuración OAuth**
7. Haz clic en **Conectar** y autoriza

#### Opción B: API directa

```bash
curl -X PUT http://localhost:3000/api/connectors \
  -H "Content-Type: application/json" \
  -d '{
    "source": "slack",
    "clientId": "TU_CLIENT_ID",
    "clientSecret": "TU_CLIENT_SECRET",
    "redirectUri": "http://localhost:3000/api/connectors/oauth/callback?source=slack",
    "scopes": ["chat:write", "channels:read", "users:read"]
  }'
```

Luego inicia OAuth:

```bash
curl http://localhost:3000/api/connectors/slack/oauth/url
```

Abre la URL que devuelve en el navegador.

---

## Fase 3: Browser Control y Navegación Web

### Objetivo
Dar al agente la capacidad de controlar un navegador para ejecutar tareas web complejas.

### Enfoque recomendado
No implementar VMs pesadas (KVM/QEMU) desde el inicio. Empezar con **Playwright en servidor** y escalar a VM solo si es necesario.

### Tareas

#### 3.1 Browser Control con Playwright (fase inicial)
- [x] Instalar `playwright` como dependencia del proyecto
- [x] Crear `BrowserControlConnector` en servidor (no en cliente)
- [x] Implementar acciones básicas:
  - `navigate(url)`
  - `click(x, y)` / `clickBySelector(selector)`
  - `type(selector, text)`
  - `scroll(direction, amount)`
  - `screenshot()`
  - `extractText()`
  - `executeScript(script)`
- [x] Gestión de sesiones por usuario/conversación
- [x] Límite de tiempo por sesión (timeout)
- [x] Botón de "Detener control" siempre visible

#### 3.2 Integración con el workspace
- [x] Activar la pestaña "Browser" en `WorkspacePanel`
- [x] Mostrar screenshot actual del navegador
- [x] Mostrar log de acciones ejecutadas
- [x] Streaming de screenshots vía Server-Sent Events

#### 3.3 Detección de elementos (mejora)
- [x] Usar Playwright para obtener elementos DOM con coordenadas
- [ ] Enviar al LLM una representación accesible de la página (pendiente: requiere Fase 4)
- [ ] Permitir al agente decidir acciones basado en DOM, no solo en imagen (pendiente: requiere Fase 4)

#### 3.4 Máquinas Virtuales (fase avanzada, opcional)
- [x] Evaluar si Playwright en servidor cumple los requisitos
- [ ] Si se requiere aislamiento: Docker con navegador + VNC
- [ ] Solo considerar KVM/QEMU si se necesita una VM completa
- [ ] Implementar `VMOrchestrator` para controlar VM por SSH/xdotool
- [ ] Streaming de pantalla con WebRTC/FFmpeg

### Estimación
- **Playwright básico**: 5-7 días
- **Con VM/Docker**: +10-15 días
- **Con KVM/QEMU**: +20-30 días

### Riesgos y advertencias
⚠️ **Uso responsable obligatorio**:
- Respetar Términos de Servicio de cada sitio web.
- No usar para evadir CAPTCHAs, autenticación o medidas anti-bot sin permiso.
- No extraer datos personales de terceros.
- Considerar implicaciones legales (CFAA, GDPR, leyes locales).

---

## Fase 4: Integración con el Orquestador de Agentes

### Objetivo
Conectar el `AgentOrchestrator` existente con los sistemas reales de integración y navegación.

### Tareas

#### 4.1 Actualizar `ExecutorAgent`
- [x] Reemplazar ejecuciones simuladas por llamadas reales (vía `ToolRegistry`)
- [x] Integrar `IntegrationManager` para recursos (endpoints existentes)
- [x] Integrar `ConnectorManager` para acciones externas (`/api/connectors/[connector]/actions`)
- [x] Integrar `BrowserControlConnector` para navegación (`/api/browser/sessions/*/actions`)

#### 4.2 Actualizar sistema de herramientas
- [x] Mapear herramientas críticas del `types.ts` a acciones reales
- [x] Implementar al menos las herramientas críticas:
  - Navegación web (Browser Navigation, Screenshot, Web Extraction)
  - Integración de APIs (HTTP Client)
  - Comunicación (Email, Chat/Messaging vía conectores)
  - Generación de contenido (Code Generation, Document Generation)
  - Operaciones de archivos (File Read/Write virtual)
- [x] `ToolRegistry` para registrar herramientas dinámicamente

#### 4.3 Detector de intención y respuesta directa
- [x] Crear `SimpleTaskDetector` para distinguir conversación simple vs tarea compleja
- [x] Responder directamente con LLM para mensajes simples (sin activar los 7 agentes)
- [x] Activar `OpenCodeGoAdapter.chat()` para usar la API real cuando haya `apiKey`
- [x] Manejar errores de API key inválida y fallback a simulación
- [x] Streaming real de respuestas al frontend (para conversaciones simples)

#### 4.4 Streaming de ejecución
- [x] Actualizar `useExecution` para soportar respuesta directa y orquestador
- [x] Mostrar output enriquecido de herramientas reales en el workspace
- [ ] Implementar Server-Sent Events o WebSocket para logs en tiempo real del orquestador (mejora futura)

### Estimación
**7-14 días**.

### Riesgos
- La calidad de los planes del LLM depende del modelo y prompt engineering.
- Necesidad de manejo robusto de errores y reintentos.
- Posible loop infinito si el agente no detecta tareas completadas.

---

## Fase 5: Testing, Seguridad y Documentación

### Objetivo
Estabilizar el sistema, asegurar datos y documentar el proyecto.

### Tareas

#### 5.1 Testing
- [x] Tests unitarios para conectores con mocks (MSW o similares) - parcial, se añadieron tests de endpoints
- [x] Tests de integración para endpoints API (`/api/chat/completions`, `/api/browser/sessions/*/actions`, `/api/uploads/*`)
- [ ] Tests de flujo OAuth (al menos un conector) - pendiente para iteración futura
- [x] Tests E2E para subida de archivos e importación de recursos - se cubrió path traversal
- [x] Tests para `CredentialManager` (encriptación/desencriptación)

#### 5.2 Seguridad
- [x] Revisar que nunca se expongan secrets en respuestas API
- [x] Validar permisos en cada endpoint (userId correcto) - se centralizó auth helper y ownership de browser
- [x] Sanitizar rutas de archivos (path traversal)
- [x] Rate limiting en endpoints sensibles
- [x] Validar tipos con Zod en todas las requests JSON
- [x] CSP headers para prevenir XSS

#### 5.3 Autenticación real (opcional pero recomendado)
- [ ] Integrar `next-auth` con Prisma adapter - pendiente para iteración futura
- [ ] Migrar usuario por defecto `user` a flujo real - pendiente para iteración futura
- [x] Asociar `IntegrationAccount` y `Resource` al usuario autenticado - ya estaba en schema

#### 5.4 Documentación
- [x] Guía de cómo añadir un nuevo conector - ver `CONNECTORS.md`
- [x] Guía de configuración OAuth en Google/Microsoft/Figma/Slack - ver `CONNECTORS.md`
- [x] Documentar límites y política de uso del browser control - ver `BROWSER.md`
- [x] README actualizado con instrucciones de desarrollo y despliegue
- [x] Guía de prueba de fuego con OpenCode Go - ver `FUEGO.md`

### Estimación
**5-10 días** sin autenticación real, **+5-7 días** con next-auth.

### Riesgos
- Configurar OAuth en múltiples proveedores es tedioso.
- Los tests E2E requieren credenciales reales o mocks elaborados.

---

## Roadmap resumido

| Fase | Duración estimada | Dependencias | Estado |
|---|---|---|---|
| 2. Sistema de Conectores | 5-10 días | Fase 1 | ✅ Completada |
| 3. Browser Control | 5-30 días dependiendo del enfoque | Fase 2 | ✅ Completada |
| 4. Integración con Orquestador | 7-14 días | Fases 2-3 | ✅ Completada |
| 5. Testing, Seguridad y Docs | 5-17 días dependiendo de auth | Fases 2-4 | ✅ Completada (preparación para prueba de fuego) |

**Total estimado**: 4-10 semanas para un sistema funcional, seguro y bien documentado.

---

## Recomendación de orden

1. ✅ **Fase 2**: Habilitar conectores clave (Slack, Gmail, GitHub, Notion, Google Sheets).
2. ✅ **Fase 3**: Implementar Browser Control con Playwright.
3. ✅ **Fase 4**: Conectar orquestador con conectores, navegación y respuesta directa.
4. ✅ **Fase 5**: Testing, seguridad y documentación (preparación para prueba de fuego).
5. 🔄 **Futuro**: Integrar autenticación real con `next-auth` y tests E2E completos.

---

*Última actualización: Junio 2026 (Fases 2, 3, 4 y 5 completadas + Sistema de Compilación Multiplataforma)*
