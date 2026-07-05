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
  const rate = withRateLimit(getIdentifier(request, `connectors:status:${connector}`), { windowMs: 60 * 1000, maxRequests: 60 });
  if (!rate.allowed) return rate.response;

  try {
    const userId = getUserId();
    const valid = await connectorManager.validateConnection(userId, connector as IntegrationSource);
    return NextResponse.json({ connected: valid });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ connected: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { connector } = await params;
  const rate = withRateLimit(getIdentifier(request, `connectors:disconnect:${connector}`), { windowMs: 60 * 1000, maxRequests: 20 });
  if (!rate.allowed) return rate.response;

  try {
    const userId = getUserId();
    await connectorManager.deleteCredentials(userId, connector as IntegrationSource);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
