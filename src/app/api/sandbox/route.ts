import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { getIdentifier, getUserId } from "@/lib/api/auth";
import { validate } from "@/lib/api/validation";
import { z } from "zod";
import { getSandboxManager } from "@/lib/sandbox/SandboxManager";

const CreateSchema = z.object({
  taskId: z.string().min(1).max(200),
  networkMode: z.enum(["none", "allowlist"]).optional().default("none"),
  memoryMB: z.number().int().min(128).max(4096).optional(),
  cpus: z.number().int().min(1).max(8).optional(),
  ttlMinutes: z.number().int().min(5).max(1440).optional(), // 5 min — 24 h
});

export async function POST(request: Request) {
  const rate = withRateLimit(getIdentifier(request, "sandbox:create"), {
    windowMs: 60 * 1000,
    maxRequests: 10,
  });
  if (!rate.allowed) return rate.response;

  const userId = getUserId();

  const body = await request.json().catch(() => ({}));
  const validation = validate(CreateSchema, body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const manager = getSandboxManager();

  // Si Docker no está disponible, devolver error claro (no exponer stack trace).
  if (!(await manager.isAvailable())) {
    return NextResponse.json(
      { error: "Docker no está disponible. Inicia el daemon: sudo systemctl start docker" },
      { status: 503 }
    );
  }

  try {
    const sandbox = await manager.createSandbox(validation.data.taskId, userId, {
      networkMode: validation.data.networkMode,
      memoryMB: validation.data.memoryMB,
      cpus: validation.data.cpus,
      ttlMinutes: validation.data.ttlMinutes,
    });
    return NextResponse.json({
      sandbox: {
        taskId: sandbox.taskId,
        containerId: sandbox.containerId,
        createdAt: sandbox.createdAt,
        networkMode: sandbox.networkMode,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const rate = withRateLimit(getIdentifier(request, "sandbox:list"), {
    windowMs: 60 * 1000,
    maxRequests: 30,
  });
  if (!rate.allowed) return rate.response;

  return NextResponse.json({ available: await getSandboxManager().isAvailable() });
}
