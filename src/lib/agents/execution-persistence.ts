// ==================== AGENT EXECUTION PERSISTENCE ====================
// Persiste el estado del AgentLoop en la base de datos (Prisma).
// Permite resumir una ejecución tras recarga de página o reconexión.
//
// El estado (mensajes, iteración actual, todo.md) se guarda después de cada iteración.
// Si el usuario recarga, el frontend consulta el estado y puede continuar.

import { db } from "../db";
import type { ChatMessage as LLMChatMessage } from "../agents/opencode-adapter";

export interface AgentExecutionState {
  id: string;
  conversationId: string;
  userId: string;
  objective: string;
  status: "running" | "completed" | "failed" | "paused";
  currentIteration: number;
  maxIterations: number;
  messages: LLMChatMessage[];
  todoMarkdown: string | null;
  finalOutput: string | null;
  totalDuration: number;
  tokensUsed: number;
  cost: number;
  toolsUsed: string[];
  errorMessage: string | null;
  pausedForInput: boolean;
  pausePrompt: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

// Crear o recuperar una ejecución por conversationId
export async function getOrCreateExecution(
  conversationId: string,
  userId: string,
  objective: string,
  maxIterations: number = 50
): Promise<AgentExecutionState> {
  // Intentar recuperar ejecución existente
  const existing = await db.agentExecution.findUnique({
    where: { conversationId },
  });

  if (existing) {
    return deserialize(existing);
  }

  // Crear nueva
  const created = await db.agentExecution.create({
    data: {
      conversationId,
      userId,
      objective,
      status: "running",
      maxIterations,
      messages: JSON.stringify([
        { role: "system", content: "" },
        { role: "user", content: objective },
      ]),
    },
  });

  return deserialize(created);
}

// Guardar el estado después de cada iteración
export async function saveExecutionState(
  conversationId: string,
  updates: Partial<{
    status: AgentExecutionState["status"];
    currentIteration: number;
    messages: LLMChatMessage[];
    todoMarkdown: string;
    finalOutput: string;
    totalDuration: number;
    tokensUsed: number;
    cost: number;
    toolsUsed: string[];
    errorMessage: string;
    pausedForInput: boolean;
    pausePrompt: string;
  }>
): Promise<void> {
  const data: Record<string, unknown> = {};
  if (updates.status !== undefined) {
    data.status = updates.status;
    if (updates.status === "completed" || updates.status === "failed") {
      data.completedAt = new Date();
      if (updates.finalOutput !== undefined) data.finalOutput = updates.finalOutput;
      if (updates.errorMessage !== undefined) data.errorMessage = updates.errorMessage;
    }
  }
  if (updates.currentIteration !== undefined) data.currentIteration = updates.currentIteration;
  if (updates.messages !== undefined) data.messages = JSON.stringify(updates.messages);
  if (updates.todoMarkdown !== undefined) data.todoMarkdown = updates.todoMarkdown;
  if (updates.totalDuration !== undefined) data.totalDuration = updates.totalDuration;
  if (updates.tokensUsed !== undefined) data.tokensUsed = updates.tokensUsed;
  if (updates.cost !== undefined) data.cost = updates.cost;
  if (updates.toolsUsed !== undefined) data.toolsUsed = JSON.stringify(updates.toolsUsed);
  if (updates.pausedForInput !== undefined) data.pausedForInput = updates.pausedForInput;
  if (updates.pausePrompt !== undefined) data.pausePrompt = updates.pausePrompt;

  await db.agentExecution.update({
    where: { conversationId },
    data,
  });
}

// Obtener el estado de una ejecución (para resume tras recarga)
export async function getExecutionState(
  conversationId: string
): Promise<AgentExecutionState | null> {
  const record = await db.agentExecution.findUnique({
    where: { conversationId },
  });
  return record ? deserialize(record) : null;
}

// Listar ejecuciones activas de un usuario
export async function getActiveExecutions(
  userId: string
): Promise<AgentExecutionState[]> {
  const records = await db.agentExecution.findMany({
    where: { userId, status: "running" },
    orderBy: { updatedAt: "desc" },
  });
  return records.map(deserialize);
}

// Helper: deserializar record de DB a AgentExecutionState
function deserialize(record: any): AgentExecutionState {
  return {
    id: record.id,
    conversationId: record.conversationId,
    userId: record.userId,
    objective: record.objective,
    status: record.status,
    currentIteration: record.currentIteration,
    maxIterations: record.maxIterations,
    messages: JSON.parse(record.messages || "[]"),
    todoMarkdown: record.todoMarkdown,
    finalOutput: record.finalOutput,
    totalDuration: record.totalDuration,
    tokensUsed: record.tokensUsed,
    cost: record.cost,
    toolsUsed: JSON.parse(record.toolsUsed || "[]"),
    errorMessage: record.errorMessage,
    pausedForInput: record.pausedForInput,
    pausePrompt: record.pausePrompt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    completedAt: record.completedAt,
  };
}
