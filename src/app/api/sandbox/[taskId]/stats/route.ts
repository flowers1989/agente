// Estadísticas en vivo de un sandbox (CPU, RAM, PIDs).
// Para dashboard de monitoreo tipo Manus.

import { NextResponse } from "next/server";
import { getSandboxManager } from "@/lib/sandbox/SandboxManager";
import { getUserId, getIdentifier } from "@/lib/api/auth";
import { withRateLimit } from "@/lib/api/rate-limit-helper";

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { taskId } = await params;
  const rate = withRateLimit(getIdentifier(request, `sandbox:${taskId}:stats`), {
    windowMs: 10 * 1000,
    maxRequests: 30,
  });
  if (!rate.allowed) return rate.response;

  const userId = getUserId();
  const manager = getSandboxManager();

  if (!manager.belongsToUser(taskId, userId)) {
    return NextResponse.json({ error: "Sandbox no encontrado" }, { status: 404 });
  }

  const stats = await manager.getStats(taskId);
  return NextResponse.json({ stats });
}
