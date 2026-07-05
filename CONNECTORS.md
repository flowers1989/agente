# Guía de Conectores

Este documento describe cómo configurar y usar el sistema de conectores implementado en la **Fase 2**.

## Tabla de conectores

| Conector | Tipo | Prioridad | Acciones principales |
|---|---|---|---|
| Slack | OAuth2 | Alta | `sendMessage`, `listChannels` |
| Gmail | OAuth2 | Alta | `sendEmail`, `listLabels` |
| GitHub | OAuth2 / Token | Alta | `createIssue`, `listRepos` |
| Notion | OAuth2 / Token | Alta | `listPages`, `createPage` |
| Google Sheets | OAuth2 | Alta | `listSpreadsheets`, `readRange`, `writeRange` |
| Discord | OAuth2 / Bot | Media | `sendMessage` |
| Telegram | Bot API | Media | `sendMessage` |
| Shopify, Stripe, PayPal, WooCommerce, Square | Varios | Baja | Esqueletos funcionales |
| Salesforce, HubSpot, Mailchimp, Klaviyo, Pipedrive | OAuth2 | Baja | Esqueletos funcionales |
| GitLab, Jira, Linear, Vercel | OAuth2 | Baja | Esqueletos funcionales |
| Asana, Monday.com, Canva | OAuth2 | Baja | Esqueletos funcionales |

## Configuración general

### 1. Credenciales de usuario (API key / token)

Para conectores que usan API key (Telegram, Stripe, Shopify, etc.):

```bash
curl -X POST http://localhost:3000/api/connectors \
  -H "Content-Type: application/json" \
  -d '{"source":"telegram","apiKey":"TU_BOT_TOKEN","name":"Mi Bot"}'
```

O usa la pestaña **Integraciones** en Configuración.

### 2. Credenciales OAuth a nivel de aplicación

Para conectores OAuth (Slack, Gmail, GitHub, Notion, etc.) primero debes registrar una app en el proveedor y luego guardar las credenciales de app:

```bash
curl -X PUT http://localhost:3000/api/connectors \
  -H "Content-Type: application/json" \
  -d '{
    "source":"slack",
    "clientId":"TU_CLIENT_ID",
    "clientSecret":"TU_CLIENT_SECRET",
    "redirectUri":"http://localhost:3000/api/connectors/oauth/callback?source=slack",
    "scopes":["chat:write","channels:read","users:read"]
  }'
```

Luego inicia el flujo OAuth:

```bash
curl http://localhost:3000/api/connectors/slack/oauth/url
```

Abre la URL devuelta en un navegador. Después de autorizar, el callback guardará el token de acceso automáticamente.

## Configuración por proveedor

### Slack

1. Ve a [api.slack.com/apps](https://api.slack.com/apps) y crea una app.
2. En **OAuth & Permissions**, añade el redirect URI:
   - `http://localhost:3000/api/connectors/oauth/callback?source=slack`
3. Scopes recomendados: `chat:write`, `channels:read`, `users:read`.
4. Copia **Client ID** y **Client Secret**.

### Gmail / Google Sheets

1. Ve a [Google Cloud Console](https://console.cloud.google.com/).
2. Crea un proyecto y habilita las APIs:
   - Gmail API
   - Google Sheets API
   - Google Drive API (para listar hojas)
3. En **Credentials > OAuth 2.0 Client IDs**, crea un cliente Web.
4. Añade el redirect URI:
   - `http://localhost:3000/api/connectors/oauth/callback?source=gmail`
   - `http://localhost:3000/api/connectors/oauth/callback?source=google-sheets`
5. Scopes recomendados:
   - Gmail: `https://www.googleapis.com/auth/gmail.send`, `https://www.googleapis.com/auth/gmail.readonly`
   - Google Sheets: `https://www.googleapis.com/auth/spreadsheets`, `https://www.googleapis.com/auth/drive.readonly`

> Nota: Google requiere verificación de app para producción si usas scopes sensibles.

### GitHub

1. Ve a **Settings > Developer settings > OAuth Apps**.
2. Crea una nueva OAuth App.
3. Authorization callback URL:
   - `http://localhost:3000/api/connectors/oauth/callback?source=github`
4. Scopes recomendados: `repo`, `read:user`, `user:email`.
5. También puedes usar un **Personal Access Token** vía API key.

### Notion

1. Ve a [www.notion.so/my-integrations](https://www.notion.so/my-integrations).
2. Crea una nueva integración.
3. Copia el **Internal Integration Token** para usarlo como API key, o configura OAuth pública.
4. Redirect URI:
   - `http://localhost:3000/api/connectors/oauth/callback?source=notion`

### Discord

1. Ve a [Discord Developer Portal](https://discord.com/developers/applications).
2. Crea una aplicación y ve a **OAuth2 > General**.
3. Redirect URI:
   - `http://localhost:3000/api/connectors/oauth/callback?source=discord`
4. Scopes recomendados: `bot`, `identify`.

### Telegram

1. Habla con [@BotFather](https://t.me/BotFather).
2. Crea un bot y copia el token.
3. Úsalo como `apiKey` en `/api/connectors`.

## Ejecutar acciones

```bash
curl -X POST http://localhost:3000/api/connectors/slack/actions \
  -H "Content-Type: application/json" \
  -d '{"action":"sendMessage","params":{"channel":"#general","text":"Hola desde el agente"}}'
```

## Webhooks

Los webhooks se reciben en:

```
POST /api/webhooks/{source}
```

Por ejemplo, para GitHub configura en tu repositorio:

```
http://localhost:3000/api/webhooks/github
```

El sistema almacena cada evento en `ConnectorWebhookEvent` y verifica la firma cuando está disponible.

## Seguridad

- Los tokens se encriptan con AES-256-GCM antes de guardarse.
- Los endpoints tienen rate limiting.
- La revocación de tokens se intenta ante el proveedor al desconectar.
- Los secrets nunca se exponen en respuestas API.

## Tests

```bash
npm test
```

Los tests actuales cubren:
- Encriptación/desencriptación de credenciales
- Ejecución de acciones con mocks
- Rate limiting
- Recepción de webhooks
