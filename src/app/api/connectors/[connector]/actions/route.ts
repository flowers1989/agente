import { NextResponse } from "next/server";
import { connectorManager } from "@/lib/integrations/ConnectorManager";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { ConnectorActionSchema, validate } from "@/lib/api/validation";
import { getIdentifier, getUserId } from "@/lib/api/auth";
import type { IntegrationSource } from "@/lib/integrations/types";

interface RouteParams {
  params: Promise<{ connector: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { connector } = await params;
  const rate = withRateLimit(getIdentifier(request, `connectors:actions:${connector}`), { windowMs: 60 * 1000, maxRequests: 60 });
  if (!rate.allowed) return rate.response;

  try {
    const def = connectorManager.getDefinition(connector as IntegrationSource);
    return NextResponse.json({ actions: def.actions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const { connector } = await params;
  const rate = withRateLimit(getIdentifier(request, `connectors:execute:${connector}`), { windowMs: 60 * 1000, maxRequests: 30 });
  if (!rate.allowed) return rate.response;

  try {
    const userId = getUserId();
    const body = await request.json().catch(() => ({}));
    const validation = validate(ConnectorActionSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { action, params: actionParams } = validation.data;
    const result = await connectorManager.executeAction(userId, connector as IntegrationSource, {
      action,
      params: actionParams,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
