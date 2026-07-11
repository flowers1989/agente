/**
 * Error Recovery System
 * Sistema inteligente de recuperación de errores con auto-corrección
 */

import { getAdapter } from "./opencode-adapter";
import { toolRegistry } from "./tool-registry";
import { useMemoryStore } from "../memory/memory-store";

export interface ErrorContext {
  errorType: "timeout" | "invalid-params" | "tool-not-found" | "execution-failed" | "validation-failed" | "unknown";
  errorMessage: string;
  toolName: string;
  parameters: Record<string, unknown>;
  timestamp: string;
  attemptNumber: number;
}

export interface RecoveryStrategy {
  name: string;
  description: string;
  priority: number; // 1-10, mayor es mejor
  execute: (context: ErrorContext) => Promise<{ success: boolean; result?: unknown; newParams?: Record<string, unknown> }>;
}

export interface RecoveryResult {
  recovered: boolean;
  strategy: string;
  newParams?: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

/**
 * Sistema de recuperación de errores
 */
export class ErrorRecovery {
  private strategies: Map<string, RecoveryStrategy> = new Map();
  private memory = useMemoryStore.getState();

  constructor() {
    this.registerDefaultStrategies();
  }

  /**
   * Registrar estrategias de recuperación por defecto
   */
  private registerDefaultStrategies(): void {
    // Estrategia 1: Retry con parámetros idénticos
    this.register("retry-same", {
      name: "Reintentar con parámetros idénticos",
      description: "Reintenta la herramienta con los mismos parámetros",
      priority: 3,
      execute: async (context) => {
        if (context.attemptNumber > 2) {
          return { success: false };
        }

        try {
          const result = await toolRegistry.execute(context.toolName, context.parameters, {
            conversationId: "recovery",
            userId: "system",
          });
          return { success: result.success, result: result.data || result.result };
        } catch (error) {
          return { success: false };
        }
      },
    });

    // Estrategia 2: Simplificar parámetros
    this.register("simplify-params", {
      name: "Simplificar parámetros",
      description: "Reintenta con parámetros simplificados",
      priority: 5,
      execute: async (context) => {
        const simplified = this.simplifyParameters(context.parameters);

        try {
          const result = await toolRegistry.execute(context.toolName, simplified, {
            conversationId: "recovery",
            userId: "system",
          });
          return {
            success: result.success,
            result: result.data || result.result,
            newParams: simplified,
          };
        } catch (error) {
          return { success: false };
        }
      },
    });

    // Estrategia 3: Usar herramienta alternativa
    this.register("alternative-tool", {
      name: "Usar herramienta alternativa",
      description: "Intenta con una herramienta alternativa",
      priority: 7,
      execute: async (context) => {
        const alternative = this.findAlternativeTool(context.toolName);
        if (!alternative) return { success: false };

        try {
          const result = await toolRegistry.execute(alternative, context.parameters, {
            conversationId: "recovery",
            userId: "system",
          });
          return {
            success: result.success,
            result: result.data || result.result,
            newParams: context.parameters,
          };
        } catch (error) {
          return { success: false };
        }
      },
    });

    // Estrategia 4: Generar parámetros con LLM
    this.register("llm-fix-params", {
      name: "Generar parámetros corregidos con LLM",
      description: "Usa LLM para generar parámetros corregidos",
      priority: 8,
      execute: async (context) => {
        const fixedParams = await this.generateFixedParameters(context);
        if (!fixedParams) return { success: false };

        try {
          const result = await toolRegistry.execute(context.toolName, fixedParams, {
            conversationId: "recovery",
            userId: "system",
          });
          return {
            success: result.success,
            result: result.data || result.result,
            newParams: fixedParams,
          };
        } catch (error) {
          return { success: false };
        }
      },
    });

    // Estrategia 5: Descomponer en tareas más pequeñas
    this.register("decompose", {
      name: "Descomponer en tareas más pequeñas",
      description: "Divide la tarea en pasos más pequeños",
      priority: 6,
      execute: async (context) => {
        const decomposed = await this.decomposeTask(context);
        if (!decomposed || decomposed.length === 0) return { success: false };

        const results: unknown[] = [];
        for (const task of decomposed) {
          try {
            const result = await toolRegistry.execute(context.toolName, task, {
              conversationId: "recovery",
              userId: "system",
            });
            if (result.success) {
              results.push(result.data || result.result);
            }
          } catch (error) {
            // Continuar con siguiente tarea
          }
        }

        return {
          success: results.length > 0,
          result: results,
          newParams: decomposed[0],
        };
      },
    });

    // Estrategia 6: Cambiar modelo de LLM
    this.register("change-model", {
      name: "Cambiar modelo de LLM",
      description: "Intenta con un modelo de LLM diferente",
      priority: 4,
      execute: async (context) => {
        // Esta estrategia requiere soporte especial del ejecutor
        return { success: false };
      },
    });
  }

  /**
   * Registrar una estrategia personalizada
   */
  register(name: string, strategy: RecoveryStrategy): void {
    this.strategies.set(name, strategy);
  }

  /**
   * Recuperar de un error automáticamente
   */
  async recover(context: ErrorContext): Promise<RecoveryResult> {
    console.log(`[ErrorRecovery] Intentando recuperación de: ${context.errorMessage}`);

    // Obtener estrategias ordenadas por prioridad
    const strategies = Array.from(this.strategies.values()).sort((a, b) => b.priority - a.priority);

    for (const strategy of strategies) {
      try {
        console.log(`[ErrorRecovery] Intentando estrategia: ${strategy.name}`);
        const result = await strategy.execute(context);

        if (result.success) {
          console.log(`[ErrorRecovery] ✓ Recuperación exitosa con: ${strategy.name}`);
          this.saveRecoveryToMemory(context, strategy.name, result);

          return {
            recovered: true,
            strategy: strategy.name,
            newParams: result.newParams,
            result: result.result,
          };
        }
      } catch (error) {
        console.error(`[ErrorRecovery] Error en estrategia ${strategy.name}:`, error);
      }
    }

    console.log(`[ErrorRecovery] ✗ No se pudo recuperar del error`);
    return {
      recovered: false,
      strategy: "none",
      error: context.errorMessage,
    };
  }

  /**
   * Simplificar parámetros
   */
  private simplifyParameters(params: Record<string, unknown>): Record<string, unknown> {
    const simplified: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string" && value.length > 100) {
        simplified[key] = value.substring(0, 100);
      } else if (typeof value === "object" && value !== null) {
        simplified[key] = JSON.stringify(value).substring(0, 200);
      } else {
        simplified[key] = value;
      }
    }

    return simplified;
  }

  /**
   * Encontrar herramienta alternativa
   */
  private findAlternativeTool(toolName: string): string | null {
    const alternatives: Record<string, string> = {
      "Web Search": "Web Extraction",
      "Web Extraction": "Browser Navigation",
      "Code Generation": "File Write",
      "Python Execution": "Node.js Execution",
      "Testing": "Code Generation",
      "Data Analysis": "Visualization",
    };

    return alternatives[toolName] || null;
  }

  /**
   * Generar parámetros corregidos con LLM
   */
  private async generateFixedParameters(
    context: ErrorContext
  ): Promise<Record<string, unknown> | null> {
    const prompt = `La herramienta "${context.toolName}" falló con este error:

"${context.errorMessage}"

Parámetros originales:
${JSON.stringify(context.parameters, null, 2)}

¿Cuáles deberían ser los parámetros corregidos? Responde ÚNICAMENTE con JSON válido.`;

    try {
      const adapter = getAdapter();
      const response = await adapter.chat([{ role: "user", content: prompt }], {
        model: "deepseek-v4-flash",
        maxTokens: 512,
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error("[ErrorRecovery] Error generando parámetros corregidos:", error);
    }

    return null;
  }

  /**
   * Descomponer una tarea en pasos más pequeños
   */
  private async decomposeTask(context: ErrorContext): Promise<Record<string, unknown>[] | null> {
    const prompt = `La herramienta "${context.toolName}" falló con este error:

"${context.errorMessage}"

Parámetros:
${JSON.stringify(context.parameters, null, 2)}

¿Cómo podrías descomponer esta tarea en pasos más pequeños? Responde con un array JSON de parámetros para cada paso.`;

    try {
      const adapter = getAdapter();
      const response = await adapter.chat([{ role: "user", content: prompt }], {
        model: "deepseek-v4-flash",
        maxTokens: 1024,
      });

      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error("[ErrorRecovery] Error descomponiendo tarea:", error);
    }

    return null;
  }

  /**
   * Guardar recuperación en memoria
   */
  private saveRecoveryToMemory(
    context: ErrorContext,
    strategyName: string,
    result: { success: boolean; result?: unknown; newParams?: Record<string, unknown> }
  ): void {
    this.memory.store(
      "semantic",
      `recovery:${context.toolName}:${Date.now()}`,
      JSON.stringify({
        context,
        strategyName,
        result,
        timestamp: new Date().toISOString(),
      }),
      {
        tags: ["recovery", context.toolName, strategyName],
        confidence: 0.9,
      }
    );
  }

  /**
   * Obtener estadísticas de recuperación
   */
  getRecoveryStats(): { totalAttempts: number; successRate: number; mostUsedStrategy: string } {
    // Implementar obtención de estadísticas desde memoria
    return {
      totalAttempts: 0,
      successRate: 0,
      mostUsedStrategy: "unknown",
    };
  }
}

/**
 * Instancia global del sistema de recuperación
 */
let errorRecoveryInstance: ErrorRecovery | null = null;

export function getErrorRecovery(): ErrorRecovery {
  if (!errorRecoveryInstance) {
    errorRecoveryInstance = new ErrorRecovery();
  }
  return errorRecoveryInstance;
}

