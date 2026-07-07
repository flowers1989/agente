import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { getIdentifier } from "@/lib/api/auth";
import { validate } from "@/lib/api/validation";
import { z } from "zod";
import { fetchUrl } from "@/lib/search/web-fetch";

const WebFetchSchema = z.object({
  url: z.string().url(),
  timeoutMs: z.number().int().min(1000).max(30000).optional().default(20000),
});

export async function POST(request: Request) {
  const rate = withRateLimit(getIdentifier(request, "web:fetch"), {
    windowMs: 60 * 1000,
    maxRequests: 30,
  });
  if (!rate.allowed) return rate.response;

  try {
    const body = await request.json().catch(() => ({}));
    const validation = validate(WebFetchSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { url, timeoutMs } = validation.data;
    const result = await fetchUrl(url, { timeoutMs });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}