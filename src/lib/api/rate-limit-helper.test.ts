import { describe, it, expect } from "vitest";
import { withRateLimit } from "./rate-limit-helper";

describe("withRateLimit", () => {
  it("permite el primer request", () => {
    const result = withRateLimit(`test-${Date.now()}`, { windowMs: 1000, maxRequests: 1 });
    expect(result.allowed).toBe(true);
  });

  it("bloquea requests que exceden el límite", () => {
    const id = `test-block-${Date.now()}`;
    withRateLimit(id, { windowMs: 1000, maxRequests: 1 });
    const result = withRateLimit(id, { windowMs: 1000, maxRequests: 1 });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.response.status).toBe(429);
    }
  });
});
