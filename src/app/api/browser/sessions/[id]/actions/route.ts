import { NextResponse } from "next/server";
import { browserControlConnector } from "@/lib/browser/BrowserControlConnector";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { BrowserActionSchema, validate } from "@/lib/api/validation";
import { getIdentifier, getUserId } from "@/lib/api/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const rate = withRateLimit(getIdentifier(request, `browser:session:${id}:actions`), { windowMs: 60 * 1000, maxRequests: 60 });
  if (!rate.allowed) return rate.response;

  try {
    const userId = getUserId();
    if (!browserControlConnector.belongsToUser(id, userId)) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const validation = validate(BrowserActionSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { action, params: actionParams } = validation.data;
    const result = await browserControlConnector.executeAction(id, action, actionParams);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
