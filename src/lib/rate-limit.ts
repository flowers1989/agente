// ==================== RATE LIMITING ====================
// Limitador simple en memoria para endpoints sensibles.
// En producción con múltiples instancias se debería reemplazar por Redis.

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

function cleanup(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

setInterval(cleanup, 60 * 1000);

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { windowMs: 60 * 1000, maxRequests: 30 }
): { allowed: boolean; limit: number; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = identifier;
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + config.windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, limit: config.maxRequests, remaining: config.maxRequests - 1, resetAt };
  }

  entry.count += 1;
  const remaining = Math.max(0, config.maxRequests - entry.count);
  return {
    allowed: entry.count <= config.maxRequests,
    limit: config.maxRequests,
    remaining,
    resetAt: entry.resetAt,
  };
}
