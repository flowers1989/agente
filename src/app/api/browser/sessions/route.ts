import { NextResponse } from "next/server";
import { browserControlConnector } from "@/lib/browser/BrowserControlConnector";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { getIdentifier, getUserId } from "@/lib/api/auth";

export async function GET(request: Request) {
  const rate = withRateLimit(getIdentifier(request, "browser:sessions"), { windowMs: 60 * 1000, maxRequests: 30 });
  if (!rate.allowed) return rate.response;

  try {
    const userId = getUserId();
    const sessions = browserControlConnector.listSessions(userId);
    return NextResponse.json({ sessions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const rate = withRateLimit(getIdentifier(request, "browser:sessions:create"), { windowMs: 60 * 1000, maxRequests: 10 });
  if (!rate.allowed) return rate.response;

  try {
    const userId = getUserId();
    const body = await request.json().catch(() => ({}));
    const timeoutMs = body.timeoutMs ? Number(body.timeoutMs) : undefined;
    if (timeoutMs !== undefined && (Number.isNaN(timeoutMs) || timeoutMs < 1000 || timeoutMs > 60 * 60 * 1000)) {
      return NextResponse.json({ error: "timeoutMs debe estar entre 1000 y 3600000" }, { status: 400 });
    }

    const session = await browserControlConnector.createSession(userId, { timeoutMs });
    return NextResponse.json({ session: session.getInfo() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
