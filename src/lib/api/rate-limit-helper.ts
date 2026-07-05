import { NextResponse } from "next/server";
import { checkRateLimit, type RateLimitConfig } from "@/lib/rate-limit";

export function withRateLimit(
  identifier: string,
  config?: RateLimitConfig
): { allowed: true } | { allowed: false; response: NextResponse } {
  const result = checkRateLimit(identifier, config);
  if (!result.allowed) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: "Rate limit exceeded", retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000) },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(result.limit),
            "X-RateLimit-Remaining": String(result.remaining),
            "X-RateLimit-Reset": String(result.resetAt),
            "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          },
        }
      ),
    };
  }
  return { allowed: true };
}
