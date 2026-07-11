import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { getIdentifier, getUserId } from "@/lib/api/auth";
import { getSandboxManager } from "@/lib/sandbox/SandboxManager";

// ==================== VNC URL ENDPOINT ====================
// GET /api/sandbox/[taskId]/vnc
// Devuelve la URL de noVNC para ver el escritorio del sandbox en el navegador.
// POST /api/sandbox/[taskId]/vnc
// Abre un navegador Chromium dentro del sandbox (visible en el VNC).

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { taskId } = await params;
  const rate = withRateLimit(getIdentifier(request, `sandbox:${taskId}:vnc`), {
    windowMs: 60 * 1000,
    maxRequests: 60,
  });
  if (!rate.allowed) return rate.response;

  const userId = getUserId();
  const manager = getSandboxManager();

  if (!manager.belongsToUser(taskId, userId)) {
    return NextResponse.json({ error: "Sandbox no encontrado" }, { status: 404 });
  }

  const vncInfo = await manager.getVncUrl(taskId);
  if (!vncInfo) {
    return NextResponse.json(
      { error: "VNC no disponible. El sandbox podría no tener escritorio virtual.", available: false },
      { status: 503 }
    );
  }

  return NextResponse.json({
    available: true,
    ...vncInfo,
  });
}

export async function POST(request: Request, { params }: RouteParams) {
  const { taskId } = await params;
  const rate = withRateLimit(getIdentifier(request, `sandbox:${taskId}:vnc:open`), {
    windowMs: 60 * 1000,
    maxRequests: 20,
  });
  if (!rate.allowed) return rate.response;

  const userId = getUserId();
  const manager = getSandboxManager();

  if (!manager.belongsToUser(taskId, userId)) {
    return NextResponse.json({ error: "Sandbox no encontrado" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const url = (body as { url?: string }).url || "https://www.google.com";

  const success = await manager.openBrowserInSandbox(taskId, url);
  if (!success) {
    return NextResponse.json({ error: "No se pudo abrir el navegador en el sandbox" }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: `Navegador abierto en ${url}` });
}
