// ==================== CRON MANAGER ====================
// Gestión de tareas programadas del agente.
// Las tareas se persisten en la base de datos (ScheduledTask) y se ejecutan
// mediante un endpoint de polling que Next.js puede llamar periódicamente.
//
// Expresiones cron soportadas (5 campos): minuto hora día-mes mes día-semana
// Ejemplos:
//   "*/5 * * * *"   → cada 5 minutos
//   "0 9 * * 1-5"   → lunes a viernes a las 9:00
//   "0 0 1 * *"     → primer día de cada mes a medianoche

import { db as prisma } from "@/lib/db";

export interface ScheduledTaskInput {
  userId: string;
  name: string;
  description: string;
  cronExpression: string;
  conversationId?: string;
  metadata?: Record<string, unknown>;
}

export interface ScheduledTaskRecord {
  id: string;
  userId: string;
  name: string;
  description: string;
  cronExpression: string;
  enabled: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  lastStatus?: string;
  lastError?: string;
  runCount: number;
  conversationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CronJobLogRecord {
  id: string;
  taskId: string;
  status: "success" | "failed";
  output?: string;
  error?: string;
  durationMs: number;
  startedAt: Date;
}

// ==================== PARSER DE EXPRESIONES CRON ====================

/**
 * Calcula la próxima fecha de ejecución a partir de una expresión cron.
 * Soporta el subconjunto estándar de 5 campos.
 */
export function getNextRunDate(expression: string, from: Date = new Date()): Date | null {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const [minuteExpr, hourExpr, domExpr, monthExpr, dowExpr] = parts;

  const parseField = (expr: string, min: number, max: number): number[] => {
    if (expr === "*") return range(min, max);
    const values: number[] = [];
    for (const part of expr.split(",")) {
      if (part.includes("/")) {
        const [rangeStr, step] = part.split("/");
        const stepNum = parseInt(step, 10);
        const [start, end] = rangeStr === "*"
          ? [min, max]
          : rangeStr.split("-").map(Number);
        for (let i = start; i <= (end ?? max); i += stepNum) values.push(i);
      } else if (part.includes("-")) {
        const [start, end] = part.split("-").map(Number);
        for (let i = start; i <= end; i++) values.push(i);
      } else {
        values.push(parseInt(part, 10));
      }
    }
    return values.filter((v) => v >= min && v <= max);
  };

  const minutes = parseField(minuteExpr, 0, 59);
  const hours = parseField(hourExpr, 0, 23);
  const months = parseField(monthExpr, 1, 12);
  const dows = parseField(dowExpr, 0, 6);
  const doms = domExpr === "*" ? null : parseField(domExpr, 1, 31);

  // Buscar la próxima fecha en los siguientes 366 días
  const next = new Date(from);
  next.setSeconds(0, 0);
  next.setMinutes(next.getMinutes() + 1); // Avanzar al menos 1 minuto

  for (let day = 0; day < 366 * 24 * 60; day++) {
    const m = next.getMonth() + 1; // 1-12
    const d = next.getDate();       // 1-31
    const h = next.getHours();
    const min = next.getMinutes();
    const dow = next.getDay();      // 0-6

    if (
      months.includes(m) &&
      (doms === null || doms.includes(d)) &&
      dows.includes(dow) &&
      hours.includes(h) &&
      minutes.includes(min)
    ) {
      return new Date(next);
    }

    next.setMinutes(next.getMinutes() + 1);
  }

  return null;
}

function range(min: number, max: number): number[] {
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

// ==================== CRON MANAGER CLASS ====================

class CronManager {
  /**
   * Crea una nueva tarea programada.
   */
  async createTask(input: ScheduledTaskInput): Promise<ScheduledTaskRecord> {
    const nextRunAt = getNextRunDate(input.cronExpression) ?? undefined;

    const task = await prisma.scheduledTask.create({
      data: {
        userId: input.userId,
        name: input.name,
        description: input.description,
        cronExpression: input.cronExpression,
        enabled: true,
        nextRunAt: nextRunAt ?? null,
        conversationId: input.conversationId ?? null,
        metadata: JSON.stringify(input.metadata ?? {}),
      },
    });

    return this.deserializeTask(task);
  }

  /**
   * Lista todas las tareas de un usuario.
   */
  async listTasks(userId: string): Promise<ScheduledTaskRecord[]> {
    const tasks = await prisma.scheduledTask.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return tasks.map(this.deserializeTask);
  }

  /**
   * Obtiene una tarea por ID.
   */
  async getTask(taskId: string): Promise<ScheduledTaskRecord | null> {
    const task = await prisma.scheduledTask.findUnique({ where: { id: taskId } });
    return task ? this.deserializeTask(task) : null;
  }

  /**
   * Activa o desactiva una tarea.
   */
  async toggleTask(taskId: string, enabled: boolean): Promise<ScheduledTaskRecord> {
    const nextRunAt = enabled
      ? (getNextRunDate(
          (await prisma.scheduledTask.findUnique({ where: { id: taskId } }))?.cronExpression ?? "* * * * *"
        ) ?? undefined)
      : undefined;

    const task = await prisma.scheduledTask.update({
      where: { id: taskId },
      data: { enabled, ...(nextRunAt ? { nextRunAt } : {}) },
    });
    return this.deserializeTask(task);
  }

  /**
   * Elimina una tarea y su historial.
   */
  async deleteTask(taskId: string): Promise<void> {
    await prisma.scheduledTask.delete({ where: { id: taskId } });
  }

  /**
   * Obtiene el historial de ejecuciones de una tarea.
   */
  async getTaskLogs(taskId: string, limit = 20): Promise<CronJobLogRecord[]> {
    const logs = await prisma.cronJobLog.findMany({
      where: { taskId },
      orderBy: { startedAt: "desc" },
      take: limit,
    });
    return logs.map((l) => ({
      id: l.id,
      taskId: l.taskId,
      status: l.status as "success" | "failed",
      output: l.output ?? undefined,
      error: l.error ?? undefined,
      durationMs: l.durationMs,
      startedAt: l.startedAt,
    }));
  }

  /**
   * Obtiene las tareas que deben ejecutarse ahora (nextRunAt <= now y enabled).
   * Llamado por el endpoint de polling /api/cron/tick.
   */
  async getDueTasks(): Promise<ScheduledTaskRecord[]> {
    const now = new Date();
    const tasks = await prisma.scheduledTask.findMany({
      where: {
        enabled: true,
        nextRunAt: { lte: now },
      },
      orderBy: { nextRunAt: "asc" },
      take: 50,
    });
    return tasks.map(this.deserializeTask);
  }

  /**
   * Marca una tarea como ejecutada y registra el resultado.
   */
  async recordExecution(
    taskId: string,
    status: "success" | "failed",
    output?: string,
    error?: string,
    durationMs = 0
  ): Promise<void> {
    const task = await prisma.scheduledTask.findUnique({ where: { id: taskId } });
    if (!task) return;

    const nextRunAt = getNextRunDate(task.cronExpression) ?? undefined;

    await prisma.$transaction([
      prisma.scheduledTask.update({
        where: { id: taskId },
        data: {
          lastRunAt: new Date(),
          nextRunAt: nextRunAt ?? null,
          lastStatus: status,
          lastError: error ?? null,
          runCount: { increment: 1 },
        },
      }),
      prisma.cronJobLog.create({
        data: {
          taskId,
          status,
          output: output ?? null,
          error: error ?? null,
          durationMs,
        },
      }),
    ]);
  }

  private deserializeTask(task: {
    id: string;
    userId: string;
    name: string;
    description: string;
    cronExpression: string;
    enabled: boolean;
    lastRunAt: Date | null;
    nextRunAt: Date | null;
    lastStatus: string | null;
    lastError: string | null;
    runCount: number;
    conversationId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ScheduledTaskRecord {
    return {
      id: task.id,
      userId: task.userId,
      name: task.name,
      description: task.description,
      cronExpression: task.cronExpression,
      enabled: task.enabled,
      lastRunAt: task.lastRunAt ?? undefined,
      nextRunAt: task.nextRunAt ?? undefined,
      lastStatus: task.lastStatus ?? undefined,
      lastError: task.lastError ?? undefined,
      runCount: task.runCount,
      conversationId: task.conversationId ?? undefined,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }
}

export const cronManager = new CronManager();
