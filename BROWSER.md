# Browser Control

Documentación de la **Fase 3**: control de navegador con Playwright.

## Características

- Sesiones de navegador individuales por usuario
- Navegación real con Playwright (Chromium)
- Acciones soportadas:
  - `navigate(url)`
  - `click(x, y)`
  - `clickBySelector(selector)`
  - `type(selector, text)`
  - `scroll(direction, amount)`
  - `screenshot()`
  - `extractText()`
  - `executeScript(script)`
  - `getDOMRepresentation()`
- Streaming de screenshots vía Server-Sent Events
- Detección de elementos DOM con coordenadas
- Límite de tiempo por sesión (10 minutos por defecto)
- Botón de detener control siempre visible

## API

### Crear sesión

```bash
curl -X POST http://localhost:3000/api/browser/sessions
```

### Navegar

```bash
curl -X POST http://localhost:3000/api/browser/sessions/ID/actions \
  -H "Content-Type: application/json" \
  -d '{"action":"navigate","params":{"url":"http://localhost:3000"}}'
```

### Screenshot

```bash
curl http://localhost:3000/api/browser/sessions/ID/screenshot -o screenshot.jpg
```

### Streaming

```bash
curl http://localhost:3000/api/browser/sessions/ID/stream
```

### Cerrar sesión

```bash
curl -X DELETE http://localhost:3000/api/browser/sessions/ID
```

## UI

La pestaña **Browser** en el workspace permite:
- Iniciar/detener sesiones
- Navegar a URLs
- Hacer click en el screenshot
- Escribir en selectores
- Hacer scroll
- Extraer texto
- Ejecutar scripts
- Ver overlay de elementos DOM
- Ver log de acciones

## Uso responsable

- Respetar los Términos de Servicio de cada sitio web.
- No usar para evadir CAPTCHAs, autenticación o medidas anti-bot sin permiso.
- No extraer datos personales de terceros.
- Considerar implicaciones legales (CFAA, GDPR, leyes locales).

## Configuración

El navegador se ejecuta en modo headless por defecto. Para cambiar a modo visible, modifica el parámetro `headless` en `BrowserSession.start()`.

## Límites

- Una sesión por usuario a la vez (si se crea una nueva, la anterior queda activa hasta expirar).
- Timeout de 10 minutos de inactividad.
- Rate limiting en endpoints de browser.
- No se soportan múltiples páginas por sesión.
