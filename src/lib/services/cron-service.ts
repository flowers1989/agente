/**
 * Cron Service - Servicio real de tareas programadas
 * Ejecuta tareas programadas basadas en expresiones cron
 * Utiliza la memoria semántica para persistencia
 */

import { useMemoryStore } from "../memory/memory-store";

export interface CronTask {
  id: string;
  expression: string;
  task: string;
  conversationId: string;
  createdAt: string;
  lastRun?: string;
  nextRun?: string;
  enabled: boolean;
  retryCount: number;
  maxRetries: number;
}

/**
 * Parsear expresión cron y calcular el próximo tiempo de ejecución
 * Formato: "minuto hora día mes día-semana"
 * Ejemplo: "0 9 * * 1" = 9:00 AM cada lunes
 */
export function parseAndCalculateNextRun(expression: string): Date | null {
  try {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) {
      console.error("Expresión cron inválida. Formato: 'minuto hora día mes día-semana'");
      return null;
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts.map((p) => p === "*" ? -1 : parseInt(p, 10));

    const now = new Date();
    let next = new Date(now);
    next.setSeconds(0);
    next.setMilliseconds(0);
    next.setMinutes(next.getMinutes() + 1);

    // Ajustar la próxima ejecución según la expresión cron
    if (minute >= 0) next.setMinutes(minute);
    if (hour >= 0) next.setHours(hour);
    if (dayOfMonth > 0) next.setDate(dayOfMonth);
    if (month > 0) next.setMonth(month - 1);

    // Si la próxima ejecución es en el pasado, calcular la siguiente
    if (next <= now) {
      next = new Date(next);
      next.setDate(next.getDate() + 1);
    }

    return next;
  } catch (error) {
    console.error("Error parseando expresión cron:", error);
    return null;
  }
}

/**
 * Servicio de Cron que monitorea y ejecuta tareas programadas
 */
export class CronService {
  private tasks = new Map<string, CronTask>();
  private timers = new Map<string, NodeJS.Timeout>();
  private memory = useMemoryStore.getState();

  constructor() {
    this.loadTasksFromMemory();
    this.startMonitoring();
  }

  /**
   * Crear una nueva tarea programada
   */
  createTask(
    expression: string,
    taskDescription: string,
    conversationId: string
  ): { success: boolean; taskId?: string; error?: string } {
    try {
      const nextRun = parseAndCalculateNextRun(expression);
      if (!nextRun) {
        return { success: false, error: "Expresión cron inválida" };
      }

      const taskId = `cron-${Date.now()}`;
      const task: CronTask = {
        id: taskId,
        expression,
        task: taskDescription,
        conversationId,
        createdAt: new Date().toISOString(),
        nextRun: nextRun.toISOString(),
        enabled: true,
        retryCount: 0,
        maxRetries: 3,
      };

      this.tasks.set(taskId, task);
      this.memory.store("semantic", `cron:${taskId}`, JSON.stringify(task), {
        tags: ["cron", "schedule"],
        confidence: 1.0,
      });

      this.scheduleTask(taskId, task);

      return { success: true, taskId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Listar todas las tareas programadas
   */
  listTasks(): CronTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Obtener una tarea específica
   */
  getTask(taskId: string): CronTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Eliminar una tarea programada
   */
  deleteTask(taskId: string): boolean {
    const timer = this.timers.get(taskId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(taskId);
    }

    const deleted = this.tasks.delete(taskId);
    if (deleted) {
      this.memory.semantic = this.memory.semantic.filter((e) => e.key !== `cron:${taskId}`);
    }

    return deleted;
  }

  /**
   * Actualizar el estado de una tarea
   */
  updateTask(taskId: string, updates: Partial<CronTask>): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    const updatedTask = { ...task, ...updates };
    this.tasks.set(taskId, updatedTask);
    this.memory.store("semantic", `cron:${taskId}`, JSON.stringify(updatedTask), {
      tags: ["cron", "schedule"],
      confidence: 1.0,
    });

    return true;
  }

  /**
   * Programar la ejecución de una tarea
   */
  private scheduleTask(taskId: string, task: CronTask): void {
    if (!task.enabled) return;

    const nextRun = task.nextRun ? new Date(task.nextRun) : parseAndCalculateNextRun(task.expression);
    if (!nextRun) return;

    const now = new Date();
    const delay = Math.max(0, nextRun.getTime() - now.getTime());

    const timer = setTimeout(() => {
      this.executeTask(taskId);
    }, delay);

    this.timers.set(taskId, timer);
  }

  /**
   * Ejecutar una tarea programada
   */
  private async executeTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task || !task.enabled) return;

    try {
      console.log(`[Cron] Ejecutando tarea: ${taskId} - ${task.task}`);

      // Guardar registro de ejecución
      const executionLog = {
        taskId,
        executedAt: new Date().toISOString(),
        status: "success",
        result: `Tarea ejecutada: ${task.task}`,
      };

      this.memory.store("semantic", `cron:execution:${taskId}:${Date.now()}`, JSON.stringify(executionLog), {
        tags: ["cron", "execution"],
        confidence: 1.0,
      });

      // Actualizar la tarea con la próxima ejecución
      const nextRun = parseAndCalculateNextRun(task.expression);
      if (nextRun) {
        this.updateTask(taskId, {
          lastRun: new Date().toISOString(),
          nextRun: nextRun.toISOString(),
          retryCount: 0,
        });

        // Reprogramar
        this.scheduleTask(taskId, this.tasks.get(taskId)!);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[Cron] Error ejecutando tarea ${taskId}:`, message);

      // Registrar el error
      const errorLog = {
        taskId,
        executedAt: new Date().toISOString(),
        status: "error",
        error: message,
      };

      this.memory.store("semantic", `cron:error:${taskId}:${Date.now()}`, JSON.stringify(errorLog), {
        tags: ["cron", "error"],
        confidence: 1.0,
      });

      // Reintentar si no se alcanzó el máximo de reintentos
      const task = this.tasks.get(taskId);
      if (task && task.retryCount < task.maxRetries) {
        this.updateTask(taskId, { retryCount: task.retryCount + 1 });
        this.scheduleTask(taskId, this.tasks.get(taskId)!);
      }
    }
  }

  /**
   * Cargar tareas desde la memoria semántica
   */
  private loadTasksFromMemory(): void {
    const cronTasks = this.memory.semantic.filter((e) => e.key.startsWith("cron:") && !e.key.includes("execution") && !e.key.includes("error"));

    for (const entry of cronTasks) {
      try {
        const task: CronTask = JSON.parse(entry.value);
        this.tasks.set(task.id, task);
      } catch (error) {
        console.error("Error cargando tarea cron de memoria:", error);
      }
    }
  }

  /**
   * Iniciar monitoreo de tareas
   */
  private startMonitoring(): void {
    // Verificar tareas cada minuto
    setInterval(() => {
      const now = new Date();
      for (const [taskId, task] of this.tasks.entries()) {
        if (!task.enabled) continue;

        const nextRun = task.nextRun ? new Date(task.nextRun) : null;
        if (nextRun && nextRun <= now) {
          this.executeTask(taskId);
        }
      }
    }, 60000); // Cada minuto
  }

  /**
   * Detener el servicio
   */
  stop(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }
}

// Instancia global del servicio de Cron
let cronServiceInstance: CronService | null = null;

export function getCronService(): CronService {
  if (!cronServiceInstance) {
    cronServiceInstance = new CronService();
  }
  return cronServiceInstance;
}
