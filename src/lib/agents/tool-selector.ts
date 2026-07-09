/**
 * Tool Selector - Sistema inteligente de selección de herramientas
 * Selecciona automáticamente las mejores herramientas según el tipo de tarea
 * y coordina la ejecución entre agentes
 */

import { toolRegistry } from "./tool-registry";
import type { ExecutionStep, TaskCategory } from "../types";

export interface ToolRecommendation {
  toolName: string;
  confidence: number;
  reason: string;
  agent: "analyzer" | "planner" | "executor" | "verifier" | "optimizer" | "reporter" | "monitor";
  priority: "critical" | "high" | "medium" | "low";
  parameters?: Record<string, unknown>;
}

/**
 * Palabras clave que disparan herramientas específicas
 */
const KEYWORD_TOOL_MAP: Record<string, string[]> = {
  // Búsqueda y Navegación
  "buscar|search|find|google|duckduckgo": ["Web Search", "Web Extraction"],
  "navegar|navigate|ir a|visit|url": ["Browser Navigation", "Web Extraction"],
  "extraer|extract|scrape|scrap": ["Web Extraction", "Web Scraping"],

  // Código y Desarrollo
  "código|code|generar código|generate code|write code|script": ["Code Generation", "File Write"],
  "prueba|test|testing|test suite|unit test": ["Testing", "Bash/Shell Execution"],
  "ejecutar|run|exec|execute": ["Python Execution", "Node.js Execution", "Bash/Shell Execution"],
  "git|github|commit|push|pull": ["Git", "Bash/Shell Execution"],
  "compilar|compile|build|deploy": ["Deployment"],

  // Contenido y Documentos
  "documento|document|artículo|article|reporte|report": ["Document Generation", "Web Search"],
  "presentación|slides|powerpoint|ppt": ["Slide Generation"],
  "imagen|image|foto|photo|visual": ["Image Generation"],

  // Datos y Análisis
  "datos|data|análisis|analysis|estadísticas|statistics": ["Data Analysis", "Visualization"],
  "gráfico|chart|graph|plot": ["Visualization"],

  // Comunicación
  "email|correo|mail|send": ["Email"],
  "mensaje|message|slack|discord|telegram": ["Chat/Messaging"],

  // Automatización
  "programar|schedule|cron|tarea|task|automatizar|automate": ["Cron/Schedule"],
  "webhook|evento|event|listener": ["Webhook Listener"],

  // Gestión de Proyectos
  "tarea|task|proyecto|project|asignar|assign": ["Project Management"],

  // Archivos
  "archivo|file|leer|read|escribir|write": ["File Read", "File Write"],
};

/**
 * Seleccionar herramientas recomendadas basadas en palabras clave
 */
export function selectToolsByKeywords(text: string): ToolRecommendation[] {
  const recommendations: ToolRecommendation[] = [];
  const textLower = text.toLowerCase();

  for (const [keywords, tools] of Object.entries(KEYWORD_TOOL_MAP)) {
    const keywordList = keywords.split("|");
    for (const keyword of keywordList) {
      if (textLower.includes(keyword)) {
        for (const tool of tools) {
          // Evitar duplicados
          if (!recommendations.find((r) => r.toolName === tool)) {
            recommendations.push({
              toolName: tool,
              confidence: 0.8,
              reason: `Detectado por palabra clave: "${keyword}"`,
              agent: getAgentForTool(tool),
              priority: "high",
            });
          }
        }
      }
    }
  }

  return recommendations;
}

/**
 * Seleccionar herramientas basadas en la categoría de tarea
 */
export function selectToolsByCategory(category: TaskCategory): ToolRecommendation[] {
  const categoryToolMap: Record<TaskCategory, ToolRecommendation[]> = {
    research: [
      {
        toolName: "Web Search",
        confidence: 0.95,
        reason: "Herramienta principal para investigación",
        agent: "executor",
        priority: "critical",
      },
      {
        toolName: "Web Extraction",
        confidence: 0.9,
        reason: "Extrae contenido de fuentes encontradas",
        agent: "executor",
        priority: "high",
      },
      {
        toolName: "Data Analysis",
        confidence: 0.7,
        reason: "Analiza datos recopilados",
        agent: "analyzer",
        priority: "medium",
      },
      {
        toolName: "Document Generation",
        confidence: 0.85,
        reason: "Genera informe de investigación",
        agent: "reporter",
        priority: "high",
      },
    ],
    content: [
      {
        toolName: "Web Search",
        confidence: 0.85,
        reason: "Busca información para contenido",
        agent: "executor",
        priority: "high",
      },
      {
        toolName: "Document Generation",
        confidence: 0.95,
        reason: "Genera contenido",
        agent: "reporter",
        priority: "critical",
      },
      {
        toolName: "Image Generation",
        confidence: 0.7,
        reason: "Genera imágenes para contenido",
        agent: "executor",
        priority: "medium",
      },
    ],
    code: [
      {
        toolName: "Code Generation",
        confidence: 0.95,
        reason: "Genera código",
        agent: "executor",
        priority: "critical",
      },
      {
        toolName: "File Write",
        confidence: 0.9,
        reason: "Guarda código generado",
        agent: "executor",
        priority: "high",
      },
      {
        toolName: "Testing",
        confidence: 0.85,
        reason: "Ejecuta pruebas",
        agent: "verifier",
        priority: "high",
      },
      {
        toolName: "Git",
        confidence: 0.8,
        reason: "Versionamiento de código",
        agent: "executor",
        priority: "medium",
      },
    ],
    data: [
      {
        toolName: "Web Search",
        confidence: 0.8,
        reason: "Busca datos",
        agent: "executor",
        priority: "high",
      },
      {
        toolName: "Data Analysis",
        confidence: 0.95,
        reason: "Analiza datos",
        agent: "analyzer",
        priority: "critical",
      },
      {
        toolName: "Visualization",
        confidence: 0.85,
        reason: "Visualiza datos",
        agent: "executor",
        priority: "high",
      },
    ],
    automation: [
      {
        toolName: "Cron/Schedule",
        confidence: 0.9,
        reason: "Programa tareas",
        agent: "planner",
        priority: "high",
      },
      {
        toolName: "HTTP Client",
        confidence: 0.85,
        reason: "Realiza llamadas HTTP",
        agent: "executor",
        priority: "high",
      },
      {
        toolName: "Chat/Messaging",
        confidence: 0.8,
        reason: "Envía mensajes",
        agent: "executor",
        priority: "medium",
      },
    ],
    general: [
      {
        toolName: "Web Search",
        confidence: 0.8,
        reason: "Búsqueda general",
        agent: "executor",
        priority: "high",
      },
      {
        toolName: "Document Generation",
        confidence: 0.75,
        reason: "Generación de contenido",
        agent: "reporter",
        priority: "medium",
      },
    ],
  };

  return categoryToolMap[category] || categoryToolMap.general;
}

/**
 * Seleccionar herramientas basadas en análisis de complejidad
 */
export function selectToolsByComplexity(
  complexity: "simple" | "moderate" | "complex" | "very-complex"
): ToolRecommendation[] {
  const complexityToolMap: Record<string, ToolRecommendation[]> = {
    simple: [
      {
        toolName: "Web Search",
        confidence: 0.9,
        reason: "Búsqueda simple",
        agent: "executor",
        priority: "high",
      },
      {
        toolName: "Document Generation",
        confidence: 0.85,
        reason: "Generación simple",
        agent: "reporter",
        priority: "high",
      },
    ],
    moderate: [
      {
        toolName: "Web Search",
        confidence: 0.9,
        reason: "Búsqueda",
        agent: "executor",
        priority: "high",
      },
      {
        toolName: "Web Extraction",
        confidence: 0.85,
        reason: "Extracción de contenido",
        agent: "executor",
        priority: "high",
      },
      {
        toolName: "Data Analysis",
        confidence: 0.75,
        reason: "Análisis de datos",
        agent: "analyzer",
        priority: "medium",
      },
    ],
    complex: [
      {
        toolName: "Web Search",
        confidence: 0.9,
        reason: "Búsqueda múltiple",
        agent: "executor",
        priority: "high",
      },
      {
        toolName: "Web Extraction",
        confidence: 0.9,
        reason: "Extracción múltiple",
        agent: "executor",
        priority: "high",
      },
      {
        toolName: "Data Analysis",
        confidence: 0.9,
        reason: "Análisis profundo",
        agent: "analyzer",
        priority: "high",
      },
      {
        toolName: "Code Generation",
        confidence: 0.8,
        reason: "Generación de scripts",
        agent: "executor",
        priority: "medium",
      },
    ],
    "very-complex": [
      {
        toolName: "Web Search",
        confidence: 0.9,
        reason: "Búsqueda exhaustiva",
        agent: "executor",
        priority: "critical",
      },
      {
        toolName: "Web Extraction",
        confidence: 0.9,
        reason: "Extracción exhaustiva",
        agent: "executor",
        priority: "critical",
      },
      {
        toolName: "Data Analysis",
        confidence: 0.95,
        reason: "Análisis avanzado",
        agent: "analyzer",
        priority: "critical",
      },
      {
        toolName: "Code Generation",
        confidence: 0.9,
        reason: "Generación de código complejo",
        agent: "executor",
        priority: "high",
      },
      {
        toolName: "Testing",
        confidence: 0.85,
        reason: "Validación exhaustiva",
        agent: "verifier",
        priority: "high",
      },
    ],
  };

  return complexityToolMap[complexity] || complexityToolMap.moderate;
}

/**
 * Combinar múltiples recomendaciones y ordenar por confianza
 */
export function mergeAndRankRecommendations(
  recommendations: ToolRecommendation[][]
): ToolRecommendation[] {
  const merged = new Map<string, ToolRecommendation>();

  for (const group of recommendations) {
    for (const rec of group) {
      const existing = merged.get(rec.toolName);
      if (existing) {
        // Promediar confianza
        existing.confidence = (existing.confidence + rec.confidence) / 2;
        // Usar prioridad más alta
        if (
          ["critical", "high", "medium", "low"].indexOf(rec.priority) <
          ["critical", "high", "medium", "low"].indexOf(existing.priority)
        ) {
          existing.priority = rec.priority;
        }
      } else {
        merged.set(rec.toolName, rec);
      }
    }
  }

  return Array.from(merged.values()).sort((a, b) => {
    // Ordenar por prioridad primero, luego por confianza
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.confidence - a.confidence;
  });
}

/**
 * Obtener el agente responsable de una herramienta
 */
export function getAgentForTool(
  toolName: string
): "analyzer" | "planner" | "executor" | "verifier" | "optimizer" | "reporter" | "monitor" {
  const agentMap: Record<string, "analyzer" | "planner" | "executor" | "verifier" | "optimizer" | "reporter" | "monitor"> = {
    // Analyzer
    "Data Analysis": "analyzer",
    "Web Search": "analyzer",

    // Planner
    "Cron/Schedule": "planner",
    "Project Management": "planner",

    // Executor (la mayoría de herramientas)
    "Browser Navigation": "executor",
    "Web Extraction": "executor",
    "Web Scraping": "executor",
    "Screenshot": "executor",
    "JavaScript Execution": "executor",
    "HTTP Client": "executor",
    "Code Generation": "executor",
    "Document Generation": "executor",
    "Image Generation": "executor",
    "Slide Generation": "executor",
    "File Read": "executor",
    "File Write": "executor",
    "Git": "executor",
    "Python Execution": "executor",
    "Node.js Execution": "executor",
    "Bash/Shell Execution": "executor",
    "Visualization": "executor",
    "Email": "executor",
    "Chat/Messaging": "executor",
    "Webhook Listener": "executor",
    "Skill Execution": "executor",

    // Verifier
    "Testing": "verifier",

    // Reporter
    "Report Generation": "reporter",

    // Monitor
    "Deployment": "monitor",
  };

  return agentMap[toolName] || "executor";
}

/**
 * Validar que una herramienta esté disponible
 */
export function isToolAvailable(toolName: string): boolean {
  return toolRegistry.has(toolName);
}

/**
 * Obtener todas las herramientas disponibles
 */
export function getAvailableTools(): string[] {
  return Array.from(toolRegistry["tools"]?.keys() || []);
}
