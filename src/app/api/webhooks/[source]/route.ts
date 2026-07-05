import { NextResponse } from "next/server";
import { webhookManager } from "@/lib/integrations/managers/WebhookManager";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { getIdentifier } from "@/lib/api/auth";
import type { IntegrationSource } from "@/lib/integrations/types";

interface RouteParams {
  params: Promise<{ source: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { source } = await params;
  const rate = withRateLimit(getIdentifier(request, `webhooks:${source}`), { windowMs: 60 * 1000, maxRequests: 60 });
  if (!rate.allowed) return rate.response;

  try {
    const result = await webhookManager.processWebhook(source as IntegrationSource, request);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ received: false, error: message }, { status: 500 });
  }
}
