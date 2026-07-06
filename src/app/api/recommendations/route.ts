import { NextResponse } from "next/server";
import { extractRequirements } from "@/lib/compilation/analyzer";
import { getRecommendations } from "@/lib/compilation/recommender";
import type { AppRequirements } from "@/lib/compilation/types";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { RecommendationsSchema, validate } from "@/lib/api/validation";
import { getIdentifier } from "@/lib/api/auth";

export async function POST(request: Request) {
  const rate = withRateLimit(getIdentifier(request, "recommendations"), { windowMs: 60 * 1000, maxRequests: 30 });
  if (!rate.allowed) return rate.response;

  try {
    const body = await request.json().catch(() => ({}));
    const validation = validate(RecommendationsSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { objective, requirements } = validation.data;
    const finalRequirements = requirements || extractRequirements(objective || "");
    const recommendations = getRecommendations(finalRequirements as AppRequirements);

    return NextResponse.json({ requirements: finalRequirements, recommendations });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
