import { NextResponse } from "next/server";
import { browserControlConnector } from "@/lib/browser/BrowserControlConnector";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { getIdentifier, getUserId } from "@/lib/api/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const rate = withRateLimit(getIdentifier(request, `browser:session:${id}`), { windowMs: 60 * 1000, maxRequests: 60 });
  if (!rate.allowed) return rate.response;

  try {
    const userId = getUserId();
    if (!browserControlConnector.belongsToUser(id, userId)) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    }

    const session = browserControlConnector.getSession(id);
    if (!session) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ session: session.getInfo() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const rate = withRateLimit(getIdentifier(request, `browser:session:${id}:delete`), { windowMs: 60 * 1000, maxRequests: 20 });
  if (!rate.allowed) return rate.response;

  try {
    const userId = getUserId();
    if (!browserControlConnector.belongsToUser(id, userId)) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    }

    await browserControlConnector.closeSession(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
