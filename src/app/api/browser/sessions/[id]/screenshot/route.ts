import { NextResponse } from "next/server";
import { browserControlConnector } from "@/lib/browser/BrowserControlConnector";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { getIdentifier, getUserId } from "@/lib/api/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const rate = withRateLimit(getIdentifier(request, `browser:session:${id}:screenshot`), { windowMs: 60 * 1000, maxRequests: 30 });
  if (!rate.allowed) return rate.response;

  try {
    const userId = getUserId();
    if (!browserControlConnector.belongsToUser(id, userId)) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    }

    const result = await browserControlConnector.executeAction(id, "screenshot", {});
    if (!result.success || !result.screenshot) {
      return NextResponse.json({ error: result.error || "No se pudo tomar screenshot" }, { status: 500 });
    }

    const buffer = Buffer.from(result.screenshot, "base64");
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
