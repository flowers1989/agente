// ==================== MEMORY DB ====================
// Capa de persistencia de la memoria del agente usando Prisma (SQLite).
// Complementa el memory-store (localStorage) con almacenamiento en base de datos
// para que la memoria sobreviva entre dispositivos y sesiones.
//
// Uso:
//   import { memoryDb } from "@/lib/memory/memory-db";
//   await memoryDb.store("episodic", "task:abc", "...", { userId, tags: ["task"] });
//   const entries = await memoryDb.query({ userId, type: "episodic", limit: 10 });

import { db as prisma } from "@/lib/db";

export interface MemoryDbEntry {
  id: string;
  userId: string;
  type: "episodic" | "semantic" | "working";
  key: string;
  value: string;
  tags: string[];
  confidence: number;
  conversationId?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryQueryOptions {
  userId: string;
  type?: "episodic" | "semantic" | "working";
  conversationId?: string;
  tags?: string[];
  limit?: number;
  search?: string;
}

export interface MemoryStoreOptions {
  userId: string;
  tags?: string[];
  confidence?: number;
  conversationId?: string;
  expiresAt?: Date;
  ttlMs?: number; // Alternativa a expiresAt
}

class MemoryDb {
  /**
   * Guarda o actualiza una entrada de memoria en la base de datos.
   * Si ya existe una entrada con el mismo userId + type + key, la actualiza.
   */
  async store(
    type: "episodic" | "semantic" | "working",
    key: string,
    value: string,
    options: MemoryStoreOptions
  ): Promise<MemoryDbEntry> {
    const { userId, tags = [], confidence = 1.0, conversationId, expiresAt, ttlMs } = options;
    const resolvedExpiresAt = expiresAt ?? (ttlMs ? new Date(Date.now() + ttlMs) : undefined);

    const data = {
      userId,
      type,
      key,
      value,
      tags: JSON.stringify(tags),
      confidence,
      conversationId: conversationId ?? null,
      expiresAt: resolvedExpiresAt ?? null,
    };

    const entry = await prisma.memoryEntry.upsert({
      where: { id: `${userId}:${type}:${key}` },
      create: { id: `${userId}:${type}:${key}`, ...data },
      update: { value, tags: JSON.stringify(tags), confidence, updatedAt: new Date() },
    });

    return this.deserialize(entry);
  }

  /**
   * Recupera entradas de memoria según los criterios dados.
   */
  async query(options: MemoryQueryOptions): Promise<MemoryDbEntry[]> {
    const { userId, type, conversationId, tags, limit = 50, search } = options;

    const entries = await prisma.memoryEntry.findMany({
      where: {
        userId,
        ...(type ? { type } : {}),
        ...(conversationId ? { conversationId } : {}),
        // Filtrar entradas expiradas
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { updatedAt: "desc" },
      take: limit * 3, // Traer más para filtrar por tags/search en memoria
    });

    let results = entries.map(this.deserialize);

    // Filtrar por tags si se especifican
    if (tags && tags.length > 0) {
      results = results.filter((e) => tags.some((t) => e.tags.includes(t)));
    }

    // Filtrar por búsqueda de texto
    if (search) {
      const searchLower = search.toLowerCase();
      results = results.filter(
        (e) =>
          e.key.toLowerCase().includes(searchLower) ||
          e.value.toLowerCase().includes(searchLower)
      );
    }

    return results.slice(0, limit);
  }

  /**
   * Obtiene el contexto relevante para una tarea dada.
   * Busca en episódica y semántica por palabras clave del objetivo.
   */
  async getRelevantContext(userId: string, objective: string, limit = 5): Promise<MemoryDbEntry[]> {
    const keywords = objective
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 8);

    if (keywords.length === 0) return [];

    // Traer entradas recientes de episódica y semántica
    const candidates = await prisma.memoryEntry.findMany({
      where: {
        userId,
        type: { in: ["episodic", "semantic"] },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });

    // Scoring por relevancia
    const scored = candidates
      .map((entry) => {
        const text = `${entry.key} ${entry.value}`.toLowerCase();
        const score = keywords.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0);
        return { entry: this.deserialize(entry), score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score || b.entry.confidence - a.entry.confidence);

    return scored.slice(0, limit).map((s) => s.entry);
  }

  /**
   * Elimina una entrada de memoria por userId + type + key.
   */
  async delete(userId: string, type: string, key: string): Promise<void> {
    await prisma.memoryEntry.deleteMany({ where: { userId, type, key } });
  }

  /**
   * Limpia entradas expiradas de la base de datos.
   */
  async cleanup(): Promise<number> {
    const result = await prisma.memoryEntry.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }

  /**
   * Exporta toda la memoria de un usuario como JSON.
   */
  async export(userId: string): Promise<MemoryDbEntry[]> {
    const entries = await prisma.memoryEntry.findMany({
      where: { userId },
      orderBy: { type: "asc" },
    });
    return entries.map(this.deserialize);
  }

  /**
   * Estadísticas de memoria de un usuario.
   */
  async getStats(userId: string): Promise<{
    total: number;
    byType: Record<string, number>;
    avgConfidence: number;
    oldestEntry?: Date;
    newestEntry?: Date;
  }> {
    const entries = await prisma.memoryEntry.findMany({
      where: { userId },
      select: { type: true, confidence: true, createdAt: true },
    });

    const byType: Record<string, number> = {};
    let totalConfidence = 0;
    let oldest: Date | undefined;
    let newest: Date | undefined;

    for (const e of entries) {
      byType[e.type] = (byType[e.type] || 0) + 1;
      totalConfidence += e.confidence;
      if (!oldest || e.createdAt < oldest) oldest = e.createdAt;
      if (!newest || e.createdAt > newest) newest = e.createdAt;
    }

    return {
      total: entries.length,
      byType,
      avgConfidence: entries.length > 0 ? totalConfidence / entries.length : 0,
      oldestEntry: oldest,
      newestEntry: newest,
    };
  }

  private deserialize(entry: {
    id: string;
    userId: string;
    type: string;
    key: string;
    value: string;
    tags: string;
    confidence: number;
    conversationId: string | null;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): MemoryDbEntry {
    let tags: string[] = [];
    try {
      tags = JSON.parse(entry.tags) as string[];
    } catch {
      tags = [];
    }
    return {
      id: entry.id,
      userId: entry.userId,
      type: entry.type as MemoryDbEntry["type"],
      key: entry.key,
      value: entry.value,
      tags,
      confidence: entry.confidence,
      conversationId: entry.conversationId ?? undefined,
      expiresAt: entry.expiresAt ?? undefined,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }
}

export const memoryDb = new MemoryDb();
