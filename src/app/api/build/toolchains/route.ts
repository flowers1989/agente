import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { getIdentifier } from "@/lib/api/auth";
import { getBuildService } from "@/lib/services/build-service";

// ==================== TOOLCHAINS CHECK ====================
// GET /api/build/toolchains
// Verifica qué toolchains nativas están disponibles en el sistema.

export async function GET(request: Request) {
  const rate = withRateLimit(getIdentifier(request, "build:toolchains"), {
    windowMs: 60 * 1000,
    maxRequests: 30,
  });
  if (!rate.allowed) return rate.response;

  const service = getBuildService();
  const toolchains = await service.checkToolchains();

  return NextResponse.json(toolchains);
}
