import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { getIdentifier, getUserId } from "@/lib/api/auth";
import { getSandboxManager } from "@/lib/sandbox/SandboxManager";

// ==================== DEV SERVERS ENDPOINT ====================
// GET /api/sandbox/[taskId]/dev-servers
// Lista todos los dev servers que el agente ha levantado en el sandbox.
// El usuario puede abrir estas URLs en su navegador real.

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { taskId } = await params;
  const rate = withRateLimit(getIdentifier(request, `sandbox:${taskId}:devservers`), {
    windowMs: 60 * 1000,
    maxRequests: 60,
  });
  if (!rate.allowed) return rate.response;

  const userId = getUserId();
  const manager = getSandboxManager();

  if (!manager.belongsToUser(taskId, userId)) {
    return NextResponse.json({ error: "Sandbox no encontrado" }, { status: 404 });
  }

  const devServers = await manager.getDevServerUrls(taskId);

  return NextResponse.json({
    devServers,
    count: devServers.length,
  });
}
