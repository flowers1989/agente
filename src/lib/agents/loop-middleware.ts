/**
 * Loop Middleware
 * Integra el Agent Loop en el flujo de ejecución de tareas
 * Permite que los agentes decidan automáticamente si usar loop o ejecución tradicional
 */

import { getExecutorAgentLoop } from "./executor-agent-loop-loop";
import { getVerifierAgentLoop } from "./verifier-agent-loop";
import type { ExecutionPlan, ExecutionStep } from "../types";
import { useMemoryStore } from "../memory/memory-store";

export interface LoopDecision {
  useLoop: boolean;
  reason: string;
  confidence: number;
  strategy: "loop" | "steps" | "hybrid" | "auto-correct";
}

/**
 * Middleware que decide si usar loop o ejecución tradicional
 */
export class LoopMiddleware {
  /**
   * Analizar un plan y decidir si usar loop
   */
  static analyzeAndDecide(plan: ExecutionPlan, objective: string): LoopDecision {
    // Criterios para usar loop
    const complexity = plan.steps.length > 5 ? "high" : plan.steps.length > 2 ? "medium" : "low";
    const hasUnknownOutcomes = plan.steps.some((s) => !s.toolParams || Object.keys(s.toolParams).length === 0);
    const hasConditionalSteps = plan.steps.some((s) => s.dependencies && s.dependencies.length > 1);
    const hasRiskyTools = plan.steps.some((s) => ["Testing", "Deployment", "Code Generation"].includes(s.toolName));

    // Lógica de decisión
    if (complexity === "high" && (hasUnknownOutcomes || hasConditionalSteps)) {
      return {
        useLoop: true,
        reason: "Plan complejo con múltiples dependencias y resultados inciertos",
        confidence: 0.9,
        strategy: "loop",
      };
    }

    if (hasRiskyTools) {
      return {
        useLoop: true,
        reason: "Plan contiene herramientas de riesgo que requieren validación iterativa",
        confidence: 0.85,
        strategy: "hybrid",
      };
    }

    if (complexity === "high") {
      return {
        useLoop: true,
        reason: "Plan de alta complejidad requiere autonomía",
        confidence: 0.8,
        strategy: "loop",
      };
    }

    if (complexity === "medium" && hasUnknownOutcomes) {
      return {
        useLoop: true,
        reason: "Complejidad media con resultados inciertos",
        confidence: 0.7,
        strategy: "auto-correct",
      };
    }

    return {
      useLoop: false,
      reason: "Plan simple - ejecución secuencial suficiente",
      confidence: 0.95,
      strategy: "steps",
    };
  }

  /**
   * Preparar el plan para ejecución con loop
   */
  static prepareForLoop(plan: ExecutionPlan, objective: string): ExecutionPlan {
    // Enriquecer pasos con información adicional para el loop
    const enrichedSteps = plan.steps.map((step, index) => ({
      ...step,
      loopMetadata: {
        stepIndex: index,
        isRetryable: true,
        maxRetries: 3,
        timeoutMs: 30000,
        priority: this.calculatePriority(step, index, plan.steps.length),
      },
    }));

    return {
      ...plan,
      steps: enrichedSteps,
    };
  }

  /**
   * Calcular prioridad de un paso
   */
  private static calculatePriority(step: ExecutionStep, index: number, totalSteps: number): "critical" | "high" | "medium" | "low" {
    // Pasos iniciales y finales son críticos
    if (index === 0 || index === totalSteps - 1) {
      return "critical";
    }

    // Pasos con muchas dependencias son críticos
    if (step.dependencies && step.dependencies.length > 2) {
      return "critical";
    }

    // Pasos que generan datos son altos
    if (step.produces === "data" || step.produces === "files") {
      return "high";
    }

    // Pasos de validación son altos
    if (step.toolName.includes("Test") || step.toolName.includes("Verif")) {
      return "high";
    }

    return "medium";
  }

  /**
   * Integrar verificación en el flujo
   */
  static integrateVerification(plan: ExecutionPlan): ExecutionPlan {
    // Añadir pasos de verificación después de pasos críticos
    const stepsWithVerification: ExecutionStep[] = [];

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      stepsWithVerification.push(step);

      // Añadir verificación después de pasos críticos
      if (
        step.toolName.includes("Code Generation") ||
        step.toolName.includes("Deployment") ||
        step.toolName.includes("Testing")
      ) {
        stepsWithVerification.push({
          id: `verify-${step.id}`,
          stepNumber: i + 0.5,
          description: `Verificar resultado de: ${step.description}`,
          toolName: "Verification",
          toolCategory: "Validación",
          toolParams: { targetStep: step.id },
          status: "pending",
          logs: [],
          produces: "output",
          agent: "verifier",
          modelUsed: "deepseek-v4-flash",
          dependencies: [i],
          duration: 15,
        });
      }
    }

    return {
      ...plan,
      steps: stepsWithVerification,
    };
  }

  /**
   * Crear un plan de recuperación para errores
   */
  static createRecoveryPlan(failedStep: ExecutionStep, originalPlan: ExecutionPlan): ExecutionPlan {
    const recoverySteps: ExecutionStep[] = [];

    // Paso 1: Diagnosticar el error
    recoverySteps.push({
      id: `diagnose-${failedStep.id}`,
      stepNumber: 1,
      description: `Diagnosticar error en: ${failedStep.description}`,
      toolName: "Data Analysis",
      toolCategory: "Análisis",
      toolParams: { errorContext: failedStep },
      status: "pending",
      logs: [],
      produces: "data",
      agent: "analyzer",
      modelUsed: "deepseek-v4-flash",
      dependencies: [],
      duration: 10,
    });

    // Paso 2: Seleccionar herramienta alternativa
    recoverySteps.push({
      id: `alternative-${failedStep.id}`,
      stepNumber: 2,
      description: `Ejecutar con herramienta alternativa`,
      toolName: "Code Generation", // Herramienta más flexible
      toolCategory: "Generación",
      toolParams: { ...failedStep.toolParams, fallback: true },
      status: "pending",
      logs: [],
      produces: failedStep.produces,
      agent: "executor",
      modelUsed: "deepseek-v4-flash",
      dependencies: [0],
      duration: 20,
    });

    // Paso 3: Verificar resultado alternativo
    recoverySteps.push({
      id: `verify-recovery-${failedStep.id}`,
      stepNumber: 3,
      description: `Verificar resultado de recuperación`,
      toolName: "Testing",
      toolCategory: "Validación",
      toolParams: { targetStep: `alternative-${failedStep.id}` },
      status: "pending",
      logs: [],
      produces: "output",
      agent: "verifier",
      modelUsed: "deepseek-v4-flash",
      dependencies: [1],
      duration: 15,
    });

    return {
      steps: recoverySteps,
      totalEstimatedTime: 45,
      riskFactors: ["Recuperación de error", "Herramienta alternativa"],
    };
  }

  /**
   * Guardar decisión del loop en memoria
   */
  static saveLoopDecision(decision: LoopDecision, conversationId: string, objective: string): void {
    useMemoryStore.getState().store(
      "semantic",
      `loop:decision:${conversationId}`,
      JSON.stringify({
        decision,
        objective,
        timestamp: new Date().toISOString(),
      }),
      {
        conversationId,
        tags: ["loop", "decision"],
        confidence: decision.confidence,
      }
    );
  }

  /**
   * Obtener historial de decisiones del loop
   */
  static getLoopDecisionHistory(conversationId: string): LoopDecision[] {
    const memory = useMemoryStore.getState();
    const context = memory.getRelevantContext(`loop:decision:${conversationId}`);

    return context.similarTasks.map((task) => {
      try {
        return JSON.parse(task.value).decision;
      } catch {
        return null;
      }
    }).filter((d) => d !== null);
  }
}

/**
 * Hook para usar el middleware en componentes
 */
export function useLoopMiddleware() {
  return {
    analyzeAndDecide: LoopMiddleware.analyzeAndDecide,
    prepareForLoop: LoopMiddleware.prepareForLoop,
    integrateVerification: LoopMiddleware.integrateVerification,
    createRecoveryPlan: LoopMiddleware.createRecoveryPlan,
    saveLoopDecision: LoopMiddleware.saveLoopDecision,
    getLoopDecisionHistory: LoopMiddleware.getLoopDecisionHistory,
  };
}
