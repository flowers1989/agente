import { NextResponse } from "next/server";
import { buildManager } from "@/lib/compilation/BuildManager";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { CompileRequestSchema, validate } from "@/lib/api/validation";
import { getIdentifier, getUserId } from "@/lib/api/auth";
import type { CompileRequest } from "@/lib/compilation/types";

export async function POST(request: Request) {
  const rate = withRateLimit(getIdentifier(request, "compile:create"), { windowMs: 60 * 1000, maxRequests: 10 });
  if (!rate.allowed) return rate.response;

  try {
    const body = await request.json().catch(() => ({}));
    const validation = validate(CompileRequestSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const build = await buildManager.createBuild(validation.data as CompileRequest);

    void buildManager.runBuild(build.id).catch((error) => {
      console.error(`[BuildManager] Error ejecutando build ${build.id}:`, error);
    });

    return NextResponse.json({
      buildId: build.id,
      status: build.status,
      artifacts: build.artifacts,
      estimatedTime: build.estimatedTime,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const rate = withRateLimit(getIdentifier(request, "compile:list"), { windowMs: 60 * 1000, maxRequests: 60 });
  if (!rate.allowed) return rate.response;

  try {
    const builds = buildManager.listBuilds();
    return NextResponse.json({ builds });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
