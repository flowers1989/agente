import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { getIdentifier, getUserId } from "@/lib/api/auth";
import { memoryDb } from "@/lib/memory/memory-db";

// ==================== ENDPOINT: /api/memory ====================
// GET  /api/memory?type=episodic&limit=20&search=...  → Consultar memoria
// POST /api/memory                                     → Guardar entrada
// DELETE /api/memory?type=episodic&key=...             → Eliminar entrada

export async function GET(request: Request) {
  const rate = withRateLimit(getIdentifier(request, "memory:get"), {
    windowMs: 60 * 1000,
    maxRequests: 60,
  });
  if (!rate.allowed) return rate.response;

  try {
    const userId = getUserId();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as "episodic" | "semantic" | "working" | null;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const search = searchParams.get("search") || undefined;
    const conversationId = searchParams.get("conversationId") || undefined;
    const statsOnly = searchParams.get("stats") === "true";

    if (statsOnly) {
      const stats = await memoryDb.getStats(userId);
      return NextResponse.json({ stats });
    }

    const entries = await memoryDb.query({
      userId,
      ...(type ? { type } : {}),
      ...(conversationId ? { conversationId } : {}),
      limit: Math.min(limit, 200),
      search,
    });

    return NextResponse.json({ entries, total: entries.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const rate = withRateLimit(getIdentifier(request, "memory:post"), {
    windowMs: 60 * 1000,
    maxRequests: 120,
  });
  if (!rate.allowed) return rate.response;

  try {
    const userId = getUserId();
    const body = (await request.json().catch(() => ({}))) as {
      type?: string;
      key?: string;
      value?: string;
      tags?: string[];
      confidence?: number;
      conversationId?: string;
      ttlMs?: number;
    };

    const { type, key, value, tags, confidence, conversationId, ttlMs } = body;

    if (!type || !key || value === undefined) {
      return NextResponse.json(
        { error: "Se requieren los campos: type, key, value" },
        { status: 400 }
      );
    }

    if (!["episodic", "semantic", "working"].includes(type)) {
      return NextResponse.json(
        { error: "type debe ser: episodic, semantic o working" },
        { status: 400 }
      );
    }

    const entry = await memoryDb.store(
      type as "episodic" | "semantic" | "working",
      key,
      value,
      { userId, tags, confidence, conversationId, ttlMs }
    );

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const rate = withRateLimit(getIdentifier(request, "memory:delete"), {
    windowMs: 60 * 1000,
    maxRequests: 30,
  });
  if (!rate.allowed) return rate.response;

  try {
    const userId = getUserId();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const key = searchParams.get("key");

    if (!type || !key) {
      return NextResponse.json({ error: "Se requieren: type y key" }, { status: 400 });
    }

    await memoryDb.delete(userId, type, key);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
