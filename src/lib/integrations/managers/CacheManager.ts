// ==================== CACHE MANAGER ====================
// Caché en memoria simple con TTL para recursos de integraciones.

export class CacheManager {
  private cache = new Map<
    string,
    { data: unknown; expiresAt: Date }
  >();
  private ttlMs: number;

  constructor(ttlMs = 5 * 60 * 1000) {
    this.ttlMs = ttlMs;
    this.startCleanupInterval();
  }

  private generateKey(key: string, filters?: unknown): string {
    return `${key}:${JSON.stringify(filters || {})}`;
  }

  set<T>(key: string, filters: unknown | undefined, data: T): void {
    const cacheKey = this.generateKey(key, filters);
    this.cache.set(cacheKey, {
      data,
      expiresAt: new Date(Date.now() + this.ttlMs),
    });
  }

  get<T>(key: string, filters?: unknown | undefined): T | null {
    const cacheKey = this.generateKey(key, filters);
    const entry = this.cache.get(cacheKey);

    if (!entry) return null;
    if (new Date() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.data as T;
  }

  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      const now = new Date();
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key);
        }
      }
    }, 60 * 1000);
  }
}

export const cacheManager = new CacheManager();
