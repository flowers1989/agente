/**
 * Agent Loop - Motor de Autonomía
 * Implementa el ciclo iterativo: Pensar → Actuar → Observar → Evaluar → Repetir
 * 
 * Este es el corazón que convierte un agente reactivo en un agente verdaderamente autónomo
 * capaz de auto-corregirse, aprender de errores y tomar decisiones dinámicas.
 */

import { useMemoryStore } from "../memory/memory-store";
import { toolRegistry } from "./tool-registry";
import { getAdapter } from "./opencode-adapter";
import type { ExecutionStep } from "../types";

export interface LoopIteration {
  iterationNumber: number;
  timestamp: string;
  phase: "thinking" | "acting" | "observing" | "evaluating";
  thought?: string;
  action?: {
    toolName: string;
    parameters: Record<string, unknown>;
  };
  observation?: {
    success: boolean;
    result: string;
    error?: string;
    data?: unknown;
  };
  evaluation?: {
    isSuccessful: boolean;
    shouldContinue: boolean;
    nextAction?: string;
    confidence: number;
  };
  duration: number;
}

export interface LoopContext {
  conversationId: string;
  userId: string;
  objective: string;
  maxIterations: number;
  currentIteration: number;
  history: LoopIteration[];
  isComplete: boolean;
  finalResult?: unknown;
  errors: string[];
}

/**
 * Motor del Agent Loop
 * Ejecuta el ciclo de autonomía de manera iterativa
 */
export class AgentLoop {
  private context: LoopContext;
  private memory = useMemoryStore.getState();

  constructor(conversationId: string, userId: string, objective: string, maxIterations: number = 10) {
    this.context = {
      conversationId,
      userId,
      objective,
      maxIterations,
      currentIteration: 0,
      history: [],
      isComplete: false,
      errors: [],
    };
  }

  /**
   * Iniciar el loop de autonomía
   */
  async execute(): Promise<LoopContext> {
    console.log(`[AgentLoop] Iniciando loop para objetivo: "${this.context.objective}"`);

    while (this.context.currentIteration < this.context.maxIterations && !this.context.isComplete) {
      this.context.currentIteration++;

      try {
        // Fase 1: PENSAR
        const thought = await this.think();

        // Fase 2: ACTUAR
        const action = await this.act(thought);

        // Fase 3: OBSERVAR
        const observation = await this.observe(action);

        // Fase 4: EVALUAR
        const evaluation = await this.evaluate(observation);

        // Guardar iteración en historial
        const iteration: LoopIteration = {
          iterationNumber: this.context.currentIteration,
          timestamp: new Date().toISOString(),
          phase: "evaluating",
          thought,
          action,
          observation,
          evaluation,
          duration: 0, // Se calcula después
        };

        this.context.history.push(iteration);

        // Guardar en memoria
        this.saveIterationToMemory(iteration);

        // Verificar si debemos continuar
        if (!evaluation.shouldContinue) {
          this.context.isComplete = true;
          this.context.finalResult = observation.result;
          console.log(`[AgentLoop] Loop completado en iteración ${this.context.currentIteration}`);
        }

        // Pequeño delay para evitar saturación
        await new Promise((r) => setTimeout(r, 100));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[AgentLoop] Error en iteración ${this.context.currentIteration}:`, message);
        this.context.errors.push(message);

        // Intentar recuperación
        const recovered = await this.attemptRecovery();
        if (!recovered) {
          this.context.isComplete = true;
          break;
        }
      }
    }

    // Guardar contexto final en memoria
    this.saveContextToMemory();

    return this.context;
  }

  /**
   * Fase 1: PENSAR
   * El agente reflexiona sobre el objetivo y decide qué herramienta usar
   */
  private async think(): Promise<string> {
    const recentHistory = this.context.history.slice(-3).map((h) => h.thought).join("\n");

    const prompt = `Eres un agente autónomo que está ejecutando un objetivo.

Objetivo: "${this.context.objective}"

Iteración actual: ${this.context.currentIteration}/${this.context.maxIterations}

${recentHistory ? `Acciones previas:\n${recentHistory}\n` : ""}

Basándote en el objetivo, ¿qué acción deberías tomar AHORA para avanzar?

Responde ÚNICAMENTE con una descripción breve de la acción (máximo 2 líneas).`;

    try {
      const adapter = getAdapter();
      const response = await adapter.chat([{ role: "user", content: prompt }], {
        model: "deepseek-v4-flash",
        maxTokens: 256,
      });

      return response.content.trim();
    } catch (error) {
      return `Ejecutar herramienta para: ${this.context.objective}`;
    }
  }

  /**
   * Fase 2: ACTUAR
   * El agente ejecuta la acción pensada
   */
  private async act(thought: string): Promise<{ toolName: string; parameters: Record<string, unknown> }> {
    // Usar el pensamiento para seleccionar herramienta
    const toolName = this.selectToolFromThought(thought);
    const parameters = this.extractParametersFromThought(thought);

    console.log(`[AgentLoop] Actuando: ${toolName} con parámetros:`, parameters);

    return { toolName, parameters };
  }

  /**
   * Fase 3: OBSERVAR
   * El agente ejecuta la herramienta y observa el resultado
   */
  private async observe(action: {
    toolName: string;
    parameters: Record<string, unknown>;
  }): Promise<{ success: boolean; result: string; error?: string; data?: unknown }> {
    try {
      const result = await toolRegistry.execute(action.toolName, action.parameters, {
        conversationId: this.context.conversationId,
        userId: this.context.userId,
      });

      console.log(`[AgentLoop] Observación: ${action.toolName} - Éxito: ${result.success}`);

      return {
        success: result.success,
        result: result.result || "",
        error: result.error,
        data: result.data,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        result: "",
        error: message,
      };
    }
  }

  /**
   * Fase 4: EVALUAR
   * El agente evalúa el resultado y decide si continuar o no
   */
  private async evaluate(observation: {
    success: boolean;
    result: string;
    error?: string;
    data?: unknown;
  }): Promise<{ isSuccessful: boolean; shouldContinue: boolean; nextAction?: string; confidence: number }> {
    const prompt = `Evaluando progreso hacia el objetivo: "${this.context.objective}"

Resultado de la acción anterior:
- Éxito: ${observation.success}
- Resultado: ${observation.result.slice(0, 200)}
${observation.error ? `- Error: ${observation.error}` : ""}

¿Se ha logrado el objetivo? Responde ÚNICAMENTE con "SÍ" o "NO".`;

    try {
      const adapter = getAdapter();
      const response = await adapter.chat([{ role: "user", content: prompt }], {
        model: "deepseek-v4-flash",
        maxTokens: 10,
      });

      const isComplete = response.content.toLowerCase().includes("sí") || response.content.toLowerCase().includes("yes");

      return {
        isSuccessful: observation.success,
        shouldContinue: !isComplete && this.context.currentIteration < this.context.maxIterations,
        confidence: isComplete ? 0.95 : 0.5,
      };
    } catch (error) {
      return {
        isSuccessful: observation.success,
        shouldContinue: this.context.currentIteration < this.context.maxIterations,
        confidence: 0.3,
      };
    }
  }

  /**
   * Intentar recuperación de errores
   */
  private async attemptRecovery(): Promise<boolean> {
    if (this.context.errors.length > 3) {
      console.error("[AgentLoop] Demasiados errores. Abortando loop.");
      return false;
    }

    console.log("[AgentLoop] Intentando recuperación...");

    // Estrategia de recuperación: cambiar herramienta
    const lastError = this.context.errors[this.context.errors.length - 1];
    const prompt = `El agente encontró un error: "${lastError}"

Objetivo original: "${this.context.objective}"

¿Qué herramienta alternativa deberías usar? Responde ÚNICAMENTE con el nombre de la herramienta.`;

    try {
      const adapter = getAdapter();
      const response = await adapter.chat([{ role: "user", content: prompt }], {
        model: "deepseek-v4-flash",
        maxTokens: 50,
      });

      console.log("[AgentLoop] Herramienta alternativa sugerida:", response.content);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Seleccionar herramienta basada en el pensamiento
   */
  private selectToolFromThought(thought: string): string {
    const thoughtLower = thought.toLowerCase();

    // Mapeo simple de palabras clave a herramientas
    if (thoughtLower.includes("buscar") || thoughtLower.includes("search")) return "Web Search";
    if (thoughtLower.includes("extraer") || thoughtLower.includes("extract")) return "Web Extraction";
    if (thoughtLower.includes("código") || thoughtLower.includes("code")) return "Code Generation";
    if (thoughtLower.includes("documento") || thoughtLower.includes("document")) return "Document Generation";
    if (thoughtLower.includes("prueba") || thoughtLower.includes("test")) return "Testing";
    if (thoughtLower.includes("archivo") || thoughtLower.includes("file")) return "File Read";
    if (thoughtLower.includes("escribir") || thoughtLower.includes("write")) return "File Write";
    if (thoughtLower.includes("ejecutar") || thoughtLower.includes("run")) return "Python Execution";
    if (thoughtLower.includes("datos") || thoughtLower.includes("data")) return "Data Analysis";

    // Default
    return "Web Search";
  }

  /**
   * Extraer parámetros del pensamiento
   */
  private extractParametersFromThought(thought: string): Record<string, unknown> {
    // Extraer términos entre comillas como parámetros
    const matches = thought.match(/"([^"]*)"/g);
    const params: Record<string, unknown> = {};

    if (matches && matches.length > 0) {
      params.query = matches[0].replace(/"/g, "");
    } else {
      params.query = this.context.objective;
    }

    return params;
  }

  /**
   * Guardar iteración en memoria
   */
  private saveIterationToMemory(iteration: LoopIteration): void {
    this.memory.store(
      "semantic",
      `loop:iteration:${this.context.conversationId}:${iteration.iterationNumber}`,
      JSON.stringify(iteration),
      {
        conversationId: this.context.conversationId,
        tags: ["loop", "iteration"],
        confidence: 0.9,
      }
    );
  }

  /**
   * Guardar contexto final en memoria
   */
  private saveContextToMemory(): void {
    this.memory.store(
      "semantic",
      `loop:context:${this.context.conversationId}`,
      JSON.stringify(this.context),
      {
        conversationId: this.context.conversationId,
        tags: ["loop", "context"],
        confidence: 1.0,
      }
    );
  }

  /**
   * Obtener resumen del loop
   */
  getLoopSummary(): string {
    const successRate = this.context.history.filter((h) => h.observation?.success).length / this.context.history.length;

    return `
## Resumen del Agent Loop

**Objetivo:** ${this.context.objective}

**Iteraciones:** ${this.context.currentIteration}/${this.context.maxIterations}

**Estado:** ${this.context.isComplete ? "✅ Completado" : "⏸️ En progreso"}

**Tasa de Éxito:** ${(successRate * 100).toFixed(1)}%

**Errores:** ${this.context.errors.length}

**Resultado Final:** ${this.context.finalResult || "Pendiente"}

### Historial de Iteraciones

${this.context.history
  .map(
    (h) => `
- **Iteración ${h.iterationNumber}**
  - Pensamiento: ${h.thought}
  - Acción: ${h.action?.toolName}
  - Éxito: ${h.observation?.success ? "✓" : "✗"}
  - Confianza: ${(h.evaluation?.confidence || 0) * 100}%
`
  )
  .join("\n")}
`;
  }
}

/**
 * Ejecutor de loop para ser usado en los agentes
 */
export async function executeAgentLoop(
  conversationId: string,
  userId: string,
  objective: string,
  maxIterations: number = 10
): Promise<LoopContext> {
  const loop = new AgentLoop(conversationId, userId, objective, maxIterations);
  return loop.execute();
}
