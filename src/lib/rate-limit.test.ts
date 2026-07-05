import { describe, it, expect } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  it("permite requests dentro del límite", () => {
    const id = `test-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(id, { windowMs: 1000, maxRequests: 5 });
      expect(result.allowed).toBe(true);
    }
  });

  it("bloquea requests que exceden el límite", () => {
    const id = `test-block-${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      checkRateLimit(id, { windowMs: 1000, maxRequests: 3 });
    }
    const result = checkRateLimit(id, { windowMs: 1000, maxRequests: 3 });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});
