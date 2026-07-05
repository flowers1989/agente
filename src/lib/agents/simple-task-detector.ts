"use client";

// ==================== SIMPLE TASK DETECTOR ====================
// Decide si un mensaje de usuario puede responderse directamente
// con un LLM (conversación simple) o requiere el pipeline completo
// de los 7 agentes (tarea compleja).
//
// Criterios de conversación simple:
// - Preguntas conceptuales, explicaciones, definiciones
// - Saludos, despedidas, agradecimientos
// - Solicitudes de opinión, consejo o brainstorming
// - Preguntas sobre capacidades del agente
//
// Criterios de tarea compleja:
// - Requiere acciones externas (navegar, enviar, conectar, subir)
// - Genera artefactos (código, archivos, dashboards, documentos)
// - Procesa datos (CSV, scraping, análisis, visualización)
// - Automatiza flujos (webhooks, schedule, newsletter)
// - Modifica sistemas externos (Git, deploy, base de datos)

export interface DetectionResult {
  isSimple: boolean;
  confidence: number; // 0.0 - 1.0
  reason: string;
  suggestedModel?: string;
}

// Palabras que indican una tarea compleja (requiere herramientas/agentes)
const COMPLEX_KEYWORDS = [
  // Acciones externas
  "investiga", "investigar", "analiza", "analizar", "estudia", "estudiar", "compara", "comparar",
  "reporte", "report", "market", "competidor", "competencia", "research",
  "navega", "navegar", "browser", "web", "scrape", "scraping", "extrae", "extraer",
  "envía", "enviar", "email", "correo", "mensaje", "notificación", "newsletter",
  "conecta", "conectar", "integra", "integrar", "sincroniza", "sincronizar",
  "sube", "subir", "upload", "descarga", "download",
  // Generación de artefactos
  "código", "codigo", "función", "function", "refactor", "refactoriza", "migrar", "migra", "migrate",
  "api", "component", "componente", "bug", "fix", "arregla", "implementa", "implementar",
  "csv", "datos", "data", "dataset", "dashboard", "estadística", "stat", "procesa", "procesar",
  "archivo", "file", "documento", "pdf", "docx", "xlsx",
  "imagen", "video", "audio", "genera", "generar", "crea", "crear", "diseña", "diseñar",
  // Automatización
  "automatiza", "automatizar", "schedule", "webhook", "cron", "recurrente", "automatización",
  "workflow", "flujo", "pipeline",
  // Sistemas externos
  "git", "commit", "push", "deploy", "despliega", "base de datos", "database", "sql", "mongodb",
  "servidor", "server", "terminal", "bash", "shell", "ejecuta", "ejecutar", "run",
  // Compilación multiplataforma
  "compila", "compilar", "compilación", "build", "apk", "exe", "dmg", "app",
  "android", "windows", "linux", "macos", "multiplataforma", "multi-plataforma",
  "instalador", "empaqueta", "empaquetar", "distribuye", "distribuir",

  // Otros
  "test", "testing", "tests", "monitorea", "monitor", "optimiza", "optimizar",
];

// Palabras que indican una conversación simple
const SIMPLE_KEYWORDS = [
  "hola", "buenos días", "buenas tardes", "buenas noches", "hey", "saludos",
  "adiós", "chao", "hasta luego", "nos vemos",
  "gracias", "de nada", "por favor",
  "qué es", "qué son", "qué significa", "qué quiere decir",
  "cómo", "como", "cómo funciona", "cómo se", "cómo puedo",
  "por qué", "porque", "por qué es",
  "explica", "explícame", "explique", "explicar",
  "ayuda", "ayúdame", "ayudame", "puedes ayudarme",
  "dime", "cuéntame", "cuentame", "dame",
  "opinión", "opinas", "qué opinas", "consejo", "recomendación",
  "ejemplo", "ejemplos", "muestra", "muestrame", "muéstrame",
  "capacidades", "puedes hacer", "qué puedes hacer", "quién eres", "qué eres",
];

// Patrones de frases completas que son simples
const SIMPLE_PATTERNS = [
  /^hola[\s\p{P}]*$/iu,
  /^hey[\s\p{P}]*$/iu,
  /^saludos[\s\p{P}]*$/iu,
  /^gracias[\s\p{P}]*$/iu,
  /^adi[óo]s[\s\p{P}]*$/iu,
  /^chao[\s\p{P}]*$/iu,
  /^buenos d[ií]as[\s\p{P}]*$/iu,
  /^buenas tardes[\s\p{P}]*$/iu,
  /^buenas noches[\s\p{P}]*$/iu,
  /^qué tal[\s\p{P}]*$/iu,
  /^cómo est[áa]s[\s\p{P}]*$/iu,
];

export function detectSimpleTask(message: string): DetectionResult {
  const normalized = message.trim().toLowerCase();

  // 1. Verificar patrones exactos simples
  if (SIMPLE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return {
      isSimple: true,
      confidence: 0.98,
      reason: "Patrón de saludo/despedida/agradecimiento detectado",
    };
  }

  // 2. Contar palabras clave simples y complejas
  const simpleMatches = SIMPLE_KEYWORDS.filter((kw) => normalized.includes(kw));
  const complexMatches = COMPLEX_KEYWORDS.filter((kw) => normalized.includes(kw));

  // 3. Si hay palabras complejas, es tarea compleja (con alta confianza)
  if (complexMatches.length > 0) {
    return {
      isSimple: false,
      confidence: Math.min(0.6 + complexMatches.length * 0.1, 0.95),
      reason: `Palabras de acción detectadas: ${complexMatches.slice(0, 3).join(", ")}`,
    };
  }

  // 4. Si hay palabras simples y no hay complejas, es conversación simple
  if (simpleMatches.length > 0) {
    return {
      isSimple: true,
      confidence: Math.min(0.7 + simpleMatches.length * 0.08, 0.92),
      reason: `Pregunta/concepto detectado: ${simpleMatches.slice(0, 3).join(", ")}`,
    };
  }

  // 5. Heurística por longitud y estructura
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  const questionMarks = (normalized.match(/\?/g) || []).length;
  const isQuestion = questionMarks > 0 || normalized.startsWith("qué") || normalized.startsWith("cómo") || normalized.startsWith("por qué") || normalized.startsWith("cuál");

  if (isQuestion && wordCount <= 20) {
    return {
      isSimple: true,
      confidence: 0.75,
      reason: "Pregunta corta sin palabras de acción externa",
    };
  }

  if (wordCount <= 5) {
    return {
      isSimple: true,
      confidence: 0.65,
      reason: "Mensaje muy corto, probablemente conversacional",
    };
  }

  // Por defecto, tratar como compleja si no hay señales claras de simple
  return {
    isSimple: false,
    confidence: 0.55,
    reason: "No se detectaron señales claras de conversación simple",
  };
}

// Helper para saber si debemos usar respuesta directa
export function shouldAnswerDirectly(message: string, apiKeyConfigured: boolean): boolean {
  const detection = detectSimpleTask(message);
  // Si no hay API key, no podemos responder directamente con LLM real
  // pero de todos modos devolvemos true si es simple, para usar el modo simulado
  return detection.isSimple && detection.confidence > 0.6;
}
