/**
 * Executor Agent con Loop
 * Versión mejorada del ExecutorAgent que usa el Agent Loop para autonomía
 */

import { BaseAgent } from "./base-agent";
import { executeAgentLoop, type LoopContext } from "./agent-loop";
import { toolRegistry } from "./tool-registry";
import { useMemoryStore } from "../memory/memory-store";
import type { ExecutionStep } from "../types";

export class ExecutorAgentLoop extends BaseAgent {
  constructor() {
    super("executor");
  }

  /**
   * Ejecutar un plan usando el Agent Loop
   * Permite que el agente sea autónomo y se auto-corrija
   */
  async executeWithLoop(
    steps: ExecutionStep[],
    conversationId: string,
    userId: string,
    objective: string
  ): Promise<{ success: boolean; results: unknown[]; loopContext: LoopContext }> {
    console.log(`[ExecutorAgentLoop] Iniciando ejecución con loop para: ${objective}`);

    const results: unknown[] = [];
    let loopContext: LoopContext | null = null;

    try {
      // Ejecutar el loop de autonomía
      loopContext = await executeAgentLoop(conversationId, userId, objective, 10);

      // Guardar contexto del loop en memoria
      useMemoryStore.getState().store(
        "semantic",
        `execution:loop:${conversationId}`,
        JSON.stringify(loopContext),
        {
          conversationId,
          tags: ["execution", "loop"],
          confidence: 1.0,
        }
      );

      // Procesar resultados
      for (const iteration of loopContext.history) {
        if (iteration.observation?.success) {
          results.push(iteration.observation.data || iteration.observation.result);
        }
      }

      return {
        success: loopContext.isComplete,
        results,
        loopContext,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[ExecutorAgentLoop] Error:", message);

      return {
        success: false,
        results,
        loopContext: loopContext || {
          conversationId,
          userId,
          objective,
          maxIterations: 10,
          currentIteration: 0,
          history: [],
          isComplete: false,
          errors: [message],
        },
      };
    }
  }

  /**
   * Ejecutar pasos de manera secuencial (método tradicional)
   */
  async executeSteps(
    steps: ExecutionStep[],
    conversationId: string,
    userId: string
  ): Promise<{ success: boolean; results: unknown[] }> {
    console.log(`[ExecutorAgentLoop] Ejecutando ${steps.length} pasos de manera secuencial`);

    const results: unknown[] = [];
    let lastError: string | null = null;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      try {
        console.log(`[ExecutorAgentLoop] Paso ${i + 1}/${steps.length}: ${step.toolName}`);

        const result = await toolRegistry.execute(step.toolName, step.toolParams, {
          conversationId,
          userId,
          stepId: step.id,
        });

        if (result.success) {
          results.push(result.data || result.result);
          step.status = "completed";
        } else {
          step.status = "failed";
          lastError = result.error;
          console.error(`[ExecutorAgentLoop] Error en paso ${i + 1}: ${result.error}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        step.status = "failed";
        lastError = message;
        console.error(`[ExecutorAgentLoop] Excepción en paso ${i + 1}: ${message}`);
      }
    }

    return {
      success: lastError === null,
      results,
    };
  }

  /**
   * Ejecutar con estrategia híbrida: primero loop, luego pasos
   */
  async executeHybrid(
    objective: string,
    steps: ExecutionStep[],
    conversationId: string,
    userId: string,
    useLoopFirst: boolean = true
  ): Promise<{ success: boolean; results: unknown[]; method: "loop" | "steps" | "hybrid" }> {
    console.log(`[ExecutorAgentLoop] Ejecución híbrida: ${objective}`);

    if (useLoopFirst) {
      // Intentar primero con loop
      const loopResult = await this.executeWithLoop(steps, conversationId, userId, objective);

      if (loopResult.success) {
        return {
          success: true,
          results: loopResult.results,
          method: "loop",
        };
      }

      // Si el loop falla, caer a ejecución de pasos
      console.log("[ExecutorAgentLoop] Loop falló, ejecutando pasos secuenciales...");
      const stepsResult = await this.executeSteps(steps, conversationId, userId);

      return {
        success: stepsResult.success,
        results: stepsResult.results,
        method: "hybrid",
      };
    } else {
      // Ejecutar pasos primero, luego loop si es necesario
      const stepsResult = await this.executeSteps(steps, conversationId, userId);

      if (stepsResult.success) {
        return {
          success: true,
          results: stepsResult.results,
          method: "steps",
        };
      }

      // Si los pasos fallan, intentar con loop
      console.log("[ExecutorAgentLoop] Pasos fallaron, intentando con loop...");
      const loopResult = await this.executeWithLoop(steps, conversationId, userId, objective);

      return {
        success: loopResult.success,
        results: loopResult.results,
        method: "hybrid",
      };
    }
  }

  /**
   * Auto-corregir: si una herramienta falla, intentar con alternativa
   */
  async executeWithAutoCorrection(
    steps: ExecutionStep[],
    conversationId: string,
    userId: string
  ): Promise<{ success: boolean; results: unknown[]; corrections: number }> {
    console.log(`[ExecutorAgentLoop] Ejecutando con auto-corrección`);

    const results: unknown[] = [];
    let corrections = 0;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      let success = false;
      let attempts = 0;
      const maxAttempts = 3;

      while (!success && attempts < maxAttempts) {
        try {
          const result = await toolRegistry.execute(step.toolName, step.toolParams, {
            conversationId,
            userId,
            stepId: step.id,
          });

          if (result.success) {
            results.push(result.data || result.result);
            success = true;
            step.status = "completed";
          } else {
            attempts++;

            if (attempts < maxAttempts) {
              // Intentar con parámetros modificados
              console.log(`[ExecutorAgentLoop] Reintentando paso ${i + 1} (intento ${attempts + 1})`);
              step.toolParams = { ...step.toolParams, retry: true };
              corrections++;
            } else {
              step.status = "failed";
              console.error(`[ExecutorAgentLoop] Paso ${i + 1} falló después de ${maxAttempts} intentos`);
            }
          }
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) {
            step.status = "failed";
            const message = error instanceof Error ? error.message : String(error);
            console.error(`[ExecutorAgentLoop] Excepción en paso ${i + 1}: ${message}`);
          }
        }
      }
    }

    return {
      success: results.length === steps.length,
      results,
      corrections,
    };
  }
}

/**
 * Instancia global del ExecutorAgent con Loop
 */
let executorAgentLoopInstance: ExecutorAgentLoop | null = null;

export function getExecutorAgentLoop(): ExecutorAgentLoop {
  if (!executorAgentLoopInstance) {
    executorAgentLoopInstance = new ExecutorAgentLoop();
  }
  return executorAgentLoopInstance;
}
