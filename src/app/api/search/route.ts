import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { validate } from "@/lib/api/validation";
import { getIdentifier } from "@/lib/api/auth";
import { z } from "zod";
import { searchWeb, type SearchResult } from "@/lib/search/search-web";

const SearchSchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(10).optional().default(5),
});

export type SearchRequest = z.infer<typeof SearchSchema>;
export type { SearchResult };

export async function POST(request: Request) {
  const rate = withRateLimit(getIdentifier(request, "web:search"), {
    windowMs: 60 * 1000,
    maxRequests: 20,
  });
  if (!rate.allowed) return rate.response;

  try {
    const body = await request.json().catch(() => ({}));
    const validation = validate(SearchSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { query, limit } = validation.data;
    const results = await searchWeb(query, limit);

    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
