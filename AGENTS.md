# AGENTS.md · Contexto para agentes de código

## Propósito del proyecto

Construir un agente IA autónomo que pueda:

1. Responder conversaciones simples directamente con un LLM.
2. Ejecutar tareas complejas coordinando 7 agentes especializados.
3. Interactuar con aplicaciones externas mediante conectores OAuth2/API key.
4. Controlar un navegador con Playwright para tareas web.
5. Compilar/generar proyectos para múltiples plataformas.

## Convenciones de código

- **Next.js 16** con App Router y Route Handlers (`src/app/api/**/route.ts`).
- **TypeScript** estricto.
- **Zod** para validación de inputs de API.
- **Prisma** con SQLite para persistencia.
- **Vitest** para tests unitarios.
- Todos los endpoints sensibles deben usar `withRateLimit` y validar con Zod.
- Nunca exponer secrets (tokens, API keys) en respuestas al cliente.

## Arquitectura clave

### Autenticación

- Actualmente existe un helper en `src/lib/api/auth.ts` que retorna un usuario demo (`user`).
- Todos los endpoints usan `getUserId()` y `getIdentifier()` de ese helper.
- Cuando se migre a next-auth, solo hay que cambiar `src/lib/api/auth.ts`.

### Seguridad de API

- `src/lib/api/rate-limit-helper.ts`: rate limiting en memoria.
- `src/lib/api/validation.ts`: schemas Zod reutilizables.
- `src/middleware.ts`: CSP y headers de seguridad.

### LLM / OpenCode Go

- `src/lib/agents/opencode-adapter.ts` ya no llama directamente a OpenCode Go.
- Ahora usa el proxy backend `POST /api/chat/completions`.
- El frontend envía la API key en el header `X-API-Key`.
- El backend reenvía la petición a `https://opencode.ai/zen/go/v1/chat/completions`.

### Browser Control

- `src/lib/browser/BrowserControlConnector.ts` orquesta sesiones de Playwright.
- Cada sesión pertenece a un `userId`.
- Los endpoints de browser verifican ownership con `belongsToUser(sessionId, userId)`.

### Conectores

- `src/lib/integrations/ConnectorManager.ts` registra y ejecuta conectores.
- `CredentialManager` encripta tokens con `ENCRYPTION_KEY`.
- `ConnectorAuditLog` guarda logs de auditoría.

### Compilación

- `src/lib/compilation/BuildManager.ts` crea builds en `uploads/builds/`.
- Linux se compila realmente con Python; el resto genera estructura simulada.

## Reglas para modificar código

1. **Tests**: si cambias lógica de negocio, añade o actualiza tests.
2. **Validación**: todo endpoint que reciba JSON debe validar con Zod.
3. **Rate limiting**: todo endpoint que escriba o ejecute acciones debe tener rate limiting.
4. **Secrets**: nunca devuelvas `accessToken`, `refreshToken`, `apiKey`, `clientSecret` en JSON.
5. **Paths**: usa `path.resolve()` y `startsWith()` para evitar path traversal.
6. **Errores**: no expongas stack traces o mensajes internos en producción.

## Scripts útiles

```bash
npm run dev        # Desarrollo
npm test           # Tests
npm run build      # Build de producción
npm run lint       # ESLint
npx prisma db push # Sincronizar schema con DB
```

## Contacto / Issues

Este es un proyecto en desarrollo activo. Para la prueba de fuego con OpenCode Go ver `FUEGO.md`.
