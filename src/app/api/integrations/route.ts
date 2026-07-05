import { NextResponse } from "next/server";
import { integrationManager } from "@/lib/integrations/IntegrationManager";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { SaveCredentialsSchema, validate } from "@/lib/api/validation";
import { getIdentifier, getUserId } from "@/lib/api/auth";
import type { IntegrationSource } from "@/lib/integrations/types";

export async function GET(request: Request) {
  const rate = withRateLimit(getIdentifier(request, "integrations:list"), { windowMs: 60 * 1000, maxRequests: 60 });
  if (!rate.allowed) return rate.response;

  try {
    const userId = getUserId();
    const sources = await integrationManager.listConnectedSources(userId);
    return NextResponse.json({ sources });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const rate = withRateLimit(getIdentifier(request, "integrations:save-credentials"), { windowMs: 60 * 1000, maxRequests: 20 });
  if (!rate.allowed) return rate.response;

  try {
    const userId = getUserId();
    const body = await request.json().catch(() => ({}));
    const validation = validate(SaveCredentialsSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { source, expiresAt, scopes, ...rest } = validation.data;
    await integrationManager.saveCredentials(
      userId,
      source as IntegrationSource,
      {
        ...rest,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        scopes: Array.isArray(scopes) ? scopes : scopes?.split(","),
      },
      validation.data.name
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
