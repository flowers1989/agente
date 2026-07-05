import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { getIdentifier, getUserId } from "@/lib/api/auth";
import { validate } from "@/lib/api/validation";
import { z } from "zod";
import { getSandboxManager } from "@/lib/sandbox/SandboxManager";

const ExecSchema = z.object({
  command: z.string().min(1).max(50000),
  timeoutMs: z.number().int().min(1000).max(300000).optional(), // máx 5 min
  cwd: z.string().max(500).optional(),
});

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

// Ejecuta un comando shell en el sandbox de la tarea.
export async function POST(request: Request, { params }: RouteParams) {
  const { taskId } = await params;
  const rate = withRateLimit(getIdentifier(request, `sandbox:${taskId}:exec`), {
    windowMs: 60 * 1000,
    maxRequests: 60,
  });
  if (!rate.allowed) return rate.response;

  const userId = getUserId();
  const manager = getSandboxManager();

  if (!manager.belongsToUser(taskId, userId)) {
    return NextResponse.json({ error: "Sandbox no encontrado" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const validation = validate(ExecSchema, body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const result = await manager.exec(taskId, validation.data.command, {
      timeoutMs: validation.data.timeoutMs,
      cwd: validation.data.cwd,
    });
    return NextResponse.json({ success: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
