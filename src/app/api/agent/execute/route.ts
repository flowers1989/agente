import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { getIdentifier } from "@/lib/api/auth";
import { validate } from "@/lib/api/validation";
import { z } from "zod";
import { getOrchestrator } from "@/lib/agents/orchestrator";
import { getAdapter, type ChatMessage as LLMChatMessage } from "@/lib/agents/opencode-adapter";
import { detectSimpleTask } from "@/lib/agents/simple-task-detector";
import { sanitizeLLMOutput } from "@/lib/utils";

// ==================== EJECUCIÓN DEL AGENTE EN EL BACKEND ====================
// Este endpoint ejecuta la orquestación de los 7 agentes EN EL SERVIDOR
// (ya no en el navegador del usuario) y transmite el progreso vía SSE.
//
// El frontend envía POST con el objetivo + historial; recibe un stream de
// eventos SSE que actualizan la UI. Esto elimina la dependencia del navegador:
// si el usuario cierra la pestaña, la ejecución continúa en el servidor.

const ExecuteSchema = z.object({
  objective: z.string().min(1).max(10000),
  conversationId: z.string().min(1).max(200),
  userObjective: z.string().max(10000).optional(),
  previousMessages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(20000) }))
    .max(10)
    .optional(),
  forceSimple: z.boolean().optional(),
});

export interface AgentSSEEvent {
  event: string;
  data: unknown;
}

export async function POST(request: Request) {
  const rate = withRateLimit(getIdentifier(request, "agent:execute"), {
    windowMs: 60 * 1000,
    maxRequests: 15,
  });
  if (!rate.allowed) return rate.response;

  const apiKey = request.headers.get("x-api-key")?.trim();
  if (!apiKey || apiKey.length < 10) {
    return Response.json({ error: "API key inválida o no proporcionada" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const validation = validate(ExecuteSchema, body);
  if (!validation.success) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const { objective, conversationId, userObjective, previousMessages = [], forceSimple } = validation.data;

  // Inicializar el adaptador con la API key (llamada directa a OpenCode Go desde el servidor)
  const adapter = getAdapter();
  adapter.initialize(apiKey);

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      // Latido para mantener viva la conexión durante operaciones largas
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          // stream cerrado
        }
      }, 15000);

      const cleanup = () => clearInterval(heartbeat);

      request.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          // ya cerrado
        }
      });

      try {
        // ===== Decidir si es conversación simple o tarea compleja =====
        const detection = forceSimple ? { isSimple: true, confidence: 1 } : detectSimpleTask(userObjective || objective);

        if (detection.isSimple && detection.confidence > 0.6) {
          // ===== RESPUESTA DIRECTA (conversación simple) =====
          const messages: LLMChatMessage[] = [
            {
              role: "system",
              content:
                "Eres un asistente IA útil, conciso y profesional. Responde directamente sin usar herramientas. Mantén el contexto de la conversación previa.",
            },
            ...previousMessages.map((m) => ({ role: m.role, content: m.content }) as LLMChatMessage),
            { role: "user", content: objective },
          ];

          send("simple_start", { conversationId });

          let streamed = "";
          try {
            for await (const chunk of adapter.stream(messages, { maxTokens: 2048 })) {
              streamed += chunk;
              send("simple_chunk", { content: streamed });
            }
          } catch (err) {
            // Si el stream falla, intentar llamada no-streaming
            const resp = await adapter.chat(messages, { maxTokens: 2048 });
            streamed = resp.content;
            send("simple_chunk", { content: streamed });
          }

          const finalContent = sanitizeLLMOutput(streamed);
          const usage = adapter.getUsageStats();
          send("simple_done", {
            conversationId,
            content: finalContent,
            tokensUsed: usage.totalTokens,
            cost: usage.totalCost,
          });
          cleanup();
          controller.close();
          return;
        }

        // ===== TAREA COMPLEJA: orquestador de 7 agentes =====
        const orchestrator = getOrchestrator();
        adapter.resetUsage();

        send("start", { conversationId, objective });

        const result = await orchestrator.executeTask(
          objective,
          conversationId,
          {
            onAnalysisComplete: (analysis) => send("analysis", analysis),
            onPlanCreated: (plan, category) => send("plan", { plan, category }),
            onStepStarted: (step, agentStatus) => send("step_started", { step, agentStatus }),
            onStepProgress: (stepId, log) => send("step_progress", { stepId, log }),
            onStepCompleted: (step, resultText, output) => send("step_completed", { step, result: resultText, output }),
            onStepFailed: (step, error) => send("step_failed", { step, error }),
            onVerificationResult: (verification) => send("verification", verification),
            onOptimizationSuggestions: (optimization) => send("optimization", optimization),
            onReportGenerated: (output) => send("report", { output, conversationId }),
            onMetricsUpdate: (metrics, anomalies) => send("metrics", { metrics, anomalies }),
            onComplete: (orchestratorResult) => send("complete", { result: orchestratorResult, conversationId }),
            onError: (error) => send("error", { error, conversationId }),
          },
          userObjective
        );

        const usage = adapter.getUsageStats();
        send("done", {
          conversationId,
          success: result.success,
          tokensUsed: usage.totalTokens,
          cost: usage.totalCost,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        send("error", { error: message, conversationId });
      } finally {
        cleanup();
        try {
          controller.close();
        } catch {
          // ya cerrado
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
