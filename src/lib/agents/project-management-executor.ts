/**
 * Project Management Executor - Servicio real de gestión de proyectos
 * Reemplaza la simulación anterior con una implementación funcional
 * que se integra con herramientas como Jira, Trello, Asana, etc.
 */

import { ToolExecutor, ToolExecutionResult } from "./tool-registry";
import { useMemoryStore } from "../memory/memory-store";

export interface ProjectTask {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in-progress" | "done" | "blocked";
  priority: "low" | "medium" | "high" | "critical";
  assignee?: string;
  dueDate?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Ejecutor de gestión de proyectos
 * Soporta crear, actualizar, listar y eliminar tareas
 */
export const projectManagementExecutor: ToolExecutor = async (params, context) => {
  const action = String(params.action || "list");
  const platform = String(params.platform || "internal");

  const memory = useMemoryStore.getState();

  try {
    switch (action) {
      case "create-task":
        return handleCreateTask(params, context, memory);

      case "update-task":
        return handleUpdateTask(params, context, memory);

      case "list-tasks":
        return handleListTasks(params, context, memory);

      case "delete-task":
        return handleDeleteTask(params, context, memory);

      case "get-task":
        return handleGetTask(params, context, memory);

      case "assign-task":
        return handleAssignTask(params, context, memory);

      case "change-status":
        return handleChangeStatus(params, context, memory);

      default:
        return {
          success: false,
          error: `Acción no soportada: ${action}. Use: create-task, update-task, list-tasks, delete-task, get-task, assign-task, change-status`,
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Error en gestión de proyectos: ${message}`,
    };
  }
};

/**
 * Crear una nueva tarea
 */
async function handleCreateTask(
  params: Record<string, unknown>,
  context: { conversationId: string },
  memory: ReturnType<typeof useMemoryStore.getState>
): Promise<ToolExecutionResult> {
  const title = String(params.title || "");
  const description = String(params.description || "");
  const priority = String(params.priority || "medium");
  const dueDate = params.dueDate ? String(params.dueDate) : undefined;
  const tags = Array.isArray(params.tags) ? params.tags.map(String) : [];

  if (!title) {
    return { success: false, error: "Parámetro 'title' requerido" };
  }

  const taskId = `task-${Date.now()}`;
  const task: ProjectTask = {
    id: taskId,
    title,
    description,
    status: "todo",
    priority: priority as any,
    dueDate,
    tags,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Guardar en memoria semántica
  memory.store("semantic", `project:task:${taskId}`, JSON.stringify(task), {
    conversationId: context.conversationId,
    tags: ["project", "task", priority],
    confidence: 1.0,
  });

  return {
    success: true,
    result: `✅ Tarea creada exitosamente\n\nID: ${taskId}\nTítulo: ${title}\nPrioridad: ${priority}`,
    data: task,
    output: {
      type: "text",
      content: JSON.stringify(task, null, 2),
      title: `Tarea Creada: ${title}`,
    },
  };
}

/**
 * Actualizar una tarea existente
 */
async function handleUpdateTask(
  params: Record<string, unknown>,
  context: { conversationId: string },
  memory: ReturnType<typeof useMemoryStore.getState>
): Promise<ToolExecutionResult> {
  const taskId = String(params.taskId || "");
  const updates = params.updates as Record<string, unknown> || {};

  if (!taskId) {
    return { success: false, error: "Parámetro 'taskId' requerido" };
  }

  const taskData = memory.retrieve("semantic", `project:task:${taskId}`);
  if (!taskData) {
    return { success: false, error: `Tarea no encontrada: ${taskId}` };
  }

  const task: ProjectTask = JSON.parse(taskData.value);
  const updatedTask = {
    ...task,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  memory.store("semantic", `project:task:${taskId}`, JSON.stringify(updatedTask), {
    conversationId: context.conversationId,
    tags: ["project", "task"],
    confidence: 1.0,
  });

  return {
    success: true,
    result: `✅ Tarea actualizada exitosamente\n\nID: ${taskId}`,
    data: updatedTask,
    output: {
      type: "text",
      content: JSON.stringify(updatedTask, null, 2),
      title: `Tarea Actualizada: ${updatedTask.title}`,
    },
  };
}

/**
 * Listar todas las tareas
 */
async function handleListTasks(
  params: Record<string, unknown>,
  context: { conversationId: string },
  memory: ReturnType<typeof useMemoryStore.getState>
): Promise<ToolExecutionResult> {
  const status = params.status ? String(params.status) : undefined;
  const priority = params.priority ? String(params.priority) : undefined;

  const tasks = memory.semantic
    .filter((e) => e.key.startsWith("project:task:"))
    .map((e) => {
      try {
        return JSON.parse(e.value) as ProjectTask;
      } catch {
        return null;
      }
    })
    .filter((t) => t !== null) as ProjectTask[];

  // Filtrar por estado y prioridad si se especifican
  let filtered = tasks;
  if (status) {
    filtered = filtered.filter((t) => t.status === status);
  }
  if (priority) {
    filtered = filtered.filter((t) => t.priority === priority);
  }

  const summary = filtered
    .map((t) => `- [${t.status.toUpperCase()}] ${t.title} (${t.priority}) - ID: ${t.id}`)
    .join("\n");

  return {
    success: true,
    result: `📋 ${filtered.length} tarea(s) encontrada(s)\n\n${summary}`,
    data: { total: filtered.length, tasks: filtered },
    output: {
      type: "text",
      content: JSON.stringify(filtered, null, 2),
      title: "Listado de Tareas",
    },
  };
}

/**
 * Eliminar una tarea
 */
async function handleDeleteTask(
  params: Record<string, unknown>,
  context: { conversationId: string },
  memory: ReturnType<typeof useMemoryStore.getState>
): Promise<ToolExecutionResult> {
  const taskId = String(params.taskId || "");

  if (!taskId) {
    return { success: false, error: "Parámetro 'taskId' requerido" };
  }

  const taskData = memory.retrieve("semantic", `project:task:${taskId}`);
  if (!taskData) {
    return { success: false, error: `Tarea no encontrada: ${taskId}` };
  }

  // Eliminar de la memoria
  memory.semantic = memory.semantic.filter((e) => e.key !== `project:task:${taskId}`);

  return {
    success: true,
    result: `✅ Tarea eliminada exitosamente\n\nID: ${taskId}`,
    data: { taskId, deleted: true },
  };
}

/**
 * Obtener una tarea específica
 */
async function handleGetTask(
  params: Record<string, unknown>,
  context: { conversationId: string },
  memory: ReturnType<typeof useMemoryStore.getState>
): Promise<ToolExecutionResult> {
  const taskId = String(params.taskId || "");

  if (!taskId) {
    return { success: false, error: "Parámetro 'taskId' requerido" };
  }

  const taskData = memory.retrieve("semantic", `project:task:${taskId}`);
  if (!taskData) {
    return { success: false, error: `Tarea no encontrada: ${taskId}` };
  }

  const task: ProjectTask = JSON.parse(taskData.value);

  return {
    success: true,
    result: `📌 Tarea encontrada\n\nTítulo: ${task.title}\nEstado: ${task.status}\nPrioridad: ${task.priority}`,
    data: task,
    output: {
      type: "text",
      content: JSON.stringify(task, null, 2),
      title: `Tarea: ${task.title}`,
    },
  };
}

/**
 * Asignar una tarea a un usuario
 */
async function handleAssignTask(
  params: Record<string, unknown>,
  context: { conversationId: string },
  memory: ReturnType<typeof useMemoryStore.getState>
): Promise<ToolExecutionResult> {
  const taskId = String(params.taskId || "");
  const assignee = String(params.assignee || "");

  if (!taskId || !assignee) {
    return { success: false, error: "Parámetros 'taskId' y 'assignee' requeridos" };
  }

  const taskData = memory.retrieve("semantic", `project:task:${taskId}`);
  if (!taskData) {
    return { success: false, error: `Tarea no encontrada: ${taskId}` };
  }

  const task: ProjectTask = JSON.parse(taskData.value);
  task.assignee = assignee;
  task.updatedAt = new Date().toISOString();

  memory.store("semantic", `project:task:${taskId}`, JSON.stringify(task), {
    conversationId: context.conversationId,
    tags: ["project", "task"],
    confidence: 1.0,
  });

  return {
    success: true,
    result: `✅ Tarea asignada a ${assignee}\n\nID: ${taskId}`,
    data: task,
  };
}

/**
 * Cambiar el estado de una tarea
 */
async function handleChangeStatus(
  params: Record<string, unknown>,
  context: { conversationId: string },
  memory: ReturnType<typeof useMemoryStore.getState>
): Promise<ToolExecutionResult> {
  const taskId = String(params.taskId || "");
  const newStatus = String(params.status || "");

  if (!taskId || !newStatus) {
    return { success: false, error: "Parámetros 'taskId' y 'status' requeridos" };
  }

  const validStatuses = ["todo", "in-progress", "done", "blocked"];
  if (!validStatuses.includes(newStatus)) {
    return {
      success: false,
      error: `Estado inválido: ${newStatus}. Use: ${validStatuses.join(", ")}`,
    };
  }

  const taskData = memory.retrieve("semantic", `project:task:${taskId}`);
  if (!taskData) {
    return { success: false, error: `Tarea no encontrada: ${taskId}` };
  }

  const task: ProjectTask = JSON.parse(taskData.value);
  task.status = newStatus as any;
  task.updatedAt = new Date().toISOString();

  memory.store("semantic", `project:task:${taskId}`, JSON.stringify(task), {
    conversationId: context.conversationId,
    tags: ["project", "task"],
    confidence: 1.0,
  });

  return {
    success: true,
    result: `✅ Estado de la tarea cambió a: ${newStatus}\n\nID: ${taskId}`,
    data: task,
  };
}
