# Prueba de Fuego · OpenCode Go

Guía para probar el agente con tu API key real de OpenCode Go.

## 1. Obtener API key

1. Ve a [https://opencode.ai](https://opencode.ai)
2. Inicia sesión en tu cuenta
3. Ve a la sección de API keys y genera una nueva
4. Copia la key (normalmente empieza con `sk-...`)

## 2. Configurar el entorno

Asegúrate de tener el `.env` configurado:

```env
DATABASE_URL=file:./db/custom.db
ENCRYPTION_KEY=tu_clave_de_32_bytes_hex_aqui_64_caracteres
```

> Si no tienes `ENCRYPTION_KEY`, genera una:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

## 3. Iniciar la app

```bash
npm run dev
```

La app estará en `http://localhost:3000`.

## 4. Insertar la API key

1. Abre `http://localhost:3000`
2. Regístrate / inicia sesión con cualquier email (modo demo)
3. Ve a **Configuración → API**
4. Pega tu API key de OpenCode Go
5. Haz clic en **Probar**
6. Si la conexión es exitosa, haz clic en **Guardar**

## 5. Probar conversación simple

1. Ve al chat principal
2. Escribe algo simple como:
   - "Hola, ¿cómo estás?"
   - "Explícame qué es TypeScript"
3. El agente debería responder directamente usando OpenCode Go

## 6. Probar tarea compleja

Escribe una tarea que active el orquestador de 7 agentes:

- "Genera una función en TypeScript para ordenar arrays"
- "Investiga los competidores de Notion y genera un reporte"
- "Navega a example.com y extrae el texto"

El agente mostrará "Trabajando..." y ejecutará los pasos en el workspace.

## 7. Verificar que la API key no viaja al cliente

1. Abre las DevTools del navegador (F12)
2. Ve a la pestaña Network
3. Envía un mensaje
4. Busca la petición a `/api/chat/completions`
5. Verifica que:
   - La API key va en el header `X-API-Key`
   - La respuesta viene del backend, no directamente de `opencode.ai`

## 8. Solución de problemas

### "No hay API key configurada"

- Asegúrate de haber guardado la key en Configuración → API
- Recarga la página

### "API key inválida o no proporcionada"

- Verifica que la key tenga al menos 10 caracteres
- Comprueba que no haya espacios al inicio o final

### Error de red / CORS

- El backend proxy maneja las llamadas, pero si hay problemas de red, el adaptador hará fallback a simulación
- Verifica que tu máquina tenga acceso a internet
- Revisa los logs del servidor

### Error 429 (rate limit)

- El proxy tiene rate limiting de 30 requests/minuto
- Espera un minuto y vuelve a intentar

## 9. Tests automáticos

Antes de la prueba de fuego, ejecuta:

```bash
npm test
npm run build
```

Ambos deben pasar.

## 10. Límites y buenas prácticas

- No compartas tu API key
- No expongas la app a internet sin autenticación real
- Revisa los costos de OpenCode Go antes de ejecutar tareas largas
- El modo demo usa usuario `user`; no uses este modo en producción
