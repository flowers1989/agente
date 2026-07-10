// Lista sandboxes activos del usuario (o todos si es admin).
// Útil para dashboard de monitoreo tipo Manus.

import { NextResponse } from "next/server";
import { getSandboxManager } from "@/lib/sandbox/SandboxManager";
import { getUserId, getIdentifier } from "@/lib/api/auth";
import { withRateLimit } from "@/lib/api/rate-limit-helper";

export async function GET(request: Request) {
  const rate = withRateLimit(getIdentifier(request, "sandbox:list"), {
    windowMs: 60 * 1000,
    maxRequests: 30,
  });
  if (!rate.allowed) return rate.response;

  const userId = getUserId();
  const manager = getSandboxManager();
  const sessions = await manager.listActiveSandboxes(userId);

  return NextResponse.json({
    sandboxes: sessions.map((s) => ({
      taskId: s.taskId,
      containerId: s.containerId,
      networkMode: s.networkMode,
      createdAt: s.createdAt,
      lastActivityAt: s.lastActivityAt,
      expiresAt: s.expiresAt,
      secondsUntilExpiry: Math.max(
        0,
        Math.floor((s.expiresAt.getTime() - Date.now()) / 1000)
      ),
    })),
  });
}
