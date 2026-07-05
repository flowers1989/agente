import { NextResponse } from "next/server";
import { buildManager } from "@/lib/compilation/BuildManager";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { getIdentifier } from "@/lib/api/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const rate = withRateLimit(getIdentifier(request, `compile:status:${id}`), { windowMs: 60 * 1000, maxRequests: 60 });
  if (!rate.allowed) return rate.response;

  try {
    const build = buildManager.getBuild(id);

    if (!build) {
      return NextResponse.json({ error: "Build no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      buildId: build.id,
      status: build.status,
      progress: build.progress,
      logs: build.logs,
      artifacts: build.artifacts,
      error: build.error,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
