import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { getIdentifier, getUserId } from "@/lib/api/auth";
import { cronManager } from "@/lib/cron/cron-manager";

// ==================== ENDPOINT: /api/cron ====================
// GET    /api/cron              → Listar tareas del usuario
// POST   /api/cron              → Crear tarea
// PATCH  /api/cron?id=...       → Activar/desactivar tarea
// DELETE /api/cron?id=...       → Eliminar tarea

export async function GET(request: Request) {
  const rate = withRateLimit(getIdentifier(request, "cron:get"), { windowMs: 60000, maxRequests: 60 });
  if (!rate.allowed) return rate.response;
  try {
    const userId = getUserId();
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("id");

    if (taskId) {
      const logs = await cronManager.getTaskLogs(taskId, 20);
      return NextResponse.json({ logs });
    }

    const tasks = await cronManager.listTasks(userId);
    return NextResponse.json({ tasks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const rate = withRateLimit(getIdentifier(request, "cron:post"), { windowMs: 60000, maxRequests: 20 });
  if (!rate.allowed) return rate.response;
  try {
    const userId = getUserId();
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      description?: string;
      cronExpression?: string;
      conversationId?: string;
    };

    const { name, description, cronExpression, conversationId } = body;
    if (!name || !description || !cronExpression) {
      return NextResponse.json(
        { error: "Se requieren: name, description, cronExpression" },
        { status: 400 }
      );
    }

    const task = await cronManager.createTask({ userId, name, description, cronExpression, conversationId });
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const rate = withRateLimit(getIdentifier(request, "cron:patch"), { windowMs: 60000, maxRequests: 30 });
  if (!rate.allowed) return rate.response;
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("id");
    if (!taskId) return NextResponse.json({ error: "Parámetro 'id' requerido" }, { status: 400 });

    const body = (await request.json().catch(() => ({}))) as { enabled?: boolean };
    if (body.enabled === undefined) {
      return NextResponse.json({ error: "Parámetro 'enabled' requerido" }, { status: 400 });
    }

    const task = await cronManager.toggleTask(taskId, body.enabled);
    return NextResponse.json({ task });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const rate = withRateLimit(getIdentifier(request, "cron:delete"), { windowMs: 60000, maxRequests: 20 });
  if (!rate.allowed) return rate.response;
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("id");
    if (!taskId) return NextResponse.json({ error: "Parámetro 'id' requerido" }, { status: 400 });

    await cronManager.deleteTask(taskId);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
