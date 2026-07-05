import { NextResponse } from "next/server";
import { credentialManager } from "@/lib/integrations/managers/CredentialManager";
import { withRateLimit } from "@/lib/api/rate-limit-helper";

function getIdentifier(request: Request): string {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  return `connectors:app-credentials:${ip}`;
}

export async function GET(request: Request) {
  const rate = withRateLimit(getIdentifier(request), { windowMs: 60 * 1000, maxRequests: 60 });
  if (!rate.allowed) return rate.response;

  try {
    const credentials = await credentialManager.listAppCredentials();
    return NextResponse.json({ credentials });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
