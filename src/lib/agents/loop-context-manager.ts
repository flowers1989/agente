/**
 * Loop Context Manager
 * Gestiona el contexto dinámico del loop durante la ejecución
 */

import { useMemoryStore } from "../memory/memory-store";
import type { LoopContext } from "./agent-loop";

export interface DynamicContext {
  conversationId: string;
  currentObjective: string;
  previousResults: unknown[];
  failedAttempts: number;
  successfulAttempts: number;
  lastError?: string;
  adaptations: string[];
  confidence: number;
}

/**
 * Gestor de contexto dinámico
 */
export class LoopContextManager {
  private memory = useMemoryStore.getState();
  private contexts: Map<string, DynamicContext> = new Map();

  /**
   * Crear un contexto dinámico
   */
  createContext(conversationId: string, objective: string): DynamicContext {
    const context: DynamicContext = {
      conversationId,
      currentObjective: objective,
      previousResults: [],
      failedAttempts: 0,
      successfulAttempts: 0,
      adaptations: [],
      confidence: 1.0,
    };

    this.contexts.set(conversationId, context);
    this.saveContextToMemory(context);

    return context;
  }

  /**
   * Obtener contexto existente
   */
  getContext(conversationId: string): DynamicContext | undefined {
    return this.contexts.get(conversationId);
  }

  /**
   * Actualizar contexto con resultado exitoso
   */
  recordSuccess(conversationId: string, result: unknown): void {
    const context = this.getContext(conversationId);
    if (!context) return;

    context.previousResults.push(result);
    context.successfulAttempts++;
    context.confidence = Math.min(1.0, context.confidence + 0.1);
    context.lastError = undefined;

    this.saveContextToMemory(context);
  }

  /**
   * Actualizar contexto con fallo
   */
  recordFailure(conversationId: string, error: string): void {
    const context = this.getContext(conversationId);
    if (!context) return;

    context.failedAttempts++;
    context.lastError = error;
    context.confidence = Math.max(0.1, context.confidence - 0.15);

    this.saveContextToMemory(context);
  }

  /**
   * Registrar una adaptación
   */
  recordAdaptation(conversationId: string, adaptation: string): void {
    const context = this.getContext(conversationId);
    if (!context) return;

    context.adaptations.push(`${new Date().toISOString()}: ${adaptation}`);
    this.saveContextToMemory(context);
  }

  /**
   * Ajustar objetivo dinámicamente
   */
  adjustObjective(conversationId: string, newObjective: string): void {
    const context = this.getContext(conversationId);
    if (!context) return;

    context.currentObjective = newObjective;
    context.adaptations.push(`Objetivo ajustado a: ${newObjective}`);
    this.saveContextToMemory(context);
  }

  /**
   * Evaluar si el contexto requiere cambio de estrategia
   */
  shouldChangeStrategy(conversationId: string): boolean {
    const context = this.getContext(conversationId);
    if (!context) return false;

    // Cambiar estrategia si:
    // 1. Demasiados fallos
    if (context.failedAttempts > 3) return true;

    // 2. Confianza muy baja
    if (context.confidence < 0.3) return true;

    // 3. Muchas adaptaciones
    if (context.adaptations.length > 5) return true;

    return false;
  }

  /**
   * Obtener recomendación de estrategia
   */
  getStrategyRecommendation(conversationId: string): string {
    const context = this.getContext(conversationId);
    if (!context) return "default";

    if (context.failedAttempts > 3) {
      return "decompose"; // Descomponer en tareas más pequeñas
    }

    if (context.confidence < 0.3) {
      return "alternative-tool"; // Usar herramienta alternativa
    }

    if (context.adaptations.length > 5) {
      return "abort"; // Abortar y reportar
    }

    return "continue"; // Continuar con estrategia actual
  }

  /**
   * Generar reporte del contexto
   */
  generateContextReport(conversationId: string): string {
    const context = this.getContext(conversationId);
    if (!context) return "Contexto no encontrado";

    const successRate = context.successfulAttempts / (context.successfulAttempts + context.failedAttempts) || 0;

    return `
## Reporte de Contexto Dinámico

**Objetivo Actual:** ${context.currentObjective}

**Estadísticas:**
- Intentos Exitosos: ${context.successfulAttempts}
- Intentos Fallidos: ${context.failedAttempts}
- Tasa de Éxito: ${(successRate * 100).toFixed(1)}%
- Confianza: ${(context.confidence * 100).toFixed(1)}%

**Último Error:** ${context.lastError || "Ninguno"}

**Adaptaciones Realizadas:**
${context.adaptations.map((a) => `- ${a}`).join("\n")}

**Recomendación:** ${this.getStrategyRecommendation(conversationId)}

**Resultados Previos:** ${context.previousResults.length} resultados almacenados
`;
  }

  /**
   * Guardar contexto en memoria
   */
  private saveContextToMemory(context: DynamicContext): void {
    this.memory.store(
      "semantic",
      `loop:context:${context.conversationId}`,
      JSON.stringify(context),
      {
        conversationId: context.conversationId,
        tags: ["loop", "context", "dynamic"],
        confidence: context.confidence,
      }
    );
  }

  /**
   * Limpiar contexo
   */
  clearContext(conversationId: string): void {
    this.contexts.delete(conversationId);
  }

  /**
   * Obtener todos los contextos
   */
  getAllContexts(): DynamicContext[] {
    return Array.from(this.contexts.values());
  }
}

/**
 * Instancia global del gestor de contexto
 */
let contextManagerInstance: LoopContextManager | null = null;

export function getLoopContextManager(): LoopContextManager {
  if (!contextManagerInstance) {
    contextManagerInstance = new LoopContextManager();
  }
  return contextManagerInstance;
}

