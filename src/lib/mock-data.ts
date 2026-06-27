import type { AIModel, Tool, Task, Execution, LogEntry, ActivityData, ToolUsage, DashboardStats } from "./types";

// ====== 13 Modelos OpenCode Go ======
export const OPENCODE_MODELS: AIModel[] = [
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

// ====== 56 Herramientas ======
export const TOOLS: Tool[] = [
  // Categoría 1: Navegación Web (7)
  { id: 1, name: "Browser Navigation", description: "Navegar a URLs y esperar elementos", category: "Navegación Web", parameters: [{ name: "url", type: "string", required: true, description: "URL destino" }, { name: "timeout", type: "number", required: false, description: "Timeout en ms" }, { name: "waitFor", type: "string", required: false, description: "Selector a esperar" }], returns: "HTML, status code", icon: "Globe" },
  { id: 2, name: "Screenshot", description: "Capturar pantalla de página o elemento", category: "Navegación Web", parameters: [{ name: "selector", type: "string", required: false, description: "Selector CSS" }, { name: "fullPage", type: "boolean", required: false, description: "Página completa" }, { name: "format", type: "string", required: false, description: "png | jpg" }], returns: "Imagen (PNG/JPG)", icon: "Camera" },
  { id: 3, name: "PDF Generation", description: "Generar PDF desde HTML o URL", category: "Navegación Web", parameters: [{ name: "html", type: "string", required: true, description: "HTML o URL" }, { name: "options", type: "object", required: false, description: "Opciones PDF" }], returns: "PDF binario", icon: "FileText" },
  { id: 4, name: "Web Extraction", description: "Extraer datos estructurados de sitios web", category: "Navegación Web", parameters: [{ name: "url", type: "string", required: true, description: "URL" }, { name: "selector", type: "string", required: true, description: "Selector CSS" }, { name: "format", type: "string", required: false, description: "json | csv" }], returns: "Datos extraídos", icon: "Scrape" },
  { id: 5, name: "Cookie Management", description: "Gestionar cookies del navegador", category: "Navegación Web", parameters: [{ name: "action", type: "string", required: true, description: "get | set | delete" }, { name: "name", type: "string", required: false, description: "Nombre cookie" }, { name: "value", type: "string", required: false, description: "Valor cookie" }], returns: "Cookie data", icon: "Cookie" },
  { id: 6, name: "Network Interception", description: "Interceptar requests/responses", category: "Navegación Web", parameters: [{ name: "pattern", type: "string", required: true, description: "Patrón URL" }, { name: "action", type: "string", required: true, description: "Acción" }], returns: "Intercepted data", icon: "Network" },
  { id: 7, name: "JavaScript Execution", description: "Ejecutar JavaScript en página", category: "Navegación Web", parameters: [{ name: "code", type: "string", required: true, description: "Código JS" }, { name: "timeout", type: "number", required: false, description: "Timeout ms" }], returns: "Resultado de ejecución", icon: "Code" },

  // Categoría 2: Ejecución de Código (5)
  { id: 8, name: "Python Execution", description: "Ejecutar código Python en sandbox", category: "Ejecución de Código", parameters: [{ name: "code", type: "string", required: true, description: "Código Python" }, { name: "timeout", type: "number", required: false, description: "Timeout s" }, { name: "libraries", type: "string[]", required: false, description: "Librerías" }], returns: "Output, stderr", icon: "Terminal" },
  { id: 9, name: "Node.js Execution", description: "Ejecutar código JavaScript/Node", category: "Ejecución de Código", parameters: [{ name: "code", type: "string", required: true, description: "Código JS" }, { name: "timeout", type: "number", required: false, description: "Timeout s" }, { name: "packages", type: "string[]", required: false, description: "Paquetes npm" }], returns: "Output, stderr", icon: "Braces" },
  { id: 10, name: "Bash/Shell Execution", description: "Ejecutar comandos shell", category: "Ejecución de Código", parameters: [{ name: "command", type: "string", required: true, description: "Comando bash" }, { name: "timeout", type: "number", required: false, description: "Timeout s" }, { name: "cwd", type: "string", required: false, description: "Working dir" }], returns: "Output, exit code", icon: "SquareTerminal" },
  { id: 11, name: "SQL Execution", description: "Ejecutar queries SQL", category: "Ejecución de Código", parameters: [{ name: "query", type: "string", required: true, description: "Query SQL" }, { name: "database", type: "string", required: true, description: "DB connection" }, { name: "params", type: "any[]", required: false, description: "Parámetros" }], returns: "Query results", icon: "Database" },
  { id: 12, name: "Docker Execution", description: "Ejecutar containers Docker", category: "Ejecución de Código", parameters: [{ name: "image", type: "string", required: true, description: "Imagen Docker" }, { name: "command", type: "string", required: false, description: "Comando" }, { name: "timeout", type: "number", required: false, description: "Timeout s" }], returns: "Container output", icon: "Container" },

  // Categoría 3: Operaciones de Archivos (5)
  { id: 13, name: "File Read", description: "Leer archivos de cualquier formato", category: "Operaciones de Archivos", parameters: [{ name: "path", type: "string", required: true, description: "Ruta archivo" }, { name: "encoding", type: "string", required: false, description: "Encoding" }], returns: "File content", icon: "FileSearch" },
  { id: 14, name: "File Write", description: "Escribir archivos", category: "Operaciones de Archivos", parameters: [{ name: "path", type: "string", required: true, description: "Ruta archivo" }, { name: "content", type: "string", required: true, description: "Contenido" }, { name: "encoding", type: "string", required: false, description: "Encoding" }], returns: "Success/error", icon: "FileEdit" },
  { id: 15, name: "Directory Operations", description: "Crear, listar, eliminar directorios", category: "Operaciones de Archivos", parameters: [{ name: "action", type: "string", required: true, description: "create | list | delete" }, { name: "path", type: "string", required: true, description: "Ruta" }, { name: "recursive", type: "boolean", required: false, description: "Recursivo" }], returns: "Directory listing", icon: "FolderTree" },
  { id: 16, name: "Compression", description: "Comprimir/descomprimir archivos", category: "Operaciones de Archivos", parameters: [{ name: "action", type: "string", required: true, description: "compress | decompress" }, { name: "input", type: "string", required: true, description: "Archivo entrada" }, { name: "format", type: "string", required: false, description: "zip | tar | gz" }], returns: "Compressed file", icon: "Archive" },
  { id: 17, name: "File Hashing", description: "Calcular hash de archivos", category: "Operaciones de Archivos", parameters: [{ name: "path", type: "string", required: true, description: "Ruta archivo" }, { name: "algorithm", type: "string", required: false, description: "md5 | sha256 | sha512" }], returns: "Hash value", icon: "Fingerprint" },

  // Categoría 4: Generación de Contenido (5)
  { id: 18, name: "Image Generation", description: "Generar imágenes con IA", category: "Generación de Contenido", parameters: [{ name: "prompt", type: "string", required: true, description: "Descripción" }, { name: "style", type: "string", required: false, description: "Estilo" }, { name: "size", type: "string", required: false, description: "1024x1024" }], returns: "Image URL", icon: "Image" },
  { id: 19, name: "Video Generation", description: "Generar videos con IA", category: "Generación de Contenido", parameters: [{ name: "prompt", type: "string", required: true, description: "Descripción" }, { name: "duration", type: "number", required: false, description: "Duración s" }, { name: "style", type: "string", required: false, description: "Estilo" }], returns: "Video URL", icon: "Video" },
  { id: 20, name: "Audio Generation", description: "Generar audio/voz con IA", category: "Generación de Contenido", parameters: [{ name: "text", type: "string", required: true, description: "Texto" }, { name: "voice", type: "string", required: false, description: "Voz" }, { name: "language", type: "string", required: false, description: "Idioma" }], returns: "Audio URL", icon: "Audio" },
  { id: 21, name: "Document Generation", description: "Generar documentos PDF/DOCX", category: "Generación de Contenido", parameters: [{ name: "template", type: "string", required: true, description: "Plantilla" }, { name: "data", type: "object", required: true, description: "Datos" }, { name: "format", type: "string", required: false, description: "pdf | docx | xlsx" }], returns: "Document file", icon: "FileType" },
  { id: 22, name: "Code Generation", description: "Generar código en cualquier lenguaje", category: "Generación de Contenido", parameters: [{ name: "description", type: "string", required: true, description: "Descripción" }, { name: "language", type: "string", required: false, description: "Lenguaje" }, { name: "style", type: "string", required: false, description: "Estilo" }], returns: "Generated code", icon: "Code2" },

  // Categoría 5: Procesamiento de Medios (3)
  { id: 23, name: "Image Processing", description: "Procesar imágenes (resize, crop, filter)", category: "Procesamiento de Medios", parameters: [{ name: "image", type: "string", required: true, description: "URL/Path" }, { name: "operation", type: "string", required: true, description: "Operación" }, { name: "params", type: "object", required: false, description: "Parámetros" }], returns: "Processed image", icon: "ImagePlay" },
  { id: 24, name: "Video Processing", description: "Procesar videos (trim, merge, convert)", category: "Procesamiento de Medios", parameters: [{ name: "video", type: "string", required: true, description: "URL/Path" }, { name: "operation", type: "string", required: true, description: "Operación" }, { name: "params", type: "object", required: false, description: "Parámetros" }], returns: "Processed video", icon: "Film" },
  { id: 25, name: "Audio Processing", description: "Procesar audio (trim, convert, normalize)", category: "Procesamiento de Medios", parameters: [{ name: "audio", type: "string", required: true, description: "URL/Path" }, { name: "operation", type: "string", required: true, description: "Operación" }, { name: "params", type: "object", required: false, description: "Parámetros" }], returns: "Processed audio", icon: "Waveform" },

  // Categoría 6: Integración de APIs (4)
  { id: 26, name: "HTTP Client", description: "Hacer requests HTTP genéricos", category: "Integración de APIs", parameters: [{ name: "method", type: "string", required: true, description: "GET | POST | PUT | DELETE" }, { name: "url", type: "string", required: true, description: "URL" }, { name: "headers", type: "object", required: false, description: "Headers" }, { name: "body", type: "any", required: false, description: "Body" }], returns: "Response", icon: "Globe" },
  { id: 27, name: "GraphQL Client", description: "Ejecutar queries GraphQL", category: "Integración de APIs", parameters: [{ name: "endpoint", type: "string", required: true, description: "Endpoint" }, { name: "query", type: "string", required: true, description: "Query GraphQL" }, { name: "variables", type: "object", required: false, description: "Variables" }], returns: "Query result", icon: "Share2" },
  { id: 28, name: "REST API Client", description: "Cliente REST genérico con auth", category: "Integración de APIs", parameters: [{ name: "endpoint", type: "string", required: true, description: "Endpoint" }, { name: "method", type: "string", required: true, description: "Método" }, { name: "params", type: "object", required: false, description: "Params" }], returns: "API response", icon: "Webhook" },
  { id: 29, name: "Webhook Management", description: "Gestionar webhooks entrantes/salientes", category: "Integración de APIs", parameters: [{ name: "action", type: "string", required: true, description: "create | delete | list" }, { name: "url", type: "string", required: false, description: "URL" }, { name: "events", type: "string[]", required: false, description: "Eventos" }], returns: "Webhook data", icon: "Webhook" },

  // Categoría 7: Base de Datos (3)
  { id: 30, name: "SQL Database", description: "Operaciones SQL completas", category: "Base de Datos", parameters: [{ name: "query", type: "string", required: true, description: "Query SQL" }, { name: "database", type: "string", required: true, description: "DB" }], returns: "Query results", icon: "Database" },
  { id: 31, name: "MongoDB", description: "Operaciones MongoDB CRUD", category: "Base de Datos", parameters: [{ name: "collection", type: "string", required: true, description: "Colección" }, { name: "operation", type: "string", required: true, description: "Operación" }, { name: "query", type: "object", required: false, description: "Query" }], returns: "Query results", icon: "Database" },
  { id: 32, name: "Redis", description: "Operaciones Redis (get, set, expire)", category: "Base de Datos", parameters: [{ name: "key", type: "string", required: true, description: "Key" }, { name: "operation", type: "string", required: true, description: "Operación" }, { name: "value", type: "any", required: false, description: "Value" }], returns: "Redis response", icon: "Database" },

  // Categoría 8: Sistema (3)
  { id: 33, name: "System Information", description: "Obtener info del sistema (CPU, RAM, disk)", category: "Sistema", parameters: [{ name: "type", type: "string", required: false, description: "cpu | memory | disk | os" }], returns: "System info", icon: "Cpu" },
  { id: 34, name: "Environment Variables", description: "Gestionar variables de entorno", category: "Sistema", parameters: [{ name: "action", type: "string", required: true, description: "get | set | delete" }, { name: "name", type: "string", required: false, description: "Nombre" }, { name: "value", type: "string", required: false, description: "Valor" }], returns: "Env var value", icon: "Settings" },
  { id: 35, name: "Process Management", description: "Gestionar procesos del sistema", category: "Sistema", parameters: [{ name: "action", type: "string", required: true, description: "list | kill | spawn" }, { name: "pid", type: "number", required: false, description: "PID" }, { name: "signal", type: "string", required: false, description: "Signal" }], returns: "Process info", icon: "Activity" },

  // Categoría 9: Automatización (3)
  { id: 36, name: "Task Scheduler", description: "Programar tareas periódicas", category: "Automatización", parameters: [{ name: "schedule", type: "string", required: true, description: "Cron" }, { name: "task", type: "string", required: true, description: "Tarea" }, { name: "params", type: "object", required: false, description: "Params" }], returns: "Scheduled task ID", icon: "CalendarClock" },
  { id: 37, name: "Workflow Automation", description: "Automatizar flujos multi-step", category: "Automatización", parameters: [{ name: "workflow", type: "object", required: true, description: "Definición" }, { name: "trigger", type: "string", required: true, description: "Trigger" }, { name: "actions", type: "object[]", required: false, description: "Acciones" }], returns: "Workflow result", icon: "Workflow" },
  { id: 38, name: "Notifications", description: "Enviar notificaciones multi-canal", category: "Automatización", parameters: [{ name: "type", type: "string", required: true, description: "email | push | sms" }, { name: "recipient", type: "string", required: true, description: "Destinatario" }, { name: "message", type: "string", required: true, description: "Mensaje" }], returns: "Notification status", icon: "Bell" },

  // Categoría 10: Análisis y Visualización (3)
  { id: 39, name: "Data Analysis", description: "Analizar datos con estadística", category: "Análisis y Visualización", parameters: [{ name: "data", type: "any[]", required: true, description: "Datos" }, { name: "analysis_type", type: "string", required: true, description: "Tipo de análisis" }], returns: "Analysis result", icon: "ChartBar" },
  { id: 40, name: "Visualization", description: "Crear visualizaciones (bar, line, pie, etc.)", category: "Análisis y Visualización", parameters: [{ name: "data", type: "any[]", required: true, description: "Datos" }, { name: "chart_type", type: "string", required: true, description: "Tipo chart" }, { name: "options", type: "object", required: false, description: "Opciones" }], returns: "Chart image/HTML", icon: "ChartLine" },
  { id: 41, name: "Report Generation", description: "Generar reportes formateados", category: "Análisis y Visualización", parameters: [{ name: "data", type: "object", required: true, description: "Datos" }, { name: "template", type: "string", required: true, description: "Plantilla" }, { name: "format", type: "string", required: false, description: "pdf | docx | html" }], returns: "Report file", icon: "FileBarChart" },

  // Categoría 11: Comunicación (2)
  { id: 42, name: "Email", description: "Enviar emails con adjuntos", category: "Comunicación", parameters: [{ name: "to", type: "string", required: true, description: "Destinatario" }, { name: "subject", type: "string", required: true, description: "Asunto" }, { name: "body", type: "string", required: true, description: "Cuerpo" }, { name: "attachments", type: "string[]", required: false, description: "Adjuntos" }], returns: "Email status", icon: "Mail" },
  { id: 43, name: "Chat/Messaging", description: "Enviar mensajes a Slack, Discord, Telegram, WhatsApp", category: "Comunicación", parameters: [{ name: "platform", type: "string", required: true, description: "Plataforma" }, { name: "channel", type: "string", required: true, description: "Canal" }, { name: "message", type: "string", required: true, description: "Mensaje" }], returns: "Message status", icon: "MessageSquare" },

  // Categoría 12: Autenticación (1)
  { id: 44, name: "Authentication", description: "Autenticar usuarios con OAuth/JWT", category: "Autenticación", parameters: [{ name: "provider", type: "string", required: true, description: "Provider" }, { name: "credentials", type: "object", required: true, description: "Credenciales" }], returns: "Auth token", icon: "KeyRound" },

  // Categoría 13: Búsqueda (2)
  { id: 45, name: "Web Search", description: "Buscar en internet", category: "Búsqueda", parameters: [{ name: "query", type: "string", required: true, description: "Query" }, { name: "limit", type: "number", required: false, description: "Límite" }, { name: "language", type: "string", required: false, description: "Idioma" }], returns: "Search results", icon: "Search" },
  { id: 46, name: "Web Scraping", description: "Scraping profundo de sitios web", category: "Búsqueda", parameters: [{ name: "url", type: "string", required: true, description: "URL" }, { name: "selectors", type: "object", required: true, description: "Selectores" }, { name: "depth", type: "number", required: false, description: "Profundidad" }], returns: "Scraped data", icon: "SearchCode" },

  // Categoría 14: Procesamiento de Documentos (2)
  { id: 47, name: "Document Parsing", description: "Parsear PDF, DOCX, XLSX, etc.", category: "Procesamiento de Documentos", parameters: [{ name: "file", type: "string", required: true, description: "Archivo" }, { name: "format", type: "string", required: true, description: "Formato" }, { name: "options", type: "object", required: false, description: "Opciones" }], returns: "Parsed content", icon: "FileParse" },
  { id: 48, name: "Format Conversion", description: "Convertir formatos de archivos", category: "Procesamiento de Documentos", parameters: [{ name: "input", type: "string", required: true, description: "Archivo" }, { name: "from_format", type: "string", required: true, description: "Origen" }, { name: "to_format", type: "string", required: true, description: "Destino" }], returns: "Converted file", icon: "FileOutput" },

  // Categoría 15: Versionamiento (1)
  { id: 49, name: "Git", description: "Operaciones Git (clone, commit, push, etc.)", category: "Versionamiento", parameters: [{ name: "action", type: "string", required: true, description: "Acción" }, { name: "repo", type: "string", required: false, description: "Repo" }, { name: "params", type: "object", required: false, description: "Params" }], returns: "Git result", icon: "GitBranch" },

  // Adicionales (7)
  { id: 50, name: "Project Management", description: "Gestionar proyectos y tareas", category: "Adicionales", parameters: [{ name: "action", type: "string", required: true, description: "Acción" }, { name: "project", type: "string", required: false, description: "Proyecto" }], returns: "Project data", icon: "FolderKanban" },
  { id: 51, name: "Serialization", description: "Serializar datos (JSON, XML, YAML, CSV)", category: "Adicionales", parameters: [{ name: "data", type: "any", required: true, description: "Datos" }, { name: "format", type: "string", required: true, description: "Formato" }], returns: "Serialized data", icon: "Braces" },
  { id: 52, name: "Caching", description: "Gestionar caché de aplicación", category: "Adicionales", parameters: [{ name: "action", type: "string", required: true, description: "Acción" }, { name: "key", type: "string", required: false, description: "Key" }, { name: "value", type: "any", required: false, description: "Value" }], returns: "Cache data", icon: "DatabaseZap" },
  { id: 53, name: "Logging", description: "Logging avanzado con niveles", category: "Adicionales", parameters: [{ name: "level", type: "string", required: true, description: "Nivel" }, { name: "message", type: "string", required: true, description: "Mensaje" }, { name: "context", type: "object", required: false, description: "Contexto" }], returns: "Log entry", icon: "ScrollText" },
  { id: 54, name: "Monitoring", description: "Monitoreo de recursos del sistema", category: "Adicionales", parameters: [{ name: "metric", type: "string", required: true, description: "Métrica" }, { name: "interval", type: "number", required: false, description: "Intervalo s" }], returns: "Monitoring data", icon: "Gauge" },
  { id: 55, name: "Testing", description: "Ejecutar tests unitarios/integración", category: "Adicionales", parameters: [{ name: "framework", type: "string", required: true, description: "Framework" }, { name: "files", type: "string[]", required: false, description: "Archivos" }], returns: "Test results", icon: "FlaskConical" },
  { id: 56, name: "Deployment", description: "Desplegar aplicaciones a producción", category: "Adicionales", parameters: [{ name: "target", type: "string", required: true, description: "Destino" }, { name: "config", type: "object", required: true, description: "Config" }], returns: "Deployment status", icon: "Rocket" },
];

// ====== Tareas de ejemplo ======
const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();
const minsAgo = (m: number) => new Date(now - m * 60_000).toISOString();

export const SAMPLE_TASKS: Task[] = [
  {
    id: "task-001",
    userId: "user-1",
    name: "Análisis de competencia",
    description: "Investigar 5 competidores principales y generar reporte comparativo",
    objective: "Investigar a los 5 principales competidores en el mercado de herramientas de productividad AI, extraer sus features principales, pricing y posicionamiento. Generar un reporte comparativo en PDF con matriz de features y recomendaciones estratégicas.",
    constraints: ["Solo empresas con >$1M ARR", "Mercado: Latam", "Incluir análisis de redes sociales"],
    selectedTools: ["Web Search", "Web Extraction", "Screenshot", "Document Generation", "Data Analysis"],
    status: "completed",
    createdAt: hoursAgo(48),
    startedAt: hoursAgo(48),
    completedAt: hoursAgo(47),
    result: "Reporte comparativo de 24 páginas con matriz de features, pricing tier, análisis de posicionamiento y 12 recomendaciones estratégicas priorizadas.",
    modelUsed: "kimi-k2.7-code",
    tags: ["research", "competitors", "strategy"],
  },
  {
    id: "task-002",
    userId: "user-1",
    name: "Scraping de catálogo e-commerce",
    description: "Extraer 1500 productos con precios e imágenes",
    objective: "Scrapear el catálogo completo de productos de una tienda e-commerce específica, extrayendo nombre, precio, descripción, imágenes, categoría y disponibilidad. Guardar todo en CSV y subir a Google Sheets.",
    selectedTools: ["Web Scraping", "Web Extraction", "File Write", "HTTP Client"],
    status: "completed",
    createdAt: hoursAgo(24),
    startedAt: hoursAgo(24),
    completedAt: hoursAgo(23),
    result: "1500 productos extraídos exitosamente. Archivo CSV de 2.4MB generado. Estadísticas: 47 categorías, precio promedio $89.50, 23% en promoción.",
    modelUsed: "glm-5.2",
    tags: ["scraping", "ecommerce", "data"],
  },
  {
    id: "task-003",
    userId: "user-1",
    name: "Generación de contenido blog",
    description: "Crear 10 artículos SEO sobre IA",
    objective: "Generar 10 artículos de blog optimizados SEO sobre tendencias de IA en 2026. Cada artículo debe tener 1500+ palabras, meta description, keywords, headings H2/H3, y 3 CTAs. Guardar en formato markdown.",
    selectedTools: ["Code Generation", "Web Search", "File Write"],
    status: "completed",
    createdAt: hoursAgo(12),
    startedAt: hoursAgo(12),
    completedAt: hoursAgo(11),
    result: "10 artículos generados con un promedio de 1820 palabras cada uno. Optimización SEO score promedio: 87/100. Incluye meta descriptions, keywords LSI, y estructura jerárquica completa.",
    modelUsed: "qwen3.7-max",
    tags: ["content", "seo", "blog"],
  },
  {
    id: "task-004",
    userId: "user-1",
    name: "Análisis de sentimientos Twitter",
    description: "Procesar 50k tweets sobre marca",
    objective: "Extraer 50,000 tweets mencionando @MiMarca en los últimos 30 días, realizar análisis de sentimientos usando NLP, clasificar por tema, y generar dashboard interactivo con gráficos de tendencia.",
    selectedTools: ["Web Search", "Python Execution", "Data Analysis", "Visualization", "Document Generation"],
    status: "failed",
    createdAt: hoursAgo(6),
    startedAt: hoursAgo(6),
    completedAt: hoursAgo(5),
    error: "Rate limit excedido en API de Twitter después de procesar 12,400 tweets. Reintentar con paginación más lenta.",
    modelUsed: "deepseek-v4-pro",
    tags: ["nlp", "sentiment", "social"],
  },
  {
    id: "task-005",
    userId: "user-1",
    name: "Refactor de código legacy",
    description: "Migrar PHP 5 a TypeScript",
    objective: "Analizar un proyecto legacy en PHP 5 (~15k líneas), generar plan de migración a TypeScript con NestJS, refactorizar módulo por módulo preservando comportamiento, agregar tests unitarios con cobertura >80%.",
    selectedTools: ["File Read", "Code Generation", "Testing", "Git", "Bash/Shell Execution"],
    status: "running",
    createdAt: minsAgo(35),
    startedAt: minsAgo(34),
    modelUsed: "kimi-k2.7-code",
    tags: ["refactor", "migration", "typescript"],
  },
  {
    id: "task-006",
    userId: "user-1",
    name: "Dashboard de ventas Q1",
    description: "Crear dashboard interactivo desde CSV",
    objective: "Generar dashboard interactivo de ventas Q1 2026 a partir de un CSV de 8000 filas. Incluir KPIs principales, gráficos de tendencia, top productos, análisis por región y filtros dinámicos. Exportar como standalone HTML.",
    selectedTools: ["File Read", "Python Execution", "Visualization", "Document Generation"],
    status: "completed",
    createdAt: hoursAgo(72),
    startedAt: hoursAgo(72),
    completedAt: hoursAgo(71),
    result: "Dashboard HTML interactivo generado (1.2MB) con 8 KPIs, 6 gráficos Chart.js, filtros por región/producto/fecha. Total ventas Q1: $4.2M, crecimiento 23% YoY.",
    modelUsed: "qwen3.7-plus",
    tags: ["dashboard", "sales", "visualization"],
  },
  {
    id: "task-007",
    userId: "user-1",
    name: "Newsletter automatizado",
    description: "Generar y enviar newsletter semanal",
    objective: "Recopilar noticias de IA de las últimas 24h de 10 fuentes RSS, generar resumen editorial con 5 highlights, formatear como HTML responsive, y enviar a lista de 1240 suscriptores via SendGrid.",
    selectedTools: ["HTTP Client", "Document Parsing", "Code Generation", "Email", "Notifications"],
    status: "completed",
    createdAt: hoursAgo(96),
    startedAt: hoursAgo(96),
    completedAt: hoursAgo(95),
    result: "Newsletter enviado exitosamente a 1240 suscriptores. Tasa de apertura: 38.2% (vs 24% promedio industria). 47 clics en CTAs.",
    modelUsed: "minimax-m3",
    tags: ["newsletter", "automation", "email"],
  },
];

// ====== Plan de ejecución para task-005 (refactor) ======
export const SAMPLE_EXECUTION: Execution = {
  id: "exec-005",
  taskId: "task-005",
  currentStepIndex: 3,
  status: "running",
  startedAt: minsAgo(34),
  tokensUsed: 45200,
  estimatedCost: 0.42,
  actualCost: 0.31,
  variables: {
    project_path: "/workspace/legacy-app",
    target_lang: "TypeScript",
    framework: "NestJS",
    files_analyzed: "47",
    files_migrated: "12",
    test_coverage: "67%",
  },
  memory: [
    { type: "working", key: "current_module", value: "AuthModule" },
    { type: "working", key: "pending_deps", value: "UserService, JwtStrategy" },
    { type: "episodic", key: "php_pattern_x", value: "Detectado patrón singleton en 8 archivos - refactorizar a providers de NestJS" },
    { type: "semantic", key: "migration_strategy", value: "Estrategia bottom-up: entidades → servicios → controladores → módulos" },
  ],
  errors: [],
  plan: {
    totalEstimatedTime: 180,
    riskFactors: ["Dependencias circulares detectadas", "Código sin tests existentes", "Uso intensivo de globals"],
    steps: [
      {
        id: "step-1",
        stepNumber: 1,
        description: "Análisis estático del código PHP legacy",
        toolName: "File Read",
        toolCategory: "Operaciones de Archivos",
        toolParams: { path: "/workspace/legacy-app", recursive: true },
        status: "completed",
        logs: [
          { id: "l1", timestamp: minsAgo(34), level: "info", message: "Iniciando análisis estático del proyecto" },
          { id: "l2", timestamp: minsAgo(33), level: "info", message: "47 archivos PHP detectados, 14,832 LOC totales" },
          { id: "l3", timestamp: minsAgo(32), level: "warn", message: "8 archivos sin documentación, 3 con syntax deprecated" },
          { id: "l4", timestamp: minsAgo(31), level: "info", message: "Análisis completado: 12 módulos identificados" },
        ],
        startedAt: minsAgo(34),
        completedAt: minsAgo(31),
        duration: 180,
      },
      {
        id: "step-2",
        stepNumber: 2,
        description: "Generar plan de migración módulo por módulo",
        toolName: "Code Generation",
        toolCategory: "Generación de Contenido",
        toolParams: { description: "Plan migración PHP→NestJS", language: "markdown" },
        status: "completed",
        result: "Plan de migración de 47 archivos generado. Orden: Entities → Services → Controllers → Modules. 6 fases estimadas.",
        logs: [
          { id: "l5", timestamp: minsAgo(31), level: "info", message: "Generando plan con kimi-k2.7-code" },
          { id: "l6", timestamp: minsAgo(30), level: "info", message: "Identificadas 23 dependencias, 4 circulares" },
          { id: "l7", timestamp: minsAgo(29), level: "info", message: "Plan generado: 6 fases, ~3h estimadas" },
        ],
        startedAt: minsAgo(31),
        completedAt: minsAgo(29),
        duration: 120,
      },
      {
        id: "step-3",
        stepNumber: 3,
        description: "Refactorizar AuthModule (entidades y servicios)",
        toolName: "Code Generation",
        toolCategory: "Generación de Contenido",
        toolParams: { description: "Migrar AuthModule completo", language: "typescript" },
        status: "running",
        logs: [
          { id: "l8", timestamp: minsAgo(29), level: "info", message: "Iniciando migración de AuthModule" },
          { id: "l9", timestamp: minsAgo(28), level: "info", message: "Generando User entity con TypeORM decorators" },
          { id: "l10", timestamp: minsAgo(27), level: "info", message: "JwtStrategy migrada, compatible con NestJS Passport" },
          { id: "l11", timestamp: minsAgo(25), level: "warn", message: "Función mysql_real_escape_string detectada - reemplazar con parameterized queries" },
          { id: "l12", timestamp: minsAgo(20), level: "info", message: "12/15 archivos de AuthModule migrados" },
        ],
        startedAt: minsAgo(29),
      },
      {
        id: "step-4",
        stepNumber: 4,
        description: "Refactorizar UserService y dependencias",
        toolName: "Code Generation",
        toolCategory: "Generación de Contenido",
        toolParams: { description: "Migrar UserService", language: "typescript" },
        status: "pending",
      },
      {
        id: "step-5",
        stepNumber: 5,
        description: "Generar tests unitarios con Jest",
        toolName: "Testing",
        toolCategory: "Adicionales",
        toolParams: { framework: "jest", coverage_target: 80 },
        status: "pending",
      },
      {
        id: "step-6",
        stepNumber: 6,
        description: "Commit y push al repositorio Git",
        toolName: "Git",
        toolCategory: "Versionamiento",
        toolParams: { action: "commit", message: "refactor: migrate AuthModule to NestJS" },
        status: "pending",
      },
    ],
  },
};

// ====== Estadísticas del dashboard ======
export const DASHBOARD_STATS: DashboardStats = {
  totalTasks: SAMPLE_TASKS.length,
  successRate: 83,
  totalTime: 18420, // seconds
  totalTokens: 1284500,
  totalCost: 12.84,
  activeTasks: 1,
  failedTasks: 1,
};

// ====== Datos de actividad (últimos 7 días) ======
export const ACTIVITY_DATA: ActivityData[] = [
  { date: "Lun", tasks: 3, tokens: 145000, cost: 1.42 },
  { date: "Mar", tasks: 5, tokens: 220000, cost: 2.18 },
  { date: "Mié", tasks: 2, tokens: 98000, cost: 0.94 },
  { date: "Jue", tasks: 7, tokens: 340000, cost: 3.42 },
  { date: "Vie", tasks: 4, tokens: 180000, cost: 1.78 },
  { date: "Sáb", tasks: 1, tokens: 42000, cost: 0.42 },
  { date: "Dom", tasks: 3, tokens: 259500, cost: 2.68 },
];

// =====% Uso de herramientas ======
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

// Distribución de uso de modelos
export const MODEL_USAGE = [
  { name: "Kimi K2.7 Code", value: 32, color: "oklch(0.72 0.17 165)" },
  { name: "GLM-5.2", value: 24, color: "oklch(0.78 0.17 70)" },
  { name: "Qwen3.7 Max", value: 18, color: "oklch(0.7 0.2 280)" },
  { name: "DeepSeek V4 Pro", value: 14, color: "oklch(0.75 0.18 30)" },
  { name: "MiniMax M3", value: 8, color: "oklch(0.7 0.18 200)" },
  { name: "Otros", value: 4, color: "oklch(0.6 0.05 250)" },
];

// ====== Utilidades de formato ======
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
  return `$${n.toFixed(2)}`;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `hace ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  return `hace ${d}d`;
}
