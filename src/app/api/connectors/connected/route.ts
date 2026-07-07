import { NextResponse } from "next/server";
import { connectorManager } from "@/lib/integrations/ConnectorManager";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { getUserId, getIdentifier } from "@/lib/api/auth";

export async function GET(request: Request) {
  const rate = withRateLimit(getIdentifier(request, "connectors:connected"), {
    windowMs: 60 * 1000,
    maxRequests: 60,
  });
  if (!rate.allowed) return rate.response;

  try {
    const userId = getUserId();
    const all = await connectorManager.listConnectorStatus(userId);
    const connected = all
      .filter((c) => c.connected)
      .map((c) => ({
        source: c.source,
        name: c.name,
        description: c.description,
        actions: c.actions.map((a) => a.name),
      }));
    return NextResponse.json({ connected, count: connected.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}