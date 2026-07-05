import { NextResponse } from "next/server";
import { connectorManager } from "@/lib/integrations/ConnectorManager";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { getIdentifier, getUserId } from "@/lib/api/auth";
import type { IntegrationSource } from "@/lib/integrations/types";

interface RouteParams {
  params: Promise<{ connector: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { connector } = await params;
  const rate = withRateLimit(getIdentifier(request, `connectors:oauth:${connector}`), { windowMs: 60 * 1000, maxRequests: 20 });
  if (!rate.allowed) return rate.response;

  try {
    const userId = getUserId();
    const state = Buffer.from(`${userId}:${connector}:${Date.now()}`).toString("base64url");
    const url = await connectorManager.getOAuthUrl(userId, connector as IntegrationSource, state);
    return NextResponse.json({ url, state });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
