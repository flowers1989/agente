/**
 * model-routing.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * ÚNICA FUENTE DE VERDAD para la asignación de modelos OpenCode Go a cada
 * agente y herramienta del sistema.
 *
 * Reglas:
 *  - Nunca leer modelId desde AGENTS[agentType] en runtime; usar esta config.
 *  - El modo se selecciona en el orquestador según la complejidad estimada o
 *    la preferencia explícita del usuario.
 *  - Para añadir un nuevo agente o herramienta, solo modificar este archivo.
 */

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type AgentMode = "economy" | "quality";

export type AgentModelKey =
  | "analyzer"
  | "planner"
  | "executor"
  | "verifier"
  | "optimizer"
  | "reporter"
  | "monitor";

export type ToolModelKey =
  | "codeGeneration"
  | "documentGeneration"
  | "dataAnalysis"
  | "webExtraction"
  | "webSearch";

export interface AgentModelConfig {
  /** Modelo para el modo económico (velocidad + bajo costo). */
  economy: string;
  /** Modelo para el modo calidad (razonamiento + alta precisión). */
  quality: string;
  /** Límite de tokens de salida por defecto para este agente. */
  maxTokens: number;
}

export interface ToolModelConfig {
  /** Modelo asignado a esta herramienta. */
  model: string;
  /** Límite de tokens de salida para esta herramienta. */
  maxTokens: number;
}

// ─── Configuración central ───────────────────────────────────────────────────

/**
 * MODEL_ROUTING
 *
 * Asignación optimizada basada en el análisis técnico de Mexa IA (mexa.mejoras.md).
 * Cada agente tiene un modelo económico (default) y uno de calidad.
 *
 * Costos de referencia (por millón de tokens, input/output):
 *   deepseek-v4-flash  $0.14 / $0.28   — velocidad + costo bajo
 *   mimo-v2.5          $0.14 / $0.28   — velocidad extrema
 *   minimax-m3         $0.10 / $0.40   — mejor relación costo/calidad
 *   qwen3.7-plus       $0.40 / $1.60   — calidad media-alta
 *   qwen3.6-plus       $0.50 / $3.00   — buena escritura
 *   kimi-k2.7-code     $0.95 / $4.00   — coding especializado (recomendado)
 *   glm-5.1            $1.40 / $4.40   — razonamiento avanzado
 *   deepseek-v4-pro    $1.74 / $3.48   — razonamiento complejo, 1M contexto
 */
export const MODEL_ROUTING = {
  agents: {
    /**
     * Analizador: clasifica y extrae entidades. Tarea rápida y ligera.
     * Economy → deepseek-v4-flash  (suficiente para clasificación)
     * Quality → qwen3.7-plus       (mejor comprensión semántica)
     */
    analyzer: {
      economy: "deepseek-v4-flash",
      quality: "qwen3.7-plus",
      maxTokens: 1024,
    },

    /**
     * Planificador: descompone tareas complejas. Requiere razonamiento.
     * Economy → deepseek-v4-flash  (planificación básica)
     * Quality → qwen3.7-plus       (planificación de alto nivel)
     */
    planner: {
      economy: "deepseek-v4-flash",
      quality: "qwen3.7-plus",
      maxTokens: 2048,
    },

    /**
     * Ejecutor: genera código y parámetros de herramientas.
     * Economy → deepseek-v4-flash  (código simple)
     * Quality → kimi-k2.7-code     (modelo especializado en coding)
     */
    executor: {
      economy: "deepseek-v4-flash",
      quality: "kimi-k2.7-code",
      maxTokens: 4096,
    },

    /**
     * Verificador: detecta errores sutiles. Requiere razonamiento avanzado.
     * Economy → deepseek-v4-flash  (verificación básica)
     * Quality → glm-5.1            (razonamiento avanzado, 203K contexto)
     */
    verifier: {
      economy: "deepseek-v4-flash",
      quality: "glm-5.1",
      maxTokens: 2048,
    },

    /**
     * Optimizador: analiza la ejecución completa. Necesita contexto largo.
     * Economy → minimax-m3         (análisis básico, muy económico)
     * Quality → deepseek-v4-pro    (1M contexto, razonamiento complejo)
     */
    optimizer: {
      economy: "minimax-m3",
      quality: "deepseek-v4-pro",
      maxTokens: 4096,
    },

    /**
     * Reportero: genera documentos largos y bien estructurados.
     * Economy → minimax-m3         (reportes simples)
     * Quality → qwen3.6-plus       (calidad de escritura superior)
     */
    reporter: {
      economy: "minimax-m3",
      quality: "qwen3.6-plus",
      maxTokens: 8192,
    },

    /**
     * Monitor: detección de anomalías en tiempo real. Tarea muy ligera.
     * Economy → mimo-v2.5          (velocidad extrema, bajo costo)
     * Quality → mimo-v2.5          (suficiente para monitoreo)
     */
    monitor: {
      economy: "mimo-v2.5",
      quality: "mimo-v2.5",
      maxTokens: 512,
    },
  } satisfies Record<AgentModelKey, AgentModelConfig>,

  tools: {
    /**
     * Generación de código: modelo especializado obligatorio.
     */
    codeGeneration: {
      model: "kimi-k2.7-code",
      maxTokens: 4096,
    },

    /**
     * Generación de documentos: calidad de escritura y coherencia en textos largos.
     */
    documentGeneration: {
      model: "qwen3.7-plus",
      maxTokens: 16384,
    },

    /**
     * Análisis de datos: razonamiento sobre conjuntos complejos.
     */
    dataAnalysis: {
      model: "deepseek-v4-pro",
      maxTokens: 8192,
    },

    /**
     * Extracción web: tarea simple de resumen/extracción.
     */
    webExtraction: {
      model: "mimo-v2.5",
      maxTokens: 2048,
    },

    /**
     * Búsqueda web: generación de queries, tarea ligera.
     */
    webSearch: {
      model: "mimo-v2.5",
      maxTokens: 1024,
    },
  } satisfies Record<ToolModelKey, ToolModelConfig>,
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Devuelve el modelId correcto para un agente según el modo de ejecución.
 *
 * @param agent  - Tipo de agente (e.g. "planner", "executor")
 * @param mode   - "economy" (default) o "quality"
 */
export function getAgentModel(agent: AgentModelKey, mode: AgentMode = "economy"): string {
  return MODEL_ROUTING.agents[agent][mode];
}

/**
 * Devuelve la configuración completa (modelo + maxTokens) para una herramienta.
 *
 * @param tool - Clave de la herramienta (e.g. "codeGeneration")
 */
export function getToolModelConfig(tool: ToolModelKey): ToolModelConfig {
  return MODEL_ROUTING.tools[tool];
}

/**
 * Router dinámico: selecciona el modelo más adecuado según el tipo y
 * complejidad de la subtarea, dentro del catálogo de OpenCode Go.
 *
 * @param taskType   - Tipo de tarea ("code" | "reasoning" | "content" | "search" | "other")
 * @param complexity - Complejidad estimada ("low" | "medium" | "high")
 */
export function selectModelDynamic(
  taskType: "code" | "reasoning" | "content" | "search" | "other",
  complexity: "low" | "medium" | "high"
): string {
  // Tareas de código
  if (taskType === "code") {
    return complexity === "high" ? "kimi-k2.7-code" : "deepseek-v4-flash";
  }

  // Razonamiento y planificación
  if (taskType === "reasoning") {
    if (complexity === "high") return "qwen3.7-plus";
    if (complexity === "medium") return "deepseek-v4-flash";
    return "mimo-v2.5";
  }

  // Generación de contenido largo
  if (taskType === "content") {
    return complexity === "high" ? "qwen3.6-plus" : "minimax-m3";
  }

  // Búsqueda y extracción
  if (taskType === "search") {
    return "mimo-v2.5";
  }

  // Default: balance general
  return "deepseek-v4-flash";
}

/**
 * Costo estimado por tarea según el modo de ejecución.
 * Valores aproximados en USD para una tarea típica de complejidad media.
 */
export const ESTIMATED_COST_PER_TASK: Record<AgentMode, { min: number; max: number }> = {
  economy: { min: 0.01, max: 0.05 },
  quality: { min: 0.10, max: 0.50 },
};
