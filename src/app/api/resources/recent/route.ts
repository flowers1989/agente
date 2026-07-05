import { NextResponse } from "next/server";
import { integrationManager } from "@/lib/integrations/IntegrationManager";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { getIdentifier, getUserId } from "@/lib/api/auth";

export async function GET(request: Request) {
  const rate = withRateLimit(getIdentifier(request, "resources:recent"), { windowMs: 60 * 1000, maxRequests: 60 });
  if (!rate.allowed) return rate.response;

  try {
    const userId = getUserId();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 100);

    if (Number.isNaN(limit) || limit < 1) {
      return NextResponse.json({ error: "limit debe ser un número positivo" }, { status: 400 });
    }

    const resources = await integrationManager.getRecentResources(userId, limit);
    return NextResponse.json({ resources });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
