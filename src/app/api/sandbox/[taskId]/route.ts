import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { getIdentifier, getUserId } from "@/lib/api/auth";
import { getSandboxManager } from "@/lib/sandbox/SandboxManager";

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { taskId } = await params;
  const rate = withRateLimit(getIdentifier(request, `sandbox:${taskId}`), {
    windowMs: 60 * 1000,
    maxRequests: 60,
  });
  if (!rate.allowed) return rate.response;

  const userId = getUserId();
  const manager = getSandboxManager();

  if (!manager.belongsToUser(taskId, userId)) {
    return NextResponse.json({ error: "Sandbox no encontrado" }, { status: 404 });
  }

  const sandbox = manager.getSandbox(taskId);
  if (!sandbox) {
    return NextResponse.json({ error: "Sandbox no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    sandbox: {
      taskId: sandbox.taskId,
      containerId: sandbox.containerId,
      createdAt: sandbox.createdAt,
      active: sandbox.isActive(),
    },
  });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { taskId } = await params;
  const rate = withRateLimit(getIdentifier(request, `sandbox:${taskId}`), {
    windowMs: 60 * 1000,
    maxRequests: 20,
  });
  if (!rate.allowed) return rate.response;

  const userId = getUserId();
  const manager = getSandboxManager();

  if (!manager.belongsToUser(taskId, userId)) {
    return NextResponse.json({ error: "Sandbox no encontrado" }, { status: 404 });
  }

  try {
    await manager.stopSandbox(taskId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
