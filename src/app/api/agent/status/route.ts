import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { getIdentifier, getUserId } from "@/lib/api/auth";
import { getExecutionState, getActiveExecutions } from "@/lib/agents/execution-persistence";

// ==================== AGENT EXECUTION STATUS ====================
// GET /api/agent/status?conversationId=<id>
//   Devuelve el estado de una ejecución específica (para resume tras recarga)
// GET /api/agent/status
//   Lista todas las ejecuciones activas del usuario

export async function GET(request: Request) {
  const rate = withRateLimit(getIdentifier(request, "agent:status"), {
    windowMs: 60 * 1000,
    maxRequests: 60,
  });
  if (!rate.allowed) return rate.response;

  const userId = getUserId();
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversationId");

  try {
    if (conversationId) {
      // Estado de una ejecución específica
      const state = await getExecutionState(conversationId);
      if (!state) {
        return NextResponse.json(
          { error: "Ejecución no encontrada" },
          { status: 404 }
        );
      }
      return NextResponse.json({ execution: state });
    }

    // Listar ejecuciones activas
    const active = await getActiveExecutions(userId);
    return NextResponse.json({ executions: active, count: active.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("[agent/status] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
