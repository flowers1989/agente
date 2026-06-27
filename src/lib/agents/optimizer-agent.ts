"use client";

import { BaseAgent } from "./base-agent";
import type { Execution } from "../types";

// ==================== AGENTE 5: OPTIMIZADOR ====================
// Modelo: MiniMax M3 (relación costo/calidad)
//
// Responsabilidad:
// - Analizar ejecución completada
// - Identificar cuellos de botella (pasos lentos, costosos, innecesarios)
// - Generar sugerencias específicas de optimización
// - Estimar ahorros potenciales
//
// Lee: Working Memory (ejecución completa) + Episodic + Semantic
// Escribe: Semantic Memory (sugerencias de optimización aprendidas)

export interface OptimizationSuggestion {
  title: string;
  description: string;
  timeReduction: string;
  costReduction: string;
  implementation: string;
}

export interface OptimizationResult {
  suggestions: OptimizationSuggestion[];
  savings: {
    timeReduction: string;
    costReduction: string;
  };
}

export class OptimizerAgent extends BaseAgent {
  constructor() {
    super("optimizer");
  }

  async optimizeExecution(execution: Execution, conversationId: string): Promise<OptimizationResult> {
    // 1. Analizar ejecución
    // En producción: const analysis = await this.callLLM(prompt);
    const bottlenecks = this.identifyBottlenecks(execution);

    // 2. Generar sugerencias
    const suggestions = bottlenecks.map((b) => this.generateSuggestion(b));

    // 3. Calcular ahorros estimados
    const savings = this.estimateSavings(suggestions);

    // 4. Guardar en semantic memory para aprender
    suggestions.forEach((s) => {
      this.storeInMemory("semantic", `optimization:${Date.now()}:${Math.random().toString(36).slice(2, 6)}`, `${s.title}: ${s.description}`, {
        confidence: 0.7,
        tags: ["optimization", "suggestion"],
      });
    });

    // 5. Emitir evento
    this.emit("optimization:suggested", { conversationId, suggestions, savings });

    return { suggestions, savings };
  }

  private identifyBottlenecks(execution: Execution): { type: string; stepIndex: number; description: string }[] {
    const bottlenecks: { type: string; stepIndex: number; description: string }[] = [];

    execution.plan.steps.forEach((step, i) => {
      // Pasos lentos (>30s)
      if (step.duration && step.duration > 30) {
        bottlenecks.push({
          type: "slow",
          stepIndex: i,
          description: `Paso ${i + 1} (${step.toolName}) tardó ${step.duration}s`,
        });
      }

      // Pasos que usan modelos caros
      if (step.modelUsed === "qwen3.7-max" || step.modelUsed === "glm-5.2") {
        bottlenecks.push({
          type: "expensive_model",
          stepIndex: i,
          description: `Paso ${i + 1} usa modelo costoso (${step.modelUsed})`,
        });
      }
    });

    return bottlenecks;
  }

  private generateSuggestion(bottleneck: { type: string; stepIndex: number; description: string }): OptimizationSuggestion {
    if (bottleneck.type === "slow") {
      return {
        title: "Usar modelo más rápido",
        description: `Cambiar a DeepSeek V4 Flash o MiMo-V2.5 para el paso ${bottleneck.stepIndex + 1}`,
        timeReduction: "40%",
        costReduction: "60%",
        implementation: "Cambiar modelo en la configuración del paso",
      };
    }

    if (bottleneck.type === "expensive_model") {
      return {
        title: "Modelo más económico",
        description: `Considerar MiniMax M3 para el paso ${bottleneck.stepIndex + 1}`,
        timeReduction: "10%",
        costReduction: "70%",
        implementation: "Cambiar modelo en la configuración del paso",
      };
    }

    return {
      title: "Optimización general",
      description: bottleneck.description,
      timeReduction: "15%",
      costReduction: "20%",
      implementation: "Revisar configuración",
    };
  }

  private estimateSavings(suggestions: OptimizationSuggestion[]): { timeReduction: string; costReduction: string } {
    const totalTimeReduction = suggestions.reduce((acc, s) => acc + parseInt(s.timeReduction) || 0, 0);
    const totalCostReduction = suggestions.reduce((acc, s) => acc + parseInt(s.costReduction) || 0, 0);

    return {
      timeReduction: suggestions.length > 0 ? `${Math.floor(totalTimeReduction / suggestions.length)}% promedio` : "0%",
      costReduction: suggestions.length > 0 ? `${Math.floor(totalCostReduction / suggestions.length)}% promedio` : "0%",
    };
  }
}
