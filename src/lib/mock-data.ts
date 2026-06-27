import type {
  AIModel,
  Tool,
  Conversation,
  DashboardStats,
  ActivityData,
  ToolUsage,
  ModelUsage,
  TaskCategory,
} from "./types";

// ==================== 13 MODELOS OPencode Go ====================
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
  "Navegación Web",
  "Ejecución de Código",
  "Operaciones de Archivos",
  "Generación de Contenido",
  "Procesamiento de Medios",
  "Integración de APIs",
  "Base de Datos",
  "Sistema",
  "Automatización",
  "Análisis y Visualización",
  "Comunicación",
  "Autenticación",
  "Búsqueda",
  "Procesamiento de Documentos",
  "Versionamiento",
  "Adicionales",
] as const;

// ==================== CONVERSACIONES DE EJEMPLO (estilo Manus) ====================
const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();
const minsAgo = (m: number) => new Date(now - m * 60_000).toISOString();

export const SAMPLE_CONVERSATIONS: Conversation[] = [
  {
    id: "conv-1",
    title: "Análisis de competencia en tools AI",
    createdAt: hoursAgo(48),
    updatedAt: hoursAgo(47),
    status: "completed",
    modelUsed: "kimi-k2.7-code",
    tokensUsed: 142000,
    cost: 0.42,
    category: "research",
    preview: "Investiga los 5 principales competidores en el mercado de herramientas de productividad AI...",
    messages: [
      {
        id: "m1",
        role: "user",
        content: "Investiga los 5 principales competidores en el mercado de herramientas de productividad AI y genera un reporte comparativo con features, pricing y posicionamiento.",
        timestamp: hoursAgo(48),
      },
      {
        id: "m2",
        role: "assistant",
        content: "Voy a analizar el mercado de herramientas de productividad AI. Empezaré identificando los principales competidores y luego generaré un reporte comparativo.",
        timestamp: hoursAgo(48),
        agentStatus: "completed",
        steps: [
          { id: "s1", stepNumber: 1, description: "Buscando competidores principales", toolName: "Web Search", toolCategory: "Búsqueda", toolParams: {}, status: "completed", produces: "browser", agent: "executor", duration: 18, logs: [], startedAt: hoursAgo(48), completedAt: hoursAgo(47) },
          { id: "s2", stepNumber: 2, description: "Extrayendo información de cada uno", toolName: "Web Extraction", toolCategory: "Navegación Web", toolParams: {}, status: "completed", produces: "browser", agent: "executor", duration: 42, logs: [] },
          { id: "s3", stepNumber: 3, description: "Analizando pricing y features", toolName: "Data Analysis", toolCategory: "Análisis y Visualización", toolParams: {}, status: "completed", produces: "data", agent: "verifier", duration: 28, logs: [] },
          { id: "s4", stepNumber: 4, description: "Generando reporte comparativo", toolName: "Document Generation", toolCategory: "Generación de Contenido", toolParams: {}, status: "completed", produces: "output", agent: "executor", duration: 35, logs: [] },
        ],
        output: {
          type: "text",
          title: "Reporte comparativo",
          content: "Identifiqué 5 competidores principales: Notion AI, Linear AI, ClickUp Brain, Asana AI y Monday.com AI. El análisis muestra que Notion AI lidera en features (47/50), mientras que ClickUp Brain ofrece mejor relación costo/calidad ($10/mes). Recomiendo enfocar estrategia en diferenciación por automatización profunda y pricing accesible.",
        },
      },
    ],
  },
  {
    id: "conv-2",
    title: "Scraping de catálogo e-commerce",
    createdAt: hoursAgo(24),
    updatedAt: hoursAgo(23),
    status: "completed",
    modelUsed: "glm-5.2",
    tokensUsed: 89000,
    cost: 0.31,
    category: "data",
    preview: "Extrae todos los productos de una tienda e-commerce con precios, descripciones e imágenes...",
    messages: [
      {
        id: "m1",
        role: "user",
        content: "Extrae todos los productos de una tienda e-commerce con precios, descripciones e imágenes. Necesito el CSV.",
        timestamp: hoursAgo(24),
      },
      {
        id: "m2",
        role: "assistant",
        content: "Voy a hacer scraping del catálogo completo. Primero navegaré la tienda para entender su estructura y luego extraeré los productos sistemáticamente.",
        timestamp: hoursAgo(24),
        agentStatus: "completed",
        steps: [
          { id: "s1", stepNumber: 1, description: "Analizando estructura del sitio", toolName: "Browser Navigation", toolCategory: "Navegación Web", toolParams: {}, status: "completed", produces: "browser", agent: "planner", duration: 12, logs: [] },
          { id: "s2", stepNumber: 2, description: "Extrayendo productos por categoría", toolName: "Web Scraping", toolCategory: "Búsqueda", toolParams: {}, status: "completed", produces: "browser", agent: "executor", duration: 65, logs: [] },
          { id: "s3", stepNumber: 3, description: "Generando archivo CSV", toolName: "File Write", toolCategory: "Operaciones de Archivos", toolParams: {}, status: "completed", produces: "files", agent: "executor", duration: 8, logs: [] },
        ],
        output: {
          type: "file",
          title: "productos.csv",
          filename: "productos.csv",
          content: "name,price,category,description\nProducto 1,$89.99,Categoría A,Descripción...\nProducto 2,$129.50,Categoría B,...\n... (1500 productos)",
        },
      },
    ],
  },
  {
    id: "conv-3",
    title: "Refactor PHP a TypeScript",
    createdAt: hoursAgo(6),
    updatedAt: minsAgo(35),
    status: "active",
    modelUsed: "kimi-k2.7-code",
    tokensUsed: 45200,
    cost: 0.18,
    category: "code",
    preview: "Refactoriza este proyecto PHP 5 legacy a TypeScript con NestJS preservando comportamiento...",
    messages: [
      {
        id: "m1",
        role: "user",
        content: "Refactoriza este proyecto PHP 5 legacy a TypeScript con NestJS preservando comportamiento. Son como 15k líneas.",
        timestamp: hoursAgo(6),
      },
      {
        id: "m2",
        role: "assistant",
        content: "Voy a migrar el proyecto. Primero analizaré el código legacy para entender la arquitectura, luego generaré un plan de migración módulo por módulo.",
        timestamp: hoursAgo(6),
        agentStatus: "executing",
        steps: [
          { id: "s1", stepNumber: 1, description: "Analizando código legacy", toolName: "File Read", toolCategory: "Operaciones de Archivos", toolParams: {}, status: "completed", produces: "files", agent: "planner", duration: 180, logs: [] },
          { id: "s2", stepNumber: 2, description: "Generando plan de migración", toolName: "Code Generation", toolCategory: "Generación de Contenido", toolParams: {}, status: "completed", produces: "output", agent: "planner", duration: 120, logs: [] },
          { id: "s3", stepNumber: 3, description: "Migrando AuthModule", toolName: "Code Generation", toolCategory: "Generación de Contenido", toolParams: {}, status: "running", produces: "files", agent: "executor", logs: [
            { id: "l1", timestamp: minsAgo(30), level: "info", message: "Generando User entity con TypeORM decorators" },
            { id: "l2", timestamp: minsAgo(25), level: "info", message: "JwtStrategy migrada, compatible con NestJS Passport" },
            { id: "l3", timestamp: minsAgo(20), level: "warn", message: "Función mysql_real_escape_string detectada - reemplazar con parameterized queries" },
            { id: "l4", timestamp: minsAgo(15), level: "info", message: "12/15 archivos de AuthModule migrados" },
          ] },
          { id: "s4", stepNumber: 4, description: "Migrando UserService", toolName: "Code Generation", toolCategory: "Generación de Contenido", toolParams: {}, status: "pending", produces: "files", agent: "executor", logs: [] },
          { id: "s5", stepNumber: 5, description: "Generando tests unitarios", toolName: "Testing", toolCategory: "Adicionales", toolParams: {}, status: "pending", produces: "terminal", agent: "verifier", logs: [] },
          { id: "s6", stepNumber: 6, description: "Commit y push", toolName: "Git", toolCategory: "Versionamiento", toolParams: {}, status: "pending", produces: "terminal", agent: "executor", logs: [] },
        ],
      },
    ],
  },
  {
    id: "conv-4",
    title: "Dashboard de ventas Q1",
    createdAt: hoursAgo(72),
    updatedAt: hoursAgo(71),
    status: "completed",
    modelUsed: "qwen3.7-plus",
    tokensUsed: 67000,
    cost: 0.21,
    category: "data",
    preview: "Crea un dashboard interactivo de ventas Q1 desde este CSV de 8000 filas...",
    messages: [
      {
        id: "m1",
        role: "user",
        content: "Crea un dashboard interactivo de ventas Q1 desde este CSV de 8000 filas. Incluye KPIs, gráficos y filtros.",
        timestamp: hoursAgo(72),
      },
      {
        id: "m2",
        role: "assistant",
        content: "Voy a procesar el CSV y generar un dashboard HTML interactivo. Primero analizaré la estructura de los datos.",
        timestamp: hoursAgo(72),
        agentStatus: "completed",
        steps: [
          { id: "s1", stepNumber: 1, description: "Leyendo y analizando CSV", toolName: "File Read", toolCategory: "Operaciones de Archivos", toolParams: {}, status: "completed", produces: "data", agent: "planner", duration: 15, logs: [] },
          { id: "s2", stepNumber: 2, description: "Calculando KPIs principales", toolName: "Data Analysis", toolCategory: "Análisis y Visualización", toolParams: {}, status: "completed", produces: "data", agent: "executor", duration: 22, logs: [] },
          { id: "s3", stepNumber: 3, description: "Generando dashboard HTML", toolName: "Visualization", toolCategory: "Análisis y Visualización", toolParams: {}, status: "completed", produces: "output", agent: "executor", duration: 38, logs: [] },
        ],
        output: {
          type: "html",
          title: "Dashboard Q1 2026",
          content: "<!DOCTYPE html><html>...dashboard interactivo con 8 KPIs, 6 gráficos Chart.js, filtros por región/producto/fecha. Total ventas Q1: $4.2M, crecimiento 23% YoY...",
        },
      },
    ],
  },
  {
    id: "conv-5",
    title: "Newsletter semanal automatizado",
    createdAt: hoursAgo(96),
    updatedAt: hoursAgo(95),
    status: "completed",
    modelUsed: "minimax-m3",
    tokensUsed: 38000,
    cost: 0.04,
    category: "automation",
    preview: "Recopila noticias de IA de 10 fuentes RSS y envía newsletter a 1240 suscriptores...",
    messages: [
      {
        id: "m1",
        role: "user",
        content: "Recopila noticias de IA de las últimas 24h de 10 fuentes RSS y envía newsletter a 1240 suscriptores.",
        timestamp: hoursAgo(96),
      },
      {
        id: "m2",
        role: "assistant",
        content: "Voy a recopilar y procesar las noticias. Luego generaré el HTML responsive del newsletter y lo enviaré vía SendGrid.",
        timestamp: hoursAgo(96),
        agentStatus: "completed",
        steps: [
          { id: "s1", stepNumber: 1, description: "Recopilando RSS feeds", toolName: "HTTP Client", toolCategory: "Integración de APIs", toolParams: {}, status: "completed", produces: "browser", agent: "executor", duration: 18, logs: [] },
          { id: "s2", stepNumber: 2, description: "Filtrando y priorizando noticias", toolName: "Data Analysis", toolCategory: "Análisis y Visualización", toolParams: {}, status: "completed", produces: "data", agent: "verifier", duration: 12, logs: [] },
          { id: "s3", stepNumber: 3, description: "Generando HTML responsive", toolName: "Code Generation", toolCategory: "Generación de Contenido", toolParams: {}, status: "completed", produces: "output", agent: "executor", duration: 24, logs: [] },
          { id: "s4", stepNumber: 4, description: "Enviando a 1240 suscriptores", toolName: "Email", toolCategory: "Comunicación", toolParams: {}, status: "completed", produces: "terminal", agent: "executor", duration: 9, logs: [] },
        ],
        output: {
          type: "text",
          content: "Newsletter enviado exitosamente. Tasa de apertura: 38.2% (vs 24% promedio industria). 47 clics en CTAs.",
        },
      },
    ],
  },
  {
    id: "conv-6",
    title: "Análisis de sentimientos Twitter",
    createdAt: hoursAgo(12),
    updatedAt: hoursAgo(11),
    status: "failed",
    modelUsed: "deepseek-v4-pro",
    tokensUsed: 28000,
    cost: 0.09,
    category: "data",
    preview: "Procesa 50k tweets sobre mi marca y genera dashboard de sentimientos...",
    messages: [
      {
        id: "m1",
        role: "user",
        content: "Procesa 50k tweets sobre mi marca y genera dashboard de sentimientos.",
        timestamp: hoursAgo(12),
      },
      {
        id: "m2",
        role: "assistant",
        content: "Voy a extraer los tweets y aplicar análisis NLP de sentimientos.",
        timestamp: hoursAgo(12),
        agentStatus: "failed",
        steps: [
          { id: "s1", stepNumber: 1, description: "Conectando con Twitter API", toolName: "HTTP Client", toolCategory: "Integración de APIs", toolParams: {}, status: "completed", produces: "terminal", agent: "executor", duration: 8, logs: [] },
          { id: "s2", stepNumber: 2, description: "Extrayendo tweets", toolName: "Web Scraping", toolCategory: "Búsqueda", toolParams: {}, status: "failed", produces: "terminal", agent: "executor", duration: 32, logs: [
            { id: "l1", timestamp: hoursAgo(11), level: "error", message: "Rate limit excedido después de 12,400 tweets" },
          ] },
        ],
        output: {
          type: "text",
          content: "No pude completar la tarea. Twitter API aplicó rate limit después de procesar 12,400 de los 50,000 tweets. Sugerencia: implementar paginación más lenta con delays de 15min entre lotes.",
        },
      },
    ],
  },
];

// ==================== ESTADÍSTICAS ====================
export const DASHBOARD_STATS: DashboardStats = {
  totalTasks: SAMPLE_CONVERSATIONS.length,
  successRate: 83,
  totalTime: 18420,
  totalTokens: 1284500,
  totalCost: 12.84,
  activeTasks: 1,
  failedTasks: 1,
};

export const ACTIVITY_DATA: ActivityData[] = [
  { date: "Lun", tasks: 3, tokens: 145000, cost: 1.42 },
  { date: "Mar", tasks: 5, tokens: 220000, cost: 2.18 },
  { date: "Mié", tasks: 2, tokens: 98000, cost: 0.94 },
  { date: "Jue", tasks: 7, tokens: 340000, cost: 3.42 },
  { date: "Vie", tasks: 4, tokens: 180000, cost: 1.78 },
  { date: "Sáb", tasks: 1, tokens: 42000, cost: 0.42 },
  { date: "Dom", tasks: 3, tokens: 259500, cost: 2.68 },
];

export const TOOL_USAGE: ToolUsage[] = [
  { tool: "Web Search", category: "Búsqueda", count: 47, successRate: 98 },
  { tool: "Code Generation", category: "Generación de Contenido", count: 38, successRate: 94 },
  { tool: "File Read", category: "Operaciones de Archivos", count: 32, successRate: 100 },
  { tool: "HTTP Client", category: "Integración de APIs", count: 28, successRate: 96 },
  { tool: "Python Execution", category: "Ejecución de Código", count: 24, successRate: 91 },
  { tool: "Web Extraction", category: "Navegación Web", count: 21, successRate: 88 },
  { tool: "Document Generation", category: "Generación de Contenido", count: 18, successRate: 100 },
  { tool: "Data Analysis", category: "Análisis y Visualización", count: 15, successRate: 93 },
];

export const MODEL_USAGE: ModelUsage[] = [
  { name: "Kimi K2.7 Code", value: 32, color: "oklch(0.7 0.12 250)" },
  { name: "GLM-5.2", value: 24, color: "oklch(0.7 0.13 200)" },
  { name: "Qwen3.7 Max", value: 18, color: "oklch(0.72 0.15 70)" },
  { name: "DeepSeek V4 Pro", value: 14, color: "oklch(0.65 0.18 320)" },
  { name: "MiniMax M3", value: 8, color: "oklch(0.6 0.18 150)" },
  { name: "Otros", value: 4, color: "oklch(0.5 0.05 250)" },
];

// ==================== PLANTILLAS DE SIMULACIÓN ====================
// El agente (internamente Planificador→Ejecutor→Verificador) usa estas plantillas
// El usuario solo ve "Trabajando..." y los pasos discretos
export interface StepTemplate {
  title: string;
  tool: string;
  toolCategory: string;
  produces: "browser" | "terminal" | "files" | "output" | "data";
  logs: string[];
  duration: number;
  agent: "planner" | "executor" | "verifier";
}

export const TASK_TEMPLATES: Record<TaskCategory, {
  description: string;
  steps: StepTemplate[];
  finalOutput: { type: "text" | "code" | "file" | "html"; content: string; title?: string; filename?: string; language?: string };
}> = {
  research: {
    description: "Voy a investigar el tema sistemáticamente. Primero buscaré información relevante, luego analizaré los datos y finalmente generaré un reporte estructurado.",
    steps: [
      { title: "Buscando información relevante", tool: "Web Search", toolCategory: "Búsqueda", produces: "browser", duration: 18, agent: "planner", logs: ["Construyendo query de búsqueda", "Procesando 47 resultados", "Filtrando por relevancia"] },
      { title: "Extrayendo datos de fuentes", tool: "Web Extraction", toolCategory: "Navegación Web", produces: "browser", duration: 35, agent: "executor", logs: ["Navegando a fuentes", "Extrayendo contenido estructurado", "Parser aplicado"] },
      { title: "Analizando datos recopilados", tool: "Data Analysis", toolCategory: "Análisis y Visualización", produces: "data", duration: 28, agent: "verifier", logs: ["Cargando dataset", "Aplicando análisis estadístico", "Identificando patrones"] },
      { title: "Generando reporte final", tool: "Document Generation", toolCategory: "Generación de Contenido", produces: "output", duration: 32, agent: "executor", logs: ["Inicializando plantilla", "Renderizando contenido", "Documento generado"] },
    ],
    finalOutput: {
      type: "text",
      title: "Análisis completado",
      content: "He completado el análisis. Los hallazgos principales muestran tendencias claras en el período evaluado, con oportunidades identificadas en 3 áreas clave. El reporte completo incluye datos cuantitativos, recomendaciones priorizadas y próximos pasos sugeridos.",
    },
  },
  code: {
    description: "Voy a analizar el requerimiento y generar código limpio y testeable. Primero entenderé la estructura, luego implementaré la solución y finalmente añadiré tests.",
    steps: [
      { title: "Analizando estructura del proyecto", tool: "File Read", toolCategory: "Operaciones de Archivos", produces: "files", duration: 15, agent: "planner", logs: ["Leyendo package.json", "Identificando patrones", "Mapeando dependencias"] },
      { title: "Generando código de la solución", tool: "Code Generation", toolCategory: "Generación de Contenido", produces: "files", duration: 45, agent: "executor", logs: ["Aplicando patrones de diseño", "Validando sintaxis", "Código generado: 247 LOC"] },
      { title: "Ejecutando tests", tool: "Testing", toolCategory: "Adicionales", produces: "terminal", duration: 22, agent: "verifier", logs: ["Configurando framework", "Tests pasados: 18/18", "Cobertura: 87%"] },
      { title: "Aplicando formateo y linting", tool: "Bash/Shell Execution", toolCategory: "Ejecución de Código", produces: "terminal", duration: 8, agent: "executor", logs: ["Prettier aplicado", "ESLint: sin errores"] },
    ],
    finalOutput: {
      type: "code",
      title: "solution.ts",
      language: "typescript",
      content: `// Solución generada\nexport async function processItem(input: Input): Promise<Output> {\n  const validated = validate(input);\n  const transformed = transform(validated);\n  return await persist(transformed);\n}\n\n// 247 líneas totales - código limpio y testeable`,
    },
  },
  data: {
    description: "Voy a procesar los datos sistemáticamente. Primero cargaré el dataset, luego aplicaré transformaciones y finalmente generaré visualizaciones.",
    steps: [
      { title: "Cargando dataset", tool: "File Read", toolCategory: "Operaciones de Archivos", produces: "data", duration: 12, agent: "planner", logs: ["Leyendo archivo", "8,000 filas detectadas", "Schema validado"] },
      { title: "Limpiando y transformando datos", tool: "Python Execution", toolCategory: "Ejecución de Código", produces: "terminal", duration: 28, agent: "executor", logs: ["Eliminando duplicados", "Imputando nulos", "Normalizando formatos"] },
      { title: "Calculando métricas y KPIs", tool: "Data Analysis", toolCategory: "Análisis y Visualización", produces: "data", duration: 24, agent: "verifier", logs: ["Agregando por dimensión", "Calculando tendencias", "Detectando outliers"] },
      { title: "Generando visualización", tool: "Visualization", toolCategory: "Análisis y Visualización", produces: "output", duration: 35, agent: "executor", logs: ["Configurando chart", "Renderizando visualización", "HTML interactivo generado"] },
    ],
    finalOutput: {
      type: "html",
      title: "Dashboard generado",
      content: "<!DOCTYPE html><html>...dashboard interactivo con KPIs, gráficos y filtros dinámicos...",
    },
  },
  automation: {
    description: "Voy a configurar la automatización paso a paso. Primero configuraré los triggers, luego las acciones y finalmente testearé el flujo completo.",
    steps: [
      { title: "Configurando triggers", tool: "HTTP Client", toolCategory: "Integración de APIs", produces: "terminal", duration: 14, agent: "planner", logs: ["Conectando con API", "Webhook configurado", "Auth validada"] },
      { title: "Ejecutando flujo principal", tool: "Workflow Automation", toolCategory: "Automatización", produces: "terminal", duration: 38, agent: "executor", logs: ["Procesando items", "Aplicando transformaciones", "12/12 items procesados"] },
      { title: "Enviando notificaciones", tool: "Notifications", toolCategory: "Automatización", produces: "terminal", duration: 9, agent: "executor", logs: ["Email enviado", "Slack notificado"] },
      { title: "Verificando ejecución", tool: "Testing", toolCategory: "Adicionales", produces: "output", duration: 11, agent: "verifier", logs: ["Logs revisados", "Métricas correctas"] },
    ],
    finalOutput: {
      type: "text",
      content: "Automatización configurada y verificada. Se ejecutará según el schedule configurado. Monitoreo activo y notificaciones habilitadas.",
    },
  },
  content: {
    description: "Voy a crear el contenido paso a paso. Primero investigaré el tema, luego estructuraré las ideas y finalmente redactaré el contenido optimizado.",
    steps: [
      { title: "Investigando tema", tool: "Web Search", toolCategory: "Búsqueda", produces: "browser", duration: 22, agent: "planner", logs: ["Recopilando fuentes", "Identificando keywords", "Analizando competencia"] },
      { title: "Estructurando contenido", tool: "Code Generation", toolCategory: "Generación de Contenido", produces: "output", duration: 18, agent: "executor", logs: ["Creando outline", "Definiendo secciones", "Optimizando H2/H3"] },
      { title: "Redactando contenido", tool: "Code Generation", toolCategory: "Generación de Contenido", produces: "files", duration: 45, agent: "executor", logs: ["Escribiendo 1500+ palabras", "Aplicando SEO on-page", "Incluyendo CTAs"] },
      { title: "Revisando calidad", tool: "Testing", toolCategory: "Adicionales", produces: "output", duration: 12, agent: "verifier", logs: ["Checklist SEO aplicado", "Score: 87/100"] },
    ],
    finalOutput: {
      type: "file",
      title: "articulo.md",
      filename: "articulo.md",
      content: "# Título del artículo\n\n## Introducción\n\nLorem ipsum dolor sit amet...\n\n## Sección 1\n\nContenido optimizado SEO...",
    },
  },
  general: {
    description: "Voy a trabajar en esta tarea. Te mostraré el progreso en el panel derecho.",
    steps: [
      { title: "Analizando requerimiento", tool: "Code Generation", toolCategory: "Generación de Contenido", produces: "output", duration: 12, agent: "planner", logs: ["Descomponiendo objetivo", "Identificando pasos"] },
      { title: "Ejecutando tarea principal", tool: "Bash/Shell Execution", toolCategory: "Ejecución de Código", produces: "terminal", duration: 32, agent: "executor", logs: ["Procesando", "Generando resultado"] },
      { title: "Verificando resultado", tool: "Testing", toolCategory: "Adicionales", produces: "output", duration: 14, agent: "verifier", logs: ["Validando output", "Comprobando calidad"] },
    ],
    finalOutput: {
      type: "text",
      content: "Tarea completada. He generado el resultado solicitado y está disponible para descarga o revisión en el panel derecho.",
    },
  },
};

// Detectar categoría de tarea basado en el contenido (lo hace el agente internamente)
export function detectCategory(objective: string): TaskCategory {
  const lower = objective.toLowerCase();
  if (/investiga|analiza|compara|estudia|reporte|market|compet/i.test(lower)) return "research";
  if (/codigo|código|función|function|refactor|migrar|migrate|api|component|bug|fix|implementa/i.test(lower)) return "code";
  if (/csv|datos|data|dataset|dashboard|estadística|stat|scraping|extract|procesa/i.test(lower)) return "data";
  if (/automatiza|schedule|newsletter|webhook|cron|recurrente|automatización/i.test(lower)) return "automation";
  if (/artículo|blog|content|contenido|escribe|redacta|seo|copy/i.test(lower)) return "content";
  return "general";
}

// ==================== EMPTY WORKSPACE ====================
export const EMPTY_WORKSPACE = {
  activeTab: "output" as const,
  output: {
    type: "text" as const,
    content: "Inicia una conversación para ver el progreso aquí.",
  },
};

// ==================== LANDING ====================
export const LANDING_STATS = [
  { value: "13", label: "Modelos IA" },
  { value: "56", label: "Herramientas" },
  { value: "∞", label: "Casos de uso" },
];

export const LANDING_EXAMPLES = [
  { category: "Investigación", title: "Analiza el mercado de tools AI", description: "Identifica competidores, extrae features y pricing, genera reporte comparativo en PDF.", icon: "search" },
  { category: "Código", title: "Refactoriza este proyecto legacy", description: "Migra de PHP 5 a TypeScript con NestJS preservando comportamiento. Incluye tests.", icon: "code" },
  { category: "Datos", title: "Crea un dashboard desde este CSV", description: "Procesa 8000 filas y genera visualización interactiva con KPIs y filtros.", icon: "chart" },
  { category: "Automatización", title: "Envía un newsletter semanal", description: "Recopila noticias de 10 fuentes RSS, genera HTML y envía a 1240 suscriptores.", icon: "zap" },
  { category: "Contenido", title: "Escribe 10 artículos SEO", description: "Genera 1500+ palabras por artículo optimizado para buscadores.", icon: "file" },
  { category: "General", title: "Cualquier tarea compleja", description: "Si puede descomponerse en pasos, el agente puede ejecutarla.", icon: "sparkles" },
];

// ==================== UTILIDADES ====================
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${rm}m`;
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
