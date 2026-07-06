import type { AgentConfig, AgentType, AIModel, Tool, ToolCategory, Conversation } from "./types";

// ==================== 13 MODELOS OPencode GO ====================
export const AI_MODELS: AIModel[] = [
  { id: "glm-5.2", name: "GLM-5.2", context: "1.0M", costInput: 1.4, costOutput: 4.4, specialty: "Razonamiento avanzado", badge: "premium" },
  { id: "glm-5.1", name: "GLM-5.1", context: "203K", costInput: 1.4, costOutput: 4.4, specialty: "Razonamiento avanzado" },
  { id: "kimi-k2.7-code", name: "Kimi K2.7 Code", context: "262K", costInput: 0.95, costOutput: 4.0, specialty: "Coding especializado", badge: "recommended" },
  { id: "kimi-k2.6", name: "Kimi K2.6", context: "262K", costInput: 0.95, costOutput: 4.0, specialty: "Coding general" },
  { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro", context: "1.0M", costInput: 1.74, costOutput: 3.48, specialty: "Razonamiento complejo" },
  { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash", context: "1.0M", costInput: 0.14, costOutput: 0.28, specialty: "Velocidad + costo bajo", badge: "fast" },
  { id: "mimo-v2.5", name: "MiMo-V2.5", context: "1.0M", costInput: 0.14, costOutput: 0.28, specialty: "Velocidad extrema", badge: "cheap" },
  { id: "mimo-v2.5-pro", name: "MiMo-V2.5-Pro", context: "1.0M", costInput: 1.74, costOutput: 3.48, specialty: "Calidad + velocidad" },
  { id: "minimax-m3", name: "MiniMax M3", context: "1.0M", costInput: 0.1, costOutput: 0.4, specialty: "Mejor relación costo/calidad", badge: "cheap" },
  { id: "minimax-m2.7", name: "MiniMax M2.7", context: "205K", costInput: 0.3, costOutput: 1.2, specialty: "Coding balanceado" },
  { id: "qwen3.7-max", name: "Qwen3.7 Max", context: "1.0M", costInput: 2.5, costOutput: 7.5, specialty: "Máxima calidad", badge: "premium" },
  { id: "qwen3.7-plus", name: "Qwen3.7 Plus", context: "1.0M", costInput: 0.4, costOutput: 1.6, specialty: "Calidad media-alta" },
  { id: "qwen3.6-plus", name: "Qwen3.6 Plus", context: "1.0M", costInput: 0.5, costOutput: 3.0, specialty: "Calidad media" },
];

// ==================== 7 AGENTES DEL SISTEMA ====================
// Cada agente tiene su modelo OpenCode Go ideal asignado (según AGENTES.DEL.SISTEMA.md)
// NOTA: modelId = modo economy (default), alternativeModelId = modo quality.
// El modelo activo en runtime lo resuelve getAgentModel() desde src/lib/config/model-routing.ts.
export const AGENTS: Record<AgentType, AgentConfig> = {
  analyzer: {
    type: "analyzer",
    name: "Analizador",
    description: "Analiza el objetivo del usuario y extrae información relevante",
    responsibilities: [
      "Extraer entidades del objetivo",
      "Identificar restricciones",
      "Detectar contexto",
      "Evaluar complejidad",
    ],
    modelId: "deepseek-v4-flash",       // economy
    alternativeModelId: "qwen3.7-plus",  // quality
    speed: 5,
    cost: 5,
    quality: 4,
    systemPrompt: `Eres un analizador experto. Tu trabajo es:
1. Analizar objetivos del usuario
2. Extraer entidades relevantes (personas, lugares, objetos, acciones)
3. Identificar restricciones (tiempo, recursos, acceso)
4. Detectar contexto
5. Evaluar complejidad (low, medium, high)

Siempre responde en JSON con la estructura:
{
  "entities": [{ "type": "person|place|object|action", "value": "..." }],
  "constraints": [{ "type": "time|resource|access|other", "description": "..." }],
  "context": "...",
  "complexity": "low|medium|high"
}`,
  },
  planner: {
    type: "planner",
    name: "Planificador",
    description: "Descompone el objetivo en un plan ejecutable con pasos claros",
    responsibilities: [
      "Generar pasos iniciales",
      "Identificar dependencias entre pasos",
      "Seleccionar herramientas apropiadas",
      "Estimar recursos (tiempo, costo)",
      "Optimizar el orden de ejecución",
    ],
    modelId: "deepseek-v4-flash",       // economy
    alternativeModelId: "qwen3.7-plus",  // quality
    speed: 4,
    cost: 4,
    quality: 5,
    systemPrompt: `Eres un planificador experto. Tu trabajo es:
1. Descomponer objetivos en pasos
2. Identificar dependencias entre pasos
3. Seleccionar herramientas apropiadas para cada paso
4. Estimar recursos (tiempo, costo)
5. Optimizar el orden de ejecución

Siempre responde en JSON con la estructura:
{
  "steps": [
    {
      "number": 1,
      "description": "...",
      "tool": "nombre_herramienta",
      "parameters": { ... },
      "dependencies": [],
      "estimatedTime": 30
    }
  ],
  "totalEstimatedTime": 120,
  "riskFactors": ["..."]
}`,
  },
  executor: {
    type: "executor",
    name: "Ejecutor",
    description: "Ejecuta cada paso del plan, maneja herramientas y parámetros",
    responsibilities: [
      "Obtener contexto de pasos anteriores",
      "Preparar parámetros para cada herramienta",
      "Ejecutar la herramienta",
      "Manejar errores",
      "Guardar resultado en memoria",
      "Emitir evento al frontend",
    ],
    modelId: "deepseek-v4-flash",        // economy
    alternativeModelId: "kimi-k2.7-code", // quality (especializado en coding)
    speed: 5,
    cost: 5,
    quality: 4,
    systemPrompt: `Eres un ejecutor experto. Tu trabajo es:
1. Recibir un paso del plan
2. Preparar los parámetros para la herramienta
3. Ejecutar la herramienta
4. Validar el resultado
5. Reportar el resultado

Si hay error, notificar al Verificador para decidir si reintentar.`,
  },
  verifier: {
    type: "verifier",
    name: "Verificador",
    description: "Valida resultados, detecta errores y decide si reintentar",
    responsibilities: [
      "Validar resultado de cada paso",
      "Analizar errores (causa raíz)",
      "Decidir acción: retry, skip, fail",
      "Retornar recomendación",
    ],
    modelId: "deepseek-v4-flash",      // economy
    alternativeModelId: "glm-5.1",      // quality (razonamiento avanzado, 203K ctx)
    speed: 4,
    cost: 3,
    quality: 5,
    systemPrompt: `Eres un verificador experto. Tu trabajo es:
1. Validar que el resultado sea correcto
2. Si hay error, analizar la causa raíz
3. Decidir si reintentar, saltar o fallar
4. Sugerir fixes

Reintenta si la probabilidad de éxito es > 60%.

Siempre responde en JSON:
{
  "isValid": true|false,
  "errors": ["..."],
  "analysis": {
    "rootCause": "...",
    "canRetry": true|false,
    "suggestedFix": "...",
    "likelihood": 0.0-1.0
  },
  "action": "retry|skip|fail",
  "recommendation": "..."
}`,
  },
  optimizer: {
    type: "optimizer",
    name: "Optimizador",
    description: "Optimiza pasos, mejora rendimiento y reduce costos",
    responsibilities: [
      "Analizar ejecución",
      "Identificar cuellos de botella",
      "Generar sugerencias de optimización",
      "Estimar ahorros (tiempo, costo)",
    ],
    modelId: "minimax-m3",              // economy
    alternativeModelId: "deepseek-v4-pro", // quality (1M ctx, razonamiento complejo)
    speed: 4,
    cost: 5,
    quality: 4,
    systemPrompt: `Eres un optimizador experto. Tu trabajo es:
1. Analizar la ejecución completada
2. Identificar cuellos de botella (pasos lentos, costosos, innecesarios)
3. Generar sugerencias específicas de optimización
4. Estimar ahorros potenciales

Siempre responde en JSON:
{
  "suggestions": [
    {
      "title": "...",
      "description": "...",
      "timeReduction": "30%",
      "costReduction": "20%",
      "implementation": "..."
    }
  ],
  "savings": {
    "timeReduction": "...",
    "costReduction": "..."
  }
}`,
  },
  reporter: {
    type: "reporter",
    name: "Reportero",
    description: "Formatea resultados, genera reportes y crea visualizaciones",
    responsibilities: [
      "Recopilar datos de la ejecución",
      "Formatear resultados de forma clara",
      "Crear visualizaciones",
      "Generar documento profesional",
    ],
    modelId: "minimax-m3",             // economy
    alternativeModelId: "qwen3.6-plus", // quality (calidad de escritura superior)
    speed: 4,
    cost: 3,
    quality: 5,
    systemPrompt: `Eres un reportero experto. Tu trabajo es:
1. Recopilar todos los datos de la ejecución
2. Formatear de forma legible y profesional
3. Crear visualizaciones apropiadas
4. Generar un documento final

Crea: resumen ejecutivo, hallazgos principales, recomendaciones, métricas clave.`,
  },
  monitor: {
    type: "monitor",
    name: "Monitor",
    description: "Monitorea ejecución, registra logs y alertas en tiempo real",
    responsibilities: [
      "Monitorear ejecución continuamente",
      "Verificar métricas",
      "Detectar anomalías",
      "Generar alertas",
      "Registrar logs",
    ],
    modelId: "mimo-v2.5",
    alternativeModelId: "deepseek-v4-flash",
    speed: 5,
    cost: 5,
    quality: 4,
    systemPrompt: `Eres un monitor experto. Tu trabajo es:
1. Monitorear la ejecución en tiempo real
2. Detectar anomalías (tiempo excesivo, costo alto, errores múltiples)
3. Generar alertas cuando sea necesario
4. Registrar métricas

Anomalías a detectar:
- Tiempo > 1.5x estimado
- Costo > 1.5x estimado
- Más de 3 errores
- Uso de memoria alto`,
  },
};

// Lista ordenada de agentes para mostrar en UI
export const AGENT_LIST: AgentConfig[] = [
  AGENTS.analyzer,
  AGENTS.planner,
  AGENTS.executor,
  AGENTS.verifier,
  AGENTS.optimizer,
  AGENTS.reporter,
  AGENTS.monitor,
];

// Tabla de agentes → modelo asignado (fuente de verdad: src/lib/config/model-routing.ts)
export const AGENT_MODEL_ASSIGNMENTS = [
  // ── Modo Economy (default) ──────────────────────────────────────────────────
  { agent: "Analizador",   model: "DeepSeek V4 Flash", modelId: "deepseek-v4-flash", mode: "economy", reason: "Rápido, económico, extracción de info" },
  { agent: "Planificador", model: "DeepSeek V4 Flash", modelId: "deepseek-v4-flash", mode: "economy", reason: "Planificación básica, bajo costo" },
  { agent: "Ejecutor",     model: "DeepSeek V4 Flash", modelId: "deepseek-v4-flash", mode: "economy", reason: "Código simple, bajo costo" },
  { agent: "Verificador",  model: "DeepSeek V4 Flash", modelId: "deepseek-v4-flash", mode: "economy", reason: "Verificación básica, bajo costo" },
  { agent: "Optimizador",  model: "MiniMax M3",        modelId: "minimax-m3",        mode: "economy", reason: "Análisis básico, muy económico" },
  { agent: "Reportero",    model: "MiniMax M3",        modelId: "minimax-m3",        mode: "economy", reason: "Generación de contenido económica" },
  { agent: "Monitor",      model: "MiMo-V2.5",         modelId: "mimo-v2.5",         mode: "economy", reason: "Ultra rápido, tiempo real" },
  // ── Modo Quality ────────────────────────────────────────────────────────────
  { agent: "Analizador",   model: "Qwen3.7 Plus",    modelId: "qwen3.7-plus",    mode: "quality", reason: "Mejor comprensión semántica" },
  { agent: "Planificador", model: "Qwen3.7 Plus",    modelId: "qwen3.7-plus",    mode: "quality", reason: "Razonamiento de alto nivel" },
  { agent: "Ejecutor",     model: "Kimi K2.7 Code",  modelId: "kimi-k2.7-code",  mode: "quality", reason: "Modelo especializado en coding" },
  { agent: "Verificador",  model: "GLM-5.1",         modelId: "glm-5.1",         mode: "quality", reason: "Razonamiento avanzado, 203K contexto" },
  { agent: "Optimizador",  model: "DeepSeek V4 Pro", modelId: "deepseek-v4-pro", mode: "quality", reason: "1M contexto, razonamiento complejo" },
  { agent: "Reportero",    model: "Qwen3.6 Plus",    modelId: "qwen3.6-plus",    mode: "quality", reason: "Calidad de escritura superior" },
  { agent: "Monitor",      model: "MiMo-V2.5",       modelId: "mimo-v2.5",       mode: "quality", reason: "Suficiente para monitoreo" },
];

// ==================== 56 HERRAMIENTAS (16 categorías) ====================
export const TOOLS: Tool[] = [
  // Categoría 1: Navegación Web (7)
  { id: 1, name: "Browser Navigation", description: "Navegar a URLs y esperar elementos", category: "Navegación Web", parameters: [{ name: "url", type: "string", required: true, description: "URL destino" }, { name: "timeout", type: "number", required: false, description: "Timeout en ms" }, { name: "waitFor", type: "string", required: false, description: "Selector a esperar" }], returns: "HTML, status code" },
  { id: 2, name: "Screenshot", description: "Capturar pantalla de página o elemento", category: "Navegación Web", parameters: [{ name: "selector", type: "string", required: false, description: "Selector CSS" }, { name: "fullPage", type: "boolean", required: false, description: "Página completa" }, { name: "format", type: "string", required: false, description: "png | jpg" }], returns: "Imagen (PNG/JPG)" },
  { id: 3, name: "PDF Generation", description: "Generar PDF desde HTML o URL", category: "Navegación Web", parameters: [{ name: "html", type: "string", required: true, description: "HTML o URL" }, { name: "options", type: "object", required: false, description: "Opciones PDF" }], returns: "PDF binario" },
  { id: 4, name: "Web Extraction", description: "Extraer datos estructurados de sitios web", category: "Navegación Web", parameters: [{ name: "url", type: "string", required: true, description: "URL" }, { name: "selector", type: "string", required: true, description: "Selector CSS" }, { name: "format", type: "string", required: false, description: "json | csv" }], returns: "Datos extraídos" },
  { id: 5, name: "Cookie Management", description: "Gestionar cookies del navegador", category: "Navegación Web", parameters: [{ name: "action", type: "string", required: true, description: "get | set | delete" }, { name: "name", type: "string", required: false, description: "Nombre cookie" }, { name: "value", type: "string", required: false, description: "Valor cookie" }], returns: "Cookie data" },
  { id: 6, name: "Network Interception", description: "Interceptar requests/responses", category: "Navegación Web", parameters: [{ name: "pattern", type: "string", required: true, description: "Patrón URL" }, { name: "action", type: "string", required: true, description: "Acción" }], returns: "Intercepted data" },
  { id: 7, name: "JavaScript Execution", description: "Ejecutar JavaScript en página", category: "Navegación Web", parameters: [{ name: "code", type: "string", required: true, description: "Código JS" }, { name: "timeout", type: "number", required: false, description: "Timeout ms" }], returns: "Resultado de ejecución" },
  // Categoría 2: Ejecución de Código (5)
  { id: 8, name: "Python Execution", description: "Ejecutar código Python en sandbox", category: "Ejecución de Código", parameters: [{ name: "code", type: "string", required: true, description: "Código Python" }, { name: "timeout", type: "number", required: false, description: "Timeout s" }, { name: "libraries", type: "string[]", required: false, description: "Librerías" }], returns: "Output, stderr" },
  { id: 9, name: "Node.js Execution", description: "Ejecutar código JavaScript/Node", category: "Ejecución de Código", parameters: [{ name: "code", type: "string", required: true, description: "Código JS" }, { name: "timeout", type: "number", required: false, description: "Timeout s" }, { name: "packages", type: "string[]", required: false, description: "Paquetes npm" }], returns: "Output, stderr" },
  { id: 10, name: "Bash/Shell Execution", description: "Ejecutar comandos shell", category: "Ejecución de Código", parameters: [{ name: "command", type: "string", required: true, description: "Comando bash" }, { name: "timeout", type: "number", required: false, description: "Timeout s" }, { name: "cwd", type: "string", required: false, description: "Working dir" }], returns: "Output, exit code" },
  { id: 11, name: "SQL Execution", description: "Ejecutar queries SQL", category: "Ejecución de Código", parameters: [{ name: "query", type: "string", required: true, description: "Query SQL" }, { name: "database", type: "string", required: true, description: "DB connection" }, { name: "params", type: "any[]", required: false, description: "Parámetros" }], returns: "Query results" },
  { id: 12, name: "Docker Execution", description: "Ejecutar containers Docker", category: "Ejecución de Código", parameters: [{ name: "image", type: "string", required: true, description: "Imagen Docker" }, { name: "command", type: "string", required: false, description: "Comando" }, { name: "timeout", type: "number", required: false, description: "Timeout s" }], returns: "Container output" },
  // Categoría 3: Operaciones de Archivos (5)
  { id: 13, name: "File Read", description: "Leer archivos de cualquier formato", category: "Operaciones de Archivos", parameters: [{ name: "path", type: "string", required: true, description: "Ruta archivo" }, { name: "encoding", type: "string", required: false, description: "Encoding" }], returns: "File content" },
  { id: 14, name: "File Write", description: "Escribir archivos", category: "Operaciones de Archivos", parameters: [{ name: "path", type: "string", required: true, description: "Ruta archivo" }, { name: "content", type: "string", required: true, description: "Contenido" }, { name: "encoding", type: "string", required: false, description: "Encoding" }], returns: "Success/error" },
  { id: 15, name: "Directory Operations", description: "Crear, listar, eliminar directorios", category: "Operaciones de Archivos", parameters: [{ name: "action", type: "string", required: true, description: "create | list | delete" }, { name: "path", type: "string", required: true, description: "Ruta" }, { name: "recursive", type: "boolean", required: false, description: "Recursivo" }], returns: "Directory listing" },
  { id: 16, name: "Compression", description: "Comprimir/descomprimir archivos", category: "Operaciones de Archivos", parameters: [{ name: "action", type: "string", required: true, description: "compress | decompress" }, { name: "input", type: "string", required: true, description: "Archivo entrada" }, { name: "format", type: "string", required: false, description: "zip | tar | gz" }], returns: "Compressed file" },
  { id: 17, name: "File Hashing", description: "Calcular hash de archivos", category: "Operaciones de Archivos", parameters: [{ name: "path", type: "string", required: true, description: "Ruta archivo" }, { name: "algorithm", type: "string", required: false, description: "md5 | sha256 | sha512" }], returns: "Hash value" },
  // Categoría 4: Generación de Contenido (5)
  { id: 18, name: "Image Generation", description: "Generar imágenes con IA", category: "Generación de Contenido", parameters: [{ name: "prompt", type: "string", required: true, description: "Descripción" }, { name: "style", type: "string", required: false, description: "Estilo" }, { name: "size", type: "string", required: false, description: "1024x1024" }], returns: "Image URL" },
  { id: 19, name: "Video Generation", description: "Generar videos con IA", category: "Generación de Contenido", parameters: [{ name: "prompt", type: "string", required: true, description: "Descripción" }, { name: "duration", type: "number", required: false, description: "Duración s" }, { name: "style", type: "string", required: false, description: "Estilo" }], returns: "Video URL" },
  { id: 20, name: "Audio Generation", description: "Generar audio/voz con IA", category: "Generación de Contenido", parameters: [{ name: "text", type: "string", required: true, description: "Texto" }, { name: "voice", type: "string", required: false, description: "Voz" }, { name: "language", type: "string", required: false, description: "Idioma" }], returns: "Audio URL" },
  { id: 21, name: "Document Generation", description: "Generar documentos PDF/DOCX", category: "Generación de Contenido", parameters: [{ name: "template", type: "string", required: true, description: "Plantilla" }, { name: "data", type: "object", required: true, description: "Datos" }, { name: "format", type: "string", required: false, description: "pdf | docx | xlsx" }], returns: "Document file" },
  { id: 22, name: "Code Generation", description: "Generar código en cualquier lenguaje", category: "Generación de Contenido", parameters: [{ name: "description", type: "string", required: true, description: "Descripción" }, { name: "language", type: "string", required: false, description: "Lenguaje" }, { name: "style", type: "string", required: false, description: "Estilo" }], returns: "Generated code" },
  // Categoría 5: Procesamiento de Medios (3)
  { id: 23, name: "Image Processing", description: "Procesar imágenes (resize, crop, filter)", category: "Procesamiento de Medios", parameters: [{ name: "image", type: "string", required: true, description: "URL/Path" }, { name: "operation", type: "string", required: true, description: "Operación" }, { name: "params", type: "object", required: false, description: "Parámetros" }], returns: "Processed image" },
  { id: 24, name: "Video Processing", description: "Procesar videos (trim, merge, convert)", category: "Procesamiento de Medios", parameters: [{ name: "video", type: "string", required: true, description: "URL/Path" }, { name: "operation", type: "string", required: true, description: "Operación" }, { name: "params", type: "object", required: false, description: "Parámetros" }], returns: "Processed video" },
  { id: 25, name: "Audio Processing", description: "Procesar audio (trim, convert, normalize)", category: "Procesamiento de Medios", parameters: [{ name: "audio", type: "string", required: true, description: "URL/Path" }, { name: "operation", type: "string", required: true, description: "Operación" }, { name: "params", type: "object", required: false, description: "Parámetros" }], returns: "Processed audio" },
  // Categoría 6: Integración de APIs (4)
  { id: 26, name: "HTTP Client", description: "Hacer requests HTTP genéricos", category: "Integración de APIs", parameters: [{ name: "method", type: "string", required: true, description: "GET | POST | PUT | DELETE" }, { name: "url", type: "string", required: true, description: "URL" }, { name: "headers", type: "object", required: false, description: "Headers" }, { name: "body", type: "any", required: false, description: "Body" }], returns: "Response" },
  { id: 27, name: "GraphQL Client", description: "Ejecutar queries GraphQL", category: "Integración de APIs", parameters: [{ name: "endpoint", type: "string", required: true, description: "Endpoint" }, { name: "query", type: "string", required: true, description: "Query GraphQL" }, { name: "variables", type: "object", required: false, description: "Variables" }], returns: "Query result" },
  { id: 28, name: "REST API Client", description: "Cliente REST genérico con auth", category: "Integración de APIs", parameters: [{ name: "endpoint", type: "string", required: true, description: "Endpoint" }, { name: "method", type: "string", required: true, description: "Método" }, { name: "params", type: "object", required: false, description: "Params" }], returns: "API response" },
  { id: 29, name: "Webhook Management", description: "Gestionar webhooks entrantes/salientes", category: "Integración de APIs", parameters: [{ name: "action", type: "string", required: true, description: "create | delete | list" }, { name: "url", type: "string", required: false, description: "URL" }, { name: "events", type: "string[]", required: false, description: "Eventos" }], returns: "Webhook data" },
  // Categoría 7: Base de Datos (3)
  { id: 30, name: "SQL Database", description: "Operaciones SQL completas", category: "Base de Datos", parameters: [{ name: "query", type: "string", required: true, description: "Query SQL" }, { name: "database", type: "string", required: true, description: "DB" }], returns: "Query results" },
  { id: 31, name: "MongoDB", description: "Operaciones MongoDB CRUD", category: "Base de Datos", parameters: [{ name: "collection", type: "string", required: true, description: "Colección" }, { name: "operation", type: "string", required: true, description: "Operación" }, { name: "query", type: "object", required: false, description: "Query" }], returns: "Query results" },
  { id: 32, name: "Redis", description: "Operaciones Redis (get, set, expire)", category: "Base de Datos", parameters: [{ name: "key", type: "string", required: true, description: "Key" }, { name: "operation", type: "string", required: true, description: "Operación" }, { name: "value", type: "any", required: false, description: "Value" }], returns: "Redis response" },
  // Categoría 8: Sistema (3)
  { id: 33, name: "System Information", description: "Obtener info del sistema (CPU, RAM, disk)", category: "Sistema", parameters: [{ name: "type", type: "string", required: false, description: "cpu | memory | disk | os" }], returns: "System info" },
  { id: 34, name: "Environment Variables", description: "Gestionar variables de entorno", category: "Sistema", parameters: [{ name: "action", type: "string", required: true, description: "get | set | delete" }, { name: "name", type: "string", required: false, description: "Nombre" }, { name: "value", type: "string", required: false, description: "Valor" }], returns: "Env var value" },
  { id: 35, name: "Process Management", description: "Gestionar procesos del sistema", category: "Sistema", parameters: [{ name: "action", type: "string", required: true, description: "list | kill | spawn" }, { name: "pid", type: "number", required: false, description: "PID" }, { name: "signal", type: "string", required: false, description: "Signal" }], returns: "Process info" },
  // Categoría 9: Automatización (3)
  { id: 36, name: "Task Scheduler", description: "Programar tareas periódicas", category: "Automatización", parameters: [{ name: "schedule", type: "string", required: true, description: "Cron" }, { name: "task", type: "string", required: true, description: "Tarea" }, { name: "params", type: "object", required: false, description: "Params" }], returns: "Scheduled task ID" },
  { id: 37, name: "Workflow Automation", description: "Automatizar flujos multi-step", category: "Automatización", parameters: [{ name: "workflow", type: "object", required: true, description: "Definición" }, { name: "trigger", type: "string", required: true, description: "Trigger" }, { name: "actions", type: "object[]", required: false, description: "Acciones" }], returns: "Workflow result" },
  { id: 38, name: "Notifications", description: "Enviar notificaciones multi-canal", category: "Automatización", parameters: [{ name: "type", type: "string", required: true, description: "email | push | sms" }, { name: "recipient", type: "string", required: true, description: "Destinatario" }, { name: "message", type: "string", required: true, description: "Mensaje" }], returns: "Notification status" },
  // Categoría 10: Análisis y Visualización (3)
  { id: 39, name: "Data Analysis", description: "Analizar datos con estadística", category: "Análisis y Visualización", parameters: [{ name: "data", type: "any[]", required: true, description: "Datos" }, { name: "analysis_type", type: "string", required: true, description: "Tipo de análisis" }], returns: "Analysis result" },
  { id: 40, name: "Visualization", description: "Crear visualizaciones (bar, line, pie, etc.)", category: "Análisis y Visualización", parameters: [{ name: "data", type: "any[]", required: true, description: "Datos" }, { name: "chart_type", type: "string", required: true, description: "Tipo chart" }, { name: "options", type: "object", required: false, description: "Opciones" }], returns: "Chart image/HTML" },
  { id: 41, name: "Report Generation", description: "Generar reportes formateados", category: "Análisis y Visualización", parameters: [{ name: "data", type: "object", required: true, description: "Datos" }, { name: "template", type: "string", required: true, description: "Plantilla" }, { name: "format", type: "string", required: false, description: "pdf | docx | html" }], returns: "Report file" },
  // Categoría 11: Comunicación (2)
  { id: 42, name: "Email", description: "Enviar emails con adjuntos", category: "Comunicación", parameters: [{ name: "to", type: "string", required: true, description: "Destinatario" }, { name: "subject", type: "string", required: true, description: "Asunto" }, { name: "body", type: "string", required: true, description: "Cuerpo" }, { name: "attachments", type: "string[]", required: false, description: "Adjuntos" }], returns: "Email status" },
  { id: 43, name: "Chat/Messaging", description: "Slack, Discord, Telegram, WhatsApp", category: "Comunicación", parameters: [{ name: "platform", type: "string", required: true, description: "Plataforma" }, { name: "channel", type: "string", required: true, description: "Canal" }, { name: "message", type: "string", required: true, description: "Mensaje" }], returns: "Message status" },
  // Categoría 12: Autenticación (1)
  { id: 44, name: "Authentication", description: "Autenticar usuarios con OAuth/JWT", category: "Autenticación", parameters: [{ name: "provider", type: "string", required: true, description: "Provider" }, { name: "credentials", type: "object", required: true, description: "Credenciales" }], returns: "Auth token" },
  // Categoría 13: Búsqueda (2)
  { id: 45, name: "Web Search", description: "Buscar en internet", category: "Búsqueda", parameters: [{ name: "query", type: "string", required: true, description: "Query" }, { name: "limit", type: "number", required: false, description: "Límite" }, { name: "language", type: "string", required: false, description: "Idioma" }], returns: "Search results" },
  { id: 46, name: "Web Scraping", description: "Scraping profundo de sitios web", category: "Búsqueda", parameters: [{ name: "url", type: "string", required: true, description: "URL" }, { name: "selectors", type: "object", required: true, description: "Selectores" }, { name: "depth", type: "number", required: false, description: "Profundidad" }], returns: "Scraped data" },
  // Categoría 14: Procesamiento de Documentos (2)
  { id: 47, name: "Document Parsing", description: "Parsear PDF, DOCX, XLSX, etc.", category: "Procesamiento de Documentos", parameters: [{ name: "file", type: "string", required: true, description: "Archivo" }, { name: "format", type: "string", required: true, description: "Formato" }, { name: "options", type: "object", required: false, description: "Opciones" }], returns: "Parsed content" },
  { id: 48, name: "Format Conversion", description: "Convertir formatos de archivos", category: "Procesamiento de Documentos", parameters: [{ name: "input", type: "string", required: true, description: "Archivo" }, { name: "from_format", type: "string", required: true, description: "Origen" }, { name: "to_format", type: "string", required: true, description: "Destino" }], returns: "Converted file" },
  // Categoría 15: Versionamiento (1)
  { id: 49, name: "Git", description: "Operaciones Git (clone, commit, push, etc.)", category: "Versionamiento", parameters: [{ name: "action", type: "string", required: true, description: "Acción" }, { name: "repo", type: "string", required: false, description: "Repo" }, { name: "params", type: "object", required: false, description: "Params" }], returns: "Git result" },
  // Categoría 16: Adicionales (7)
  { id: 50, name: "Project Management", description: "Gestionar proyectos y tareas", category: "Adicionales", parameters: [{ name: "action", type: "string", required: true, description: "Acción" }, { name: "project", type: "string", required: false, description: "Proyecto" }], returns: "Project data" },
  { id: 51, name: "Serialization", description: "Serializar datos (JSON, XML, YAML, CSV)", category: "Adicionales", parameters: [{ name: "data", type: "any", required: true, description: "Datos" }, { name: "format", type: "string", required: true, description: "Formato" }], returns: "Serialized data" },
  { id: 52, name: "Caching", description: "Gestionar caché de aplicación", category: "Adicionales", parameters: [{ name: "action", type: "string", required: true, description: "Acción" }, { name: "key", type: "string", required: false, description: "Key" }, { name: "value", type: "any", required: false, description: "Value" }], returns: "Cache data" },
  { id: 53, name: "Logging", description: "Logging avanzado con niveles", category: "Adicionales", parameters: [{ name: "level", type: "string", required: true, description: "Nivel" }, { name: "message", type: "string", required: true, description: "Mensaje" }, { name: "context", type: "object", required: false, description: "Contexto" }], returns: "Log entry" },
  { id: 54, name: "Monitoring", description: "Monitoreo de recursos del sistema", category: "Adicionales", parameters: [{ name: "metric", type: "string", required: true, description: "Métrica" }, { name: "interval", type: "number", required: false, description: "Intervalo s" }], returns: "Monitoring data" },
  { id: 55, name: "Testing", description: "Ejecutar tests unitarios/integración", category: "Adicionales", parameters: [{ name: "framework", type: "string", required: true, description: "Framework" }, { name: "files", type: "string[]", required: false, description: "Archivos" }], returns: "Test results" },
  { id: 56, name: "Deployment", description: "Desplegar aplicaciones a producción", category: "Adicionales", parameters: [{ name: "target", type: "string", required: true, description: "Destino" }, { name: "config", type: "object", required: true, description: "Config" }], returns: "Deployment status" },
];

export const TOOL_CATEGORIES = [
  "Navegación Web", "Ejecución de Código", "Operaciones de Archivos", "Generación de Contenido",
  "Procesamiento de Medios", "Integración de APIs", "Base de Datos", "Sistema",
  "Automatización", "Análisis y Visualización", "Comunicación", "Autenticación",
  "Búsqueda", "Procesamiento de Documentos", "Versionamiento", "Adicionales",
] as const;

// ==================== CONVERSACIONES DE EJEMPLO ====================
const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();
const minsAgo = (m: number) => new Date(now - m * 60_000).toISOString();

export const SAMPLE_CONVERSATIONS: Conversation[] = [
  {
    id: "conv-1",
    title: "Análisis de competencia en tools AI",
    createdAt: hoursAgo(48),
    updatedAt: hoursAgo(47),
    status: "completed" as const,
    modelUsed: "kimi-k2.7-code",
    tokensUsed: 142000,
    cost: 0.42,
    category: "research" as const,
    preview: "Investiga los 5 principales competidores en el mercado de herramientas de productividad AI...",
    summary: "Análisis de 5 competidores principales en tools AI: Notion AI, Linear AI, ClickUp Brain, Asana AI, Monday.com AI.",
    learnedPatterns: ["research: usar Web Search + Data Analysis para competitive analysis"],
    messages: [
      { id: "m1", role: "user" as const, content: "Investiga los 5 principales competidores en el mercado de herramientas de productividad AI y genera un reporte comparativo.", timestamp: hoursAgo(48) },
      {
        id: "m2", role: "assistant" as const, content: "Voy a analizar el mercado. Empezaré identificando los principales competidores y luego generaré un reporte.",
        timestamp: hoursAgo(48), agentStatus: "completed" as const,
        steps: [
          { id: "s1", stepNumber: 1, description: "Buscando competidores", toolName: "Web Search", toolCategory: "Búsqueda", toolParams: {}, status: "completed", produces: "browser", agent: "executor", modelUsed: "deepseek-v4-flash", duration: 18, logs: [] },
          { id: "s2", stepNumber: 2, description: "Extrayendo información", toolName: "Web Extraction", toolCategory: "Navegación Web", toolParams: {}, status: "completed", produces: "browser", agent: "executor", modelUsed: "deepseek-v4-flash", duration: 42, logs: [] },
          { id: "s3", stepNumber: 3, description: "Analizando datos", toolName: "Data Analysis", toolCategory: "Análisis y Visualización", toolParams: {}, status: "completed", produces: "data", agent: "verifier", modelUsed: "glm-5.2", duration: 28, logs: [] },
          { id: "s4", stepNumber: 4, description: "Generando reporte", toolName: "Document Generation", toolCategory: "Generación de Contenido", toolParams: {}, status: "completed", produces: "output", agent: "reporter", modelUsed: "kimi-k2.7-code", duration: 35, logs: [] },
        ],
        output: { type: "text" as const, title: "Reporte comparativo", content: "Identifiqué 5 competidores principales: Notion AI, Linear AI, ClickUp Brain, Asana AI y Monday.com AI. Notion AI lidera en features (47/50), ClickUp Brain ofrece mejor relación costo/calidad ($10/mes)." },
      },
    ],
  },
  {
    id: "conv-2",
    title: "Scraping de catálogo e-commerce",
    createdAt: hoursAgo(24), updatedAt: hoursAgo(23),
    status: "completed" as const, modelUsed: "glm-5.2", tokensUsed: 89000, cost: 0.31, category: "data" as const,
    preview: "Extrae todos los productos de una tienda e-commerce...",
    summary: "Scraping de 1500 productos de tienda e-commerce, CSV generado.",
    learnedPatterns: ["data: Web Scraping + File Write para catálogos grandes"],
    messages: [
      { id: "m1", role: "user" as const, content: "Extrae todos los productos de una tienda e-commerce. Necesito el CSV.", timestamp: hoursAgo(24) },
      {
        id: "m2", role: "assistant" as const, content: "Voy a hacer scraping del catálogo completo.",
        timestamp: hoursAgo(24), agentStatus: "completed" as const,
        steps: [
          { id: "s1", stepNumber: 1, description: "Analizando estructura del sitio", toolName: "Browser Navigation", toolCategory: "Navegación Web", toolParams: {}, status: "completed", produces: "browser", agent: "planner", modelUsed: "qwen3.7-plus", duration: 12, logs: [] },
          { id: "s2", stepNumber: 2, description: "Extrayendo productos", toolName: "Web Scraping", toolCategory: "Búsqueda", toolParams: {}, status: "completed", produces: "browser", agent: "executor", modelUsed: "deepseek-v4-flash", duration: 65, logs: [] },
          { id: "s3", stepNumber: 3, description: "Generando CSV", toolName: "File Write", toolCategory: "Operaciones de Archivos", toolParams: {}, status: "completed", produces: "files", agent: "reporter", modelUsed: "kimi-k2.7-code", duration: 8, logs: [] },
        ],
        output: { type: "file" as const, title: "productos.csv", filename: "productos.csv", content: "name,price,category\nProducto 1,$89.99,Cat A\n...1500 productos" },
      },
    ],
  },
  {
    id: "conv-3",
    title: "Refactor PHP a TypeScript",
    createdAt: hoursAgo(6), updatedAt: minsAgo(35),
    status: "active" as const, modelUsed: "kimi-k2.7-code", tokensUsed: 45200, cost: 0.18, category: "code" as const,
    preview: "Refactoriza este proyecto PHP 5 legacy a TypeScript...",
    messages: [
      { id: "m1", role: "user" as const, content: "Refactoriza este proyecto PHP 5 legacy a TypeScript con NestJS.", timestamp: hoursAgo(6) },
      {
        id: "m2", role: "assistant" as const, content: "Voy a migrar el proyecto. Primero analizaré el código legacy.",
        timestamp: hoursAgo(6), agentStatus: "executing" as const,
        steps: [
          { id: "s1", stepNumber: 1, description: "Analizando código legacy", toolName: "File Read", toolCategory: "Operaciones de Archivos", toolParams: {}, status: "completed", produces: "files", agent: "analyzer", modelUsed: "deepseek-v4-flash", duration: 180, logs: [] },
          { id: "s2", stepNumber: 2, description: "Generando plan de migración", toolName: "Code Generation", toolCategory: "Generación de Contenido", toolParams: {}, status: "completed", produces: "output", agent: "planner", modelUsed: "qwen3.7-plus", duration: 120, logs: [] },
          { id: "s3", stepNumber: 3, description: "Migrando AuthModule", toolName: "Code Generation", toolCategory: "Generación de Contenido", toolParams: {}, status: "running", produces: "files", agent: "executor", modelUsed: "deepseek-v4-flash", logs: [
            { id: "l1", timestamp: minsAgo(30), level: "info" as const, message: "Generando User entity", agent: "executor" as const },
            { id: "l2", timestamp: minsAgo(25), level: "info" as const, message: "JwtStrategy migrada", agent: "executor" as const },
            { id: "l3", timestamp: minsAgo(20), level: "warn" as const, message: "mysql_real_escape_string detectada", agent: "verifier" as const },
            { id: "l4", timestamp: minsAgo(15), level: "info" as const, message: "12/15 archivos migrados", agent: "executor" as const },
          ] },
          { id: "s4", stepNumber: 4, description: "Migrando UserService", toolName: "Code Generation", toolCategory: "Generación de Contenido", toolParams: {}, status: "pending", produces: "files", agent: "executor", modelUsed: "deepseek-v4-flash", logs: [] },
          { id: "s5", stepNumber: 5, description: "Generando tests", toolName: "Testing", toolCategory: "Adicionales", toolParams: {}, status: "pending", produces: "terminal", agent: "verifier", modelUsed: "glm-5.2", logs: [] },
          { id: "s6", stepNumber: 6, description: "Commit y push", toolName: "Git", toolCategory: "Versionamiento", toolParams: {}, status: "pending", produces: "terminal", agent: "executor", modelUsed: "deepseek-v4-flash", logs: [] },
        ],
      },
    ],
  },
  {
    id: "conv-4",
    title: "Dashboard de ventas Q1",
    createdAt: hoursAgo(72), updatedAt: hoursAgo(71),
    status: "completed" as const, modelUsed: "qwen3.7-plus", tokensUsed: 67000, cost: 0.21, category: "data" as const,
    preview: "Crea un dashboard interactivo de ventas Q1...",
    summary: "Dashboard HTML interactivo generado desde CSV de 8000 filas, $4.2M ventas Q1.",
    learnedPatterns: ["data: Python Execution + Visualization para dashboards"],
    messages: [
      { id: "m1", role: "user" as const, content: "Crea un dashboard interactivo de ventas Q1 desde este CSV.", timestamp: hoursAgo(72) },
      {
        id: "m2", role: "assistant" as const, content: "Voy a procesar el CSV y generar un dashboard.",
        timestamp: hoursAgo(72), agentStatus: "completed" as const,
        steps: [
          { id: "s1", stepNumber: 1, description: "Leyendo CSV", toolName: "File Read", toolCategory: "Operaciones de Archivos", toolParams: {}, status: "completed", produces: "data", agent: "analyzer", modelUsed: "deepseek-v4-flash", duration: 15, logs: [] },
          { id: "s2", stepNumber: 2, description: "Calculando KPIs", toolName: "Data Analysis", toolCategory: "Análisis y Visualización", toolParams: {}, status: "completed", produces: "data", agent: "executor", modelUsed: "deepseek-v4-flash", duration: 22, logs: [] },
          { id: "s3", stepNumber: 3, description: "Generando dashboard", toolName: "Visualization", toolCategory: "Análisis y Visualización", toolParams: {}, status: "completed", produces: "output", agent: "reporter", modelUsed: "kimi-k2.7-code", duration: 38, logs: [] },
        ],
        output: { type: "html" as const, title: "Dashboard Q1 2026", content: "<!DOCTYPE html>...dashboard interactivo con KPIs, gráficos..." },
      },
    ],
  },
  {
    id: "conv-5",
    title: "Newsletter semanal automatizado",
    createdAt: hoursAgo(96), updatedAt: hoursAgo(95),
    status: "completed" as const, modelUsed: "minimax-m3", tokensUsed: 38000, cost: 0.04, category: "automation" as const,
    preview: "Recopila noticias de IA y envía newsletter...",
    summary: "Newsletter enviado a 1240 suscriptores, tasa apertura 38.2%.",
    learnedPatterns: ["automation: HTTP Client + Email para newsletters recurrentes"],
    messages: [
      { id: "m1", role: "user" as const, content: "Recopila noticias de IA y envía newsletter a 1240 suscriptores.", timestamp: hoursAgo(96) },
      {
        id: "m2", role: "assistant" as const, content: "Voy a recopilar y procesar las noticias.",
        timestamp: hoursAgo(96), agentStatus: "completed" as const,
        steps: [
          { id: "s1", stepNumber: 1, description: "Recopilando RSS", toolName: "HTTP Client", toolCategory: "Integración de APIs", toolParams: {}, status: "completed", produces: "browser", agent: "executor", modelUsed: "deepseek-v4-flash", duration: 18, logs: [] },
          { id: "s2", stepNumber: 2, description: "Filtrando noticias", toolName: "Data Analysis", toolCategory: "Análisis y Visualización", toolParams: {}, status: "completed", produces: "data", agent: "verifier", modelUsed: "glm-5.2", duration: 12, logs: [] },
          { id: "s3", stepNumber: 3, description: "Generando HTML", toolName: "Code Generation", toolCategory: "Generación de Contenido", toolParams: {}, status: "completed", produces: "output", agent: "reporter", modelUsed: "kimi-k2.7-code", duration: 24, logs: [] },
          { id: "s4", stepNumber: 4, description: "Enviando emails", toolName: "Email", toolCategory: "Comunicación", toolParams: {}, status: "completed", produces: "terminal", agent: "executor", modelUsed: "deepseek-v4-flash", duration: 9, logs: [] },
        ],
        output: { type: "text" as const, content: "Newsletter enviado. Tasa de apertura: 38.2%." },
      },
    ],
  },
  {
    id: "conv-6",
    title: "Análisis de sentimientos Twitter",
    createdAt: hoursAgo(12), updatedAt: hoursAgo(11),
    status: "failed" as const, modelUsed: "deepseek-v4-pro", tokensUsed: 28000, cost: 0.09, category: "data" as const,
    preview: "Procesa 50k tweets sobre mi marca...",
    summary: "Falló: Twitter API rate limit después de 12,400 tweets. Sugerencia: paginación más lenta.",
    learnedPatterns: ["data: Twitter API tiene rate limits agresivos, usar delays de 15min"],
    messages: [
      { id: "m1", role: "user" as const, content: "Procesa 50k tweets sobre mi marca.", timestamp: hoursAgo(12) },
      {
        id: "m2", role: "assistant" as const, content: "Voy a extraer los tweets y aplicar NLP.",
        timestamp: hoursAgo(12), agentStatus: "failed" as const,
        steps: [
          { id: "s1", stepNumber: 1, description: "Conectando con Twitter API", toolName: "HTTP Client", toolCategory: "Integración de APIs", toolParams: {}, status: "completed", produces: "terminal", agent: "executor", modelUsed: "deepseek-v4-flash", duration: 8, logs: [] },
          { id: "s2", stepNumber: 2, description: "Extrayendo tweets", toolName: "Web Scraping", toolCategory: "Búsqueda", toolParams: {}, status: "failed", produces: "terminal", agent: "executor", modelUsed: "deepseek-v4-flash", duration: 32, logs: [
            { id: "l1", timestamp: hoursAgo(11), level: "error" as const, message: "Rate limit excedido después de 12,400 tweets", agent: "monitor" as const },
          ] },
        ],
        output: { type: "text" as const, content: "No pude completar. Twitter API aplicó rate limit. Sugerencia: paginación más lenta." },
      },
    ],
  },
];

// ==================== STATS ====================
export const DASHBOARD_STATS = {
  totalTasks: SAMPLE_CONVERSATIONS.length,
  successRate: 83,
  totalTime: 18420,
  totalTokens: 1284500,
  totalCost: 12.84,
  activeTasks: 1,
  failedTasks: 1,
};

export const ACTIVITY_DATA = [
  { date: "Lun", tasks: 3, tokens: 145000, cost: 1.42 },
  { date: "Mar", tasks: 5, tokens: 220000, cost: 2.18 },
  { date: "Mié", tasks: 2, tokens: 98000, cost: 0.94 },
  { date: "Jue", tasks: 7, tokens: 340000, cost: 3.42 },
  { date: "Vie", tasks: 4, tokens: 180000, cost: 1.78 },
  { date: "Sáb", tasks: 1, tokens: 42000, cost: 0.42 },
  { date: "Dom", tasks: 3, tokens: 259500, cost: 2.68 },
];

export const TOOL_USAGE = [
  { tool: "Web Search", category: "Búsqueda", count: 47, successRate: 98 },
  { tool: "Code Generation", category: "Generación de Contenido", count: 38, successRate: 94 },
  { tool: "File Read", category: "Operaciones de Archivos", count: 32, successRate: 100 },
  { tool: "HTTP Client", category: "Integración de APIs", count: 28, successRate: 96 },
  { tool: "Python Execution", category: "Ejecución de Código", count: 24, successRate: 91 },
  { tool: "Web Extraction", category: "Navegación Web", count: 21, successRate: 88 },
  { tool: "Document Generation", category: "Generación de Contenido", count: 18, successRate: 100 },
  { tool: "Data Analysis", category: "Análisis y Visualización", count: 15, successRate: 93 },
];

export const MODEL_USAGE = [
  { name: "DeepSeek V4 Flash", value: 35, color: "oklch(0.7 0.12 250)" },
  { name: "Kimi K2.7 Code", value: 22, color: "oklch(0.7 0.13 200)" },
  { name: "Qwen3.7 Plus", value: 15, color: "oklch(0.72 0.15 70)" },
  { name: "GLM-5.2", value: 12, color: "oklch(0.65 0.18 320)" },
  { name: "MiniMax M3", value: 8, color: "oklch(0.6 0.18 150)" },
  { name: "MiMo-V2.5", value: 5, color: "oklch(0.5 0.05 250)" },
  { name: "Otros", value: 3, color: "oklch(0.4 0.05 250)" },
];

// ==================== PLANTILLAS DE SIMULACIÓN POR CATEGORÍA ====================
// El orquestador usa estas plantillas para simular el flujo de los 7 agentes
// En producción, cada agente haría su propia llamada al LLM vía OpenCode Go
export interface StepTemplate {
  title: string;
  tool: string;
  toolCategory: string;
  produces: "browser" | "terminal" | "files" | "output" | "data";
  logs: string[];
  duration: number;
  agent: "analyzer" | "planner" | "executor" | "verifier" | "optimizer" | "reporter" | "monitor";
}

export const TASK_TEMPLATES: Record<string, {
  description: string;
  steps: StepTemplate[];
  finalOutput: { type: "text" | "code" | "file" | "html"; content: string; title?: string; filename?: string; language?: string };
  learnedPattern: string;
}> = {
  research: {
    description: "Voy a investigar el tema sistemáticamente. Primero buscaré información relevante en la web, luego extraeré datos de las fuentes, los analizaré y finalmente generaré un reporte estructurado.",
    steps: [
      { title: "Buscando información relevante", tool: "Web Search", toolCategory: "Búsqueda", produces: "browser", duration: 18, agent: "analyzer", logs: ["Construyendo query de búsqueda", "Procesando resultados", "Filtrando por relevancia"] },
      { title: "Extrayendo datos de fuentes", tool: "Web Extraction", toolCategory: "Navegación Web", produces: "browser", duration: 35, agent: "executor", logs: ["Navegando a fuentes", "Extrayendo contenido", "Parser aplicado"] },
      { title: "Analizando datos recopilados", tool: "Data Analysis", toolCategory: "Análisis y Visualización", produces: "data", duration: 28, agent: "verifier", logs: ["Sintetizando hallazgos", "Identificando patrones", "Preparando reporte"] },
      { title: "Generando reporte final", tool: "Document Generation", toolCategory: "Generación de Contenido", produces: "files", agent: "reporter", duration: 30, logs: ["Estructurando reporte", "Redactando conclusiones", "Documento final listo"] },
    ],
    finalOutput: {
      type: "file", title: "reporte.md", filename: "reporte.md",
      content: "# Reporte de investigación\n\n## Resumen Ejecutivo\n\nInvestigación completada a partir de fuentes web.",
    },
    learnedPattern: "research: Web Search + Web Extraction + Data Analysis + Document Generation",
  },
  code: {
    description: "Voy a analizar el requerimiento y generar código limpio y testeable. Primero entenderé la estructura, luego implementaré la solución y finalmente añadiré tests.",
    steps: [
      { title: "Analizando estructura del proyecto", tool: "File Read", toolCategory: "Operaciones de Archivos", produces: "files", duration: 15, agent: "analyzer", logs: ["Leyendo package.json", "Identificando patrones", "Mapeando dependencias"] },
      { title: "Generando plan de implementación", tool: "Code Generation", toolCategory: "Generación de Contenido", produces: "output", duration: 20, agent: "planner", logs: ["Descomponiendo objetivo", "Identificando módulos", "Plan generado"] },
      { title: "Generando código de la solución", tool: "Code Generation", toolCategory: "Generación de Contenido", produces: "files", duration: 45, agent: "executor", logs: ["Aplicando patrones de diseño", "Validando sintaxis", "Código generado: 247 LOC"] },
      { title: "Ejecutando tests", tool: "Testing", toolCategory: "Adicionales", produces: "terminal", duration: 22, agent: "verifier", logs: ["Configurando framework", "Tests pasados: 18/18", "Cobertura: 87%"] },
    ],
    finalOutput: {
      type: "code", title: "solution.ts", language: "typescript",
      content: `// Solución generada\nexport async function processItem(input: Input): Promise<Output> {\n  const validated = validate(input);\n  const transformed = transform(validated);\n  return await persist(transformed);\n}\n\n// 247 líneas totales`,
    },
    learnedPattern: "code: File Read + Code Generation + Testing para refactors",
  },
  data: {
    description: "Voy a procesar los datos sistemáticamente. Primero cargaré el dataset, luego aplicaré transformaciones y finalmente generaré visualizaciones.",
    steps: [
      { title: "Cargando dataset", tool: "File Read", toolCategory: "Operaciones de Archivos", produces: "data", duration: 12, agent: "analyzer", logs: ["Leyendo archivo", "8,000 filas detectadas", "Schema validado"] },
      { title: "Limpiando y transformando datos", tool: "Python Execution", toolCategory: "Ejecución de Código", produces: "terminal", duration: 28, agent: "executor", logs: ["Eliminando duplicados", "Imputando nulos", "Normalizando formatos"] },
      { title: "Calculando métricas y KPIs", tool: "Data Analysis", toolCategory: "Análisis y Visualización", produces: "data", duration: 24, agent: "verifier", logs: ["Agregando por dimensión", "Calculando tendencias", "Detectando outliers"] },
      { title: "Generando visualización", tool: "Visualization", toolCategory: "Análisis y Visualización", produces: "output", duration: 35, agent: "reporter", logs: ["Configurando chart", "Renderizando visualización", "HTML interactivo generado"] },
    ],
    finalOutput: { type: "html", title: "Dashboard generado", content: "<!DOCTYPE html><html>...dashboard interactivo con KPIs, gráficos y filtros dinámicos..." },
    learnedPattern: "data: Python Execution + Visualization para dashboards",
  },
  automation: {
    description: "Voy a configurar la automatización paso a paso. Primero configuraré los triggers, luego las acciones y finalmente testearé el flujo completo.",
    steps: [
      { title: "Configurando triggers", tool: "HTTP Client", toolCategory: "Integración de APIs", produces: "terminal", duration: 14, agent: "planner", logs: ["Conectando con API", "Webhook configurado", "Auth validada"] },
      { title: "Ejecutando flujo principal", tool: "Workflow Automation", toolCategory: "Automatización", produces: "terminal", duration: 38, agent: "executor", logs: ["Procesando items", "Aplicando transformaciones", "12/12 items procesados"] },
      { title: "Enviando notificaciones", tool: "Notifications", toolCategory: "Automatización", produces: "terminal", duration: 9, agent: "executor", logs: ["Email enviado", "Slack notificado"] },
      { title: "Verificando ejecución", tool: "Testing", toolCategory: "Adicionales", produces: "output", duration: 11, agent: "verifier", logs: ["Logs revisados", "Métricas correctas"] },
    ],
    finalOutput: { type: "text", content: "Automatización configurada y verificada. Se ejecutará según el schedule configurado." },
    learnedPattern: "automation: HTTP Client + Workflow Automation + Notifications para flujos recurrentes",
  },
  content: {
    description: "Voy a investigar el tema en fuentes reales, extraer información clave, analizarla y redactar el contenido solicitado.",
    steps: [
      { title: "Investigando tema", tool: "Web Search", toolCategory: "Búsqueda", produces: "browser", duration: 22, agent: "analyzer", logs: ["Generando query de búsqueda", "Buscando fuentes actualizadas", "Filtrando resultados relevantes"] },
      { title: "Extrayendo datos de fuentes", tool: "Web Extraction", toolCategory: "Navegación Web", produces: "browser", duration: 35, agent: "executor", logs: ["Navegando a fuentes", "Extrayendo contenido relevante", "Guardando datos en memoria"] },
      { title: "Analizando información", tool: "Data Analysis", toolCategory: "Análisis y Visualización", produces: "data", duration: 20, agent: "verifier", logs: ["Sintetizando hallazgos", "Identificando tendencias", "Preparando material para redacción"] },
      { title: "Redactando documento", tool: "Document Generation", toolCategory: "Generación de Contenido", produces: "files", duration: 45, agent: "reporter", logs: ["Generando Markdown", "Aplicando formato profesional", "Documento listo"] },
    ],
    finalOutput: { type: "file", title: "documento.md", filename: "documento.md", content: "# Título\n\n## Introducción\n\nContenido generado a partir de fuentes investigadas." },
    learnedPattern: "content: Web Search + Web Extraction + Data Analysis + Document Generation",
  },
  general: {
    description: "Voy a trabajar en esta tarea. Te mostraré el progreso en el panel derecho.",
    steps: [
      { title: "Analizando requerimiento", tool: "Code Generation", toolCategory: "Generación de Contenido", produces: "output", duration: 12, agent: "analyzer", logs: ["Descomponiendo objetivo", "Identificando pasos"] },
      { title: "Ejecutando tarea principal", tool: "Bash/Shell Execution", toolCategory: "Ejecución de Código", produces: "terminal", duration: 32, agent: "executor", logs: ["Procesando", "Generando resultado"] },
      { title: "Verificando resultado", tool: "Testing", toolCategory: "Adicionales", produces: "output", duration: 14, agent: "verifier", logs: ["Validando output", "Comprobando calidad"] },
    ],
    finalOutput: { type: "text", content: "Tarea completada. El resultado está disponible en el workspace." },
    learnedPattern: "general: análisis + ejecución + verificación estándar",
  },
};

export function detectCategory(objective: string): "research" | "code" | "data" | "automation" | "content" | "general" {
  const lower = objective.toLowerCase();

  // Categorías más específicas primero para evitar que palabras genéricas
  // como "reporte" sobrescriban el dominio real de la petición.
  if (/codigo|código|función|function|refactor|migrar|migrate|api|component|bug|fix|implementa/i.test(lower)) return "code";
  if (/csv|datos|data|dataset|dashboard|estadística|stat|scraping|extract|procesa/i.test(lower)) return "data";
  if (/automatiza|schedule|newsletter|webhook|cron|recurrente|automatización/i.test(lower)) return "automation";
  if (/artículo|blog|content|contenido|escribe|redacta|seo|copy|manual|pdf|guía|guia|ebook|libro|documento|receta|alimentos|nutrición|nutricion|saludable|dieta|comida|comidas/i.test(lower)) return "content";

  // Research es más genérico: solo se usa cuando no hay indicios de otro dominio.
  if (/investiga|analiza|compara|estudia|reporte|market|compet/i.test(lower)) return "research";

  return "general";
}

// ==================== EMPTY WORKSPACE ====================
export const EMPTY_WORKSPACE = {
  activeTab: "output" as const,
  output: { type: "text" as const, content: "Inicia una conversación para ver el progreso aquí." },
};

// ==================== LANDING ====================
export const LANDING_STATS = [
  { value: "7", label: "Agentes IA" },
  { value: "13", label: "Modelos" },
  { value: "56", label: "Herramientas" },
];

export const LANDING_EXAMPLES = [
  { category: "Investigación", title: "Analiza el mercado de tools AI", description: "Identifica competidores, extrae features y pricing, genera reporte.", icon: "search" },
  { category: "Código", title: "Refactoriza este proyecto legacy", description: "Migra de PHP 5 a TypeScript con NestJS preservando comportamiento.", icon: "code" },
  { category: "Datos", title: "Crea un dashboard desde este CSV", description: "Procesa 8000 filas y genera visualización interactiva.", icon: "chart" },
  { category: "Automatización", title: "Envía un newsletter semanal", description: "Recopila noticias de 10 fuentes RSS y envía a 1240 suscriptores.", icon: "zap" },
  { category: "Contenido", title: "Escribe 10 artículos SEO", description: "Genera 1500+ palabras por artículo optimizado.", icon: "file" },
  { category: "General", title: "Cualquier tarea compleja", description: "Si puede descomponerse en pasos, el agente puede ejecutarla.", icon: "sparkles" },
];

// ==================== UTILIDADES ====================
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function formatCost(n: number): string {
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "ahora";
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d}d`;
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}
