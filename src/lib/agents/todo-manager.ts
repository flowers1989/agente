// ==================== TODO MANAGER ====================
// Gestiona el todo.md dinámico del agente: planificación, reflexión y ajuste
// de estrategia en tiempo real. Inspirado en el bucle de atención de Manus AI.
//
// Flujo:
//   1. Al iniciar una tarea → genera el todo.md inicial con los pasos planificados
//   2. Al completar cada paso → actualiza el estado y reflexiona sobre el resultado
//   3. Si un paso falla → ajusta la estrategia y puede replanificar
//   4. Al finalizar → genera un resumen de lo aprendido
//
// El todo.md es visible internamente para los agentes pero NO se muestra al usuario.
// El usuario solo ve "Trabajando..." y el resultado final.

import type { ExecutionPlan, ExecutionStep } from "../types";

export interface TodoItem {
  id: string;
  stepIndex: number;
  title: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "skipped" | "retrying";
  reflection?: string;       // Reflexión del agente sobre el resultado
  adjustment?: string;       // Ajuste de estrategia si hubo error
  startedAt?: string;
  completedAt?: string;
  retryCount: number;
}

export interface TodoState {
  conversationId: string;
  objective: string;
  items: TodoItem[];
  currentIndex: number;
  overallStatus: "planning" | "executing" | "reflecting" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
  reflections: string[];     // Reflexiones globales acumuladas
  adjustments: string[];     // Ajustes de estrategia acumulados
}

export class TodoManager {
  private state: TodoState | null = null;

  /**
   * Inicializa el todo.md a partir de un plan de ejecución.
   * Se llama al inicio de cada tarea.
   */
  initialize(conversationId: string, objective: string, plan: ExecutionPlan): TodoState {
    const items: TodoItem[] = plan.steps.map((step, index) => ({
      id: `todo-${step.id}`,
      stepIndex: index,
      title: step.description,
      status: "pending",
      retryCount: 0,
    }));

    this.state = {
      conversationId,
      objective,
      items,
      currentIndex: 0,
      overallStatus: "planning",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reflections: [],
      adjustments: [],
    };

    return this.state;
  }

  /**
   * Marca un paso como iniciado.
   */
  startStep(stepId: string): void {
    if (!this.state) return;
    const item = this.state.items.find((i) => i.id === `todo-${stepId}`);
    if (!item) return;
    item.status = "in_progress";
    item.startedAt = new Date().toISOString();
    this.state.overallStatus = "executing";
    this.state.updatedAt = new Date().toISOString();
  }

  /**
   * Marca un paso como completado y genera una reflexión sobre el resultado.
   */
  completeStep(stepId: string, result: string): void {
    if (!this.state) return;
    const item = this.state.items.find((i) => i.id === `todo-${stepId}`);
    if (!item) return;
    item.status = "completed";
    item.completedAt = new Date().toISOString();
    item.reflection = this.generateReflection(item.title, result, true);
    this.state.currentIndex = Math.min(this.state.currentIndex + 1, this.state.items.length - 1);
    this.state.updatedAt = new Date().toISOString();

    // Agregar reflexión global
    if (item.reflection) {
      this.state.reflections.push(item.reflection);
    }
  }

  /**
   * Marca un paso como fallido y genera un ajuste de estrategia.
   */
  failStep(stepId: string, error: string): void {
    if (!this.state) return;
    const item = this.state.items.find((i) => i.id === `todo-${stepId}`);
    if (!item) return;
    item.status = "failed";
    item.completedAt = new Date().toISOString();
    item.reflection = this.generateReflection(item.title, error, false);
    item.adjustment = this.generateAdjustment(item.title, error, item.retryCount);
    this.state.updatedAt = new Date().toISOString();

    if (item.adjustment) {
      this.state.adjustments.push(item.adjustment);
    }
  }

  /**
   * Marca un paso para reintento y actualiza el contador.
   */
  retryStep(stepId: string): void {
    if (!this.state) return;
    const item = this.state.items.find((i) => i.id === `todo-${stepId}`);
    if (!item) return;
    item.status = "retrying";
    item.retryCount += 1;
    this.state.updatedAt = new Date().toISOString();
  }

  /**
   * Marca un paso como omitido (cuando el verificador decide skip).
   */
  skipStep(stepId: string, reason: string): void {
    if (!this.state) return;
    const item = this.state.items.find((i) => i.id === `todo-${stepId}`);
    if (!item) return;
    item.status = "skipped";
    item.completedAt = new Date().toISOString();
    item.reflection = `Omitido: ${reason}`;
    this.state.currentIndex = Math.min(this.state.currentIndex + 1, this.state.items.length - 1);
    this.state.updatedAt = new Date().toISOString();
  }

  /**
   * Finaliza el todo.md con el estado global de la tarea.
   */
  finalize(success: boolean): TodoState | null {
    if (!this.state) return null;
    this.state.overallStatus = success ? "completed" : "failed";
    this.state.updatedAt = new Date().toISOString();
    return this.state;
  }

  /**
   * Serializa el estado actual como markdown (para logging interno).
   */
  toMarkdown(): string {
    if (!this.state) return "# Todo vacío\n";
    const statusEmoji: Record<TodoItem["status"], string> = {
      pending: "⬜",
      in_progress: "🔄",
      completed: "✅",
      failed: "❌",
      skipped: "⏭️",
      retrying: "🔁",
    };

    const lines: string[] = [
      `# Todo — ${this.state.objective.slice(0, 80)}`,
      `**Estado:** ${this.state.overallStatus} | **Actualizado:** ${new Date(this.state.updatedAt).toLocaleTimeString()}`,
      "",
      "## Pasos",
    ];

    for (const item of this.state.items) {
      lines.push(`${statusEmoji[item.status]} **${item.title}**`);
      if (item.reflection) lines.push(`   > ${item.reflection}`);
      if (item.adjustment) lines.push(`   > 🔧 Ajuste: ${item.adjustment}`);
    }

    if (this.state.adjustments.length > 0) {
      lines.push("", "## Ajustes de estrategia");
      this.state.adjustments.forEach((a, i) => lines.push(`${i + 1}. ${a}`));
    }

    return lines.join("\n");
  }

  /**
   * Obtiene el estado actual del todo.
   */
  getState(): TodoState | null {
    return this.state;
  }

  /**
   * Obtiene el progreso como porcentaje (0-100).
   */
  getProgress(): number {
    if (!this.state || this.state.items.length === 0) return 0;
    const done = this.state.items.filter(
      (i) => i.status === "completed" || i.status === "skipped"
    ).length;
    return Math.round((done / this.state.items.length) * 100);
  }

  /**
   * Genera una reflexión concisa sobre el resultado de un paso.
   */
  private generateReflection(title: string, result: string, success: boolean): string {
    if (success) {
      const snippet = result.slice(0, 120).replace(/\n/g, " ");
      return snippet || `Completado correctamente.`;
    } else {
      const snippet = result.slice(0, 120).replace(/\n/g, " ");
      return `Error: ${snippet}`;
    }
  }

  /**
   * Genera un ajuste de estrategia basado en el error y el número de reintentos.
   */
  private generateAdjustment(title: string, error: string, retryCount: number): string {
    if (retryCount === 0) {
      return `Reintentando "${title}" con parámetros ajustados.`;
    } else if (retryCount === 1) {
      return `Segundo intento fallido en "${title}". Buscando enfoque alternativo.`;
    } else {
      return `Paso "${title}" marcado como no recuperable después de ${retryCount} intentos. Continuando con el siguiente paso.`;
    }
  }
}

// Instancia singleton por sesión de ejecución
export function createTodoManager(): TodoManager {
  return new TodoManager();
}
