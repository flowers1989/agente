import { NextResponse } from "next/server";
import { connectorManager } from "@/lib/integrations/ConnectorManager";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { getIdentifier, getUserId } from "@/lib/api/auth";
import type { IntegrationSource } from "@/lib/integrations/types";

export async function GET(request: Request) {
  const rate = withRateLimit(getIdentifier(request, "connectors:oauth-callback"), { windowMs: 60 * 1000, maxRequests: 30 });
  if (!rate.allowed) return rate.response;

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const source = searchParams.get("source");

    if (!code || !source) {
      return NextResponse.json({ error: "code y source son requeridos" }, { status: 400 });
    }

    // El state contiene userId en flujo real. Fallback al usuario actual.
    const userId = state ? Buffer.from(state, "base64url").toString().split(":")[0] : getUserId();

    await connectorManager.handleOAuthCallback(source as IntegrationSource, code, userId);

    return NextResponse.json({ success: true, source });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
