/**
 * Model Selector
 * Sistema inteligente que selecciona el mejor modelo LLM según la complejidad de la tarea
 * Optimiza velocidad, costo y calidad automáticamente
 */

import type { AIModel } from "../types";

export interface TaskComplexityAnalysis {
  taskType: "web" | "mobile" | "desktop" | "data-analysis" | "content-generation" | "code-review";
  complexity: "low" | "medium" | "high" | "ultra-high";
  estimatedTokens: number;
  requiresReasoning: boolean;
  requiresCode: boolean;
  requiresCreativity: boolean;
  timeConstraint: "realtime" | "normal" | "flexible";
  qualityRequirement: "draft" | "production" | "premium";
}

export interface ModelRecommendation {
  modelId: string;
  modelName: string;
  reason: string;
  score: number;
  estimatedCost: number;
  estimatedSpeed: number;
  estimatedQuality: number;
}

/**
 * Catálogo de modelos disponibles
 */
const MODEL_CATALOG: Record<string, AIModel> = {
  "glm-5.2": {
    id: "glm-5.2",
    name: "GLM-5.2",
    context: "1.0M",
    costInput: 1.4,
    costOutput: 4.4,
    specialty: "Razonamiento avanzado",
    badge: "premium",
  },
  "glm-5.1": {
    id: "glm-5.1",
    name: "GLM-5.1",
    context: "203K",
    costInput: 1.4,
    costOutput: 4.4,
    specialty: "Razonamiento avanzado",
  },
  "kimi-k2.7-code": {
    id: "kimi-k2.7-code",
    name: "Kimi K2.7 Code",
    context: "262K",
    costInput: 0.95,
    costOutput: 4.0,
    specialty: "Coding especializado",
    badge: "recommended",
  },
  "kimi-k2.6": {
    id: "kimi-k2.6",
    name: "Kimi K2.6",
    context: "262K",
    costInput: 0.95,
    costOutput: 4.0,
    specialty: "Coding general",
  },
  "deepseek-v4-pro": {
    id: "deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    context: "1.0M",
    costInput: 1.74,
    costOutput: 3.48,
    specialty: "Razonamiento complejo",
  },
  "deepseek-v4-flash": {
    id: "deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
    context: "1.0M",
    costInput: 0.14,
    costOutput: 0.28,
    specialty: "Velocidad + costo bajo",
    badge: "fast",
  },
  "mimo-v2.5": {
    id: "mimo-v2.5",
    name: "MiMo-V2.5",
    context: "1.0M",
    costInput: 0.14,
    costOutput: 0.28,
    specialty: "Velocidad extrema",
    badge: "cheap",
  },
  "mimo-v2.5-pro": {
    id: "mimo-v2.5-pro",
    name: "MiMo-V2.5-Pro",
    context: "1.0M",
    costInput: 1.74,
    costOutput: 3.48,
    specialty: "Calidad + velocidad",
  },
  "minimax-m3": {
    id: "minimax-m3",
    name: "MiniMax M3",
    context: "1.0M",
    costInput: 0.1,
    costOutput: 0.4,
    specialty: "Mejor relación costo/calidad",
    badge: "cheap",
  },
  "minimax-m2.7": {
    id: "minimax-m2.7",
    name: "MiniMax M2.7",
    context: "205K",
    costInput: 0.3,
    costOutput: 1.2,
    specialty: "Coding balanceado",
  },
  "qwen3.7-max": {
    id: "qwen3.7-max",
    name: "Qwen3.7 Max",
    context: "1.0M",
    costInput: 2.5,
    costOutput: 7.5,
    specialty: "Máxima calidad",
    badge: "premium",
  },
  "qwen3.7-plus": {
    id: "qwen3.7-plus",
    name: "Qwen3.7 Plus",
    context: "1.0M",
    costInput: 0.4,
    costOutput: 1.6,
    specialty: "Calidad media-alta",
  },
  "qwen3.6-plus": {
    id: "qwen3.6-plus",
    name: "Qwen3.6 Plus",
    context: "1.0M",
    costInput: 0.5,
    costOutput: 3.0,
    specialty: "Calidad media",
  },
};

/**
 * Selector inteligente de modelos
 */
export class ModelSelector {
  /**
   * Analizar la complejidad de una tarea
   */
  static analyzeTaskComplexity(
    taskDescription: string,
    taskType: TaskComplexityAnalysis["taskType"]
  ): TaskComplexityAnalysis {
    const lowerDesc = taskDescription.toLowerCase();

    // Detectar características de la tarea
    const requiresReasoning =
      lowerDesc.includes("analizar") ||
      lowerDesc.includes("investigar") ||
      lowerDesc.includes("evaluar") ||
      lowerDesc.includes("comparar") ||
      lowerDesc.includes("optimizar");

    const requiresCode =
      lowerDesc.includes("código") ||
      lowerDesc.includes("programa") ||
      lowerDesc.includes("función") ||
      lowerDesc.includes("aplicación") ||
      lowerDesc.includes("sitio web") ||
      lowerDesc.includes("api");

    const requiresCreativity =
      lowerDesc.includes("diseño") ||
      lowerDesc.includes("interfaz") ||
      lowerDesc.includes("ui") ||
      lowerDesc.includes("ux") ||
      lowerDesc.includes("crear") ||
      lowerDesc.includes("generar");

    // Estimar tokens
    const estimatedTokens = Math.min(
      taskDescription.length * 0.25 + (requiresCode ? 2000 : 0) + (requiresReasoning ? 1000 : 0),
      100000
    );

    // Determinar complejidad
    let complexity: TaskComplexityAnalysis["complexity"] = "low";
    if (requiresCode && requiresReasoning && requiresCreativity) {
      complexity = "ultra-high";
    } else if (requiresCode && (requiresReasoning || requiresCreativity)) {
      complexity = "high";
    } else if (requiresCode || requiresReasoning || requiresCreativity) {
      complexity = "medium";
    }

    return {
      taskType,
      complexity,
      estimatedTokens,
      requiresReasoning,
      requiresCode,
      requiresCreativity,
      timeConstraint: "normal",
      qualityRequirement: "production",
    };
  }

  /**
   * Seleccionar el mejor modelo para una tarea
   */
  static selectBestModel(analysis: TaskComplexityAnalysis): ModelRecommendation {
    const recommendations = this.rankModels(analysis);
    return recommendations[0]; // Retornar el mejor
  }

  /**
   * Rankear todos los modelos disponibles para una tarea
   */
  static rankModels(analysis: TaskComplexityAnalysis): ModelRecommendation[] {
    const recommendations: ModelRecommendation[] = [];

    for (const [modelId, model] of Object.entries(MODEL_CATALOG)) {
      const score = this.calculateModelScore(model, analysis);
      const estimatedCost = this.estimateCost(model, analysis);
      const estimatedSpeed = this.estimateSpeed(model);
      const estimatedQuality = this.estimateQuality(model);

      recommendations.push({
        modelId,
        modelName: model.name,
        reason: this.generateReason(model, analysis),
        score,
        estimatedCost,
        estimatedSpeed,
        estimatedQuality,
      });
    }

    // Ordenar por score descendente
    return recommendations.sort((a, b) => b.score - a.score);
  }

  /**
   * Calcular score de un modelo para una tarea
   */
  private static calculateModelScore(model: AIModel, analysis: TaskComplexityAnalysis): number {
    let score = 0;

    // Puntos base según specialty
    if (analysis.requiresCode && model.specialty.includes("Coding")) {
      score += 30;
    }
    if (analysis.requiresReasoning && model.specialty.includes("Razonamiento")) {
      score += 25;
    }
    if (analysis.requiresCreativity && model.specialty.includes("Calidad")) {
      score += 20;
    }

    // Puntos según complejidad
    switch (analysis.complexity) {
      case "low":
        // Preferir modelos rápidos y baratos
        if (model.specialty.includes("Velocidad")) score += 15;
        if (model.costInput < 0.5) score += 10;
        break;
      case "medium":
        // Balance entre costo y calidad
        if (model.specialty.includes("balanceado")) score += 15;
        if (model.costInput < 1.0) score += 5;
        break;
      case "high":
        // Preferir modelos de calidad
        if (model.specialty.includes("calidad")) score += 20;
        if (model.badge === "recommended") score += 15;
        break;
      case "ultra-high":
        // Preferir modelos premium
        if (model.badge === "premium") score += 30;
        if (model.specialty.includes("Máxima")) score += 25;
        break;
    }

    // Puntos según tiempo
    if (analysis.timeConstraint === "realtime") {
      if (model.specialty.includes("Velocidad")) score += 20;
    }

    // Puntos según contexto disponible
    const contextSize = parseInt(model.context);
    if (analysis.estimatedTokens > 50000 && contextSize >= 1000000) {
      score += 10;
    }

    return score;
  }

  /**
   * Estimar costo de una tarea con un modelo
   */
  private static estimateCost(model: AIModel, analysis: TaskComplexityAnalysis): number {
    const inputTokens = analysis.estimatedTokens * 0.3; // 30% input
    const outputTokens = analysis.estimatedTokens * 0.7; // 70% output

    const inputCost = (inputTokens / 1000) * model.costInput;
    const outputCost = (outputTokens / 1000) * model.costOutput;

    return inputCost + outputCost;
  }

  /**
   * Estimar velocidad de un modelo (1-10)
   */
  private static estimateSpeed(model: AIModel): number {
    if (model.specialty.includes("Velocidad extrema")) return 10;
    if (model.specialty.includes("Velocidad")) return 8;
    if (model.specialty.includes("flash")) return 9;
    if (model.specialty.includes("cheap")) return 7;
    return 5;
  }

  /**
   * Estimar calidad de un modelo (1-10)
   */
  private static estimateQuality(model: AIModel): number {
    if (model.badge === "premium") return 10;
    if (model.specialty.includes("Máxima")) return 9;
    if (model.specialty.includes("Razonamiento avanzado")) return 9;
    if (model.specialty.includes("especializado")) return 8;
    if (model.specialty.includes("balanceado")) return 7;
    if (model.specialty.includes("Velocidad")) return 5;
    return 6;
  }

  /**
   * Generar explicación del por qué se recomienda un modelo
   */
  private static generateReason(model: AIModel, analysis: TaskComplexityAnalysis): string {
    const reasons: string[] = [];

    if (analysis.requiresCode && model.specialty.includes("Coding")) {
      reasons.push("Especializado en código");
    }
    if (analysis.requiresReasoning && model.specialty.includes("Razonamiento")) {
      reasons.push("Excelente para razonamiento");
    }
    if (analysis.complexity === "ultra-high" && model.badge === "premium") {
      reasons.push("Premium para tareas complejas");
    }
    if (analysis.timeConstraint === "realtime" && model.specialty.includes("Velocidad")) {
      reasons.push("Optimizado para velocidad");
    }
    if (analysis.complexity === "low" && model.costInput < 0.5) {
      reasons.push("Costo-efectivo");
    }

    return reasons.length > 0 ? reasons.join(" + ") : "Buen balance general";
  }

  /**
   * Obtener recomendación según prioridad del usuario
   */
  static selectByPriority(
    analysis: TaskComplexityAnalysis,
    priority: "speed" | "cost" | "quality" | "balanced"
  ): ModelRecommendation {
    const recommendations = this.rankModels(analysis);

    switch (priority) {
      case "speed":
        return recommendations.sort((a, b) => b.estimatedSpeed - a.estimatedSpeed)[0];
      case "cost":
        return recommendations.sort((a, b) => a.estimatedCost - b.estimatedCost)[0];
      case "quality":
        return recommendations.sort((a, b) => b.estimatedQuality - a.estimatedQuality)[0];
      case "balanced":
      default:
        return recommendations[0]; // Ya está ordenado por score general
    }
  }

  /**
   * Generar reporte de selección de modelo
   */
  static generateSelectionReport(analysis: TaskComplexityAnalysis): string {
    const best = this.selectBestModel(analysis);
    const alternatives = this.rankModels(analysis).slice(1, 4);

    let report = `# Reporte de Selección de Modelo\n\n`;
    report += `## Análisis de Tarea\n`;
    report += `- **Tipo**: ${analysis.taskType}\n`;
    report += `- **Complejidad**: ${analysis.complexity}\n`;
    report += `- **Tokens Estimados**: ${analysis.estimatedTokens.toLocaleString()}\n`;
    report += `- **Requiere Razonamiento**: ${analysis.requiresReasoning ? "Sí" : "No"}\n`;
    report += `- **Requiere Código**: ${analysis.requiresCode ? "Sí" : "No"}\n`;
    report += `- **Requiere Creatividad**: ${analysis.requiresCreativity ? "Sí" : "No"}\n\n`;

    report += `## Modelo Recomendado\n`;
    report += `**${best.modelName}** (${best.modelId})\n`;
    report += `- **Razón**: ${best.reason}\n`;
    report += `- **Score**: ${best.score.toFixed(1)}/100\n`;
    report += `- **Costo Estimado**: $${best.estimatedCost.toFixed(4)}\n`;
    report += `- **Velocidad**: ${best.estimatedSpeed}/10\n`;
    report += `- **Calidad**: ${best.estimatedQuality}/10\n\n`;

    report += `## Alternativas\n`;
    for (const alt of alternatives) {
      report += `- **${alt.modelName}**: ${alt.reason} (Score: ${alt.score.toFixed(1)})\n`;
    }

    return report;
  }
}

/**
 * Hook para usar el selector de modelos
 */
export function useModelSelector() {
  return {
    analyzeTaskComplexity: ModelSelector.analyzeTaskComplexity,
    selectBestModel: ModelSelector.selectBestModel,
    rankModels: ModelSelector.rankModels,
    selectByPriority: ModelSelector.selectByPriority,
    generateSelectionReport: ModelSelector.generateSelectionReport,
  };
}
