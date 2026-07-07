import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { getIdentifier, getUserId } from "@/lib/api/auth";
import { validate } from "@/lib/api/validation";
import { z } from "zod";
import { getOrchestrator } from "@/lib/agents/orchestrator";
import { getAdapter, type ChatMessage as LLMChatMessage } from "@/lib/agents/opencode-adapter";
import { detectSimpleTask } from "@/lib/agents/simple-task-detector";
import { sanitizeLLMOutput } from "@/lib/utils";
import { type AgentMode } from "@/lib/config/model-routing";
import { searchWeb } from "@/lib/search/search-web";
import { fetchUrl } from "@/lib/search/web-fetch";
import { connectorManager } from "@/lib/integrations/ConnectorManager";
import { detectConnectorIntent, formatConnectorResult } from "@/lib/integrations/intent-detector";
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
  /** Modo de ejecución: "economy" (default) o "quality" (alta calidad). */
  mode: z.enum(["economy", "quality"]).optional(),
  /** Activar búsqueda en internet para enriquecer el contexto del LLM. */
  internetMode: z.boolean().optional(),
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

  const { objective, conversationId, userObjective, previousMessages = [], forceSimple, mode = "economy", internetMode = false } = validation.data;

  let internetContext = "";
  let connectorsContext = "";
  let connectedConnectors: Array<{ source: string; name: string; description: string; actions: Array<{ name: string }> }> = [];

  // Contexto de conectores conectados del usuario
  try {
    const userId = getUserId();
    const all = await connectorManager.listConnectorStatus(userId);
    connectedConnectors = all.filter((c) => c.connected);
    if (connectedConnectors.length > 0) {
      const lines = connectedConnectors.map(
        (c) => `- ${c.name} (${c.source}): ${c.description}. Acciones: ${c.actions.map((a) => a.name).join(", ")}`
      );
      connectorsContext = `\n\n[CONECTORES CONECTADOS DEL USUARIO]\nEl usuario tiene los siguientes conectores externos conectados y listos para usar:\n${lines.join("\n")}\nCuando el usuario pregunte sobre conexiones, integraciones o datos de estas fuentes, confirma que están conectadas y describe qué acciones puede ejecutar.\n[/CONECTORES]\n\n`;
    }
  } catch (err) {
    console.warn("[agent/execute] Connectors status failed:", err);
  }

  if (internetMode) {
    try {
      const query = extractSearchQuery(userObjective || objective, previousMessages);
      const results = await searchWeb(query, 5);
      if (results.length > 0) {
        const top = results.slice(0, 3);
        // Fetch full content of top results in parallel. Each fetch resolves with
        // either the page or null (on failure). Promise.allSettled never throws.
        const fetched = await Promise.allSettled(
          top.map((r) => fetchUrl(r.url, { timeoutMs: 12000 }).catch(() => null))
        );
        const snippets = top
          .map((r, i) => {
            const fetchRes = fetched[i];
            const text =
              fetchRes.status === "fulfilled" && fetchRes.value
                ? fetchRes.value.text.slice(0, 2000)
                : r.snippet;
            return `### ${r.title}\nURL: ${r.url}\n${text}`;
          })
          .join("\n\n---\n\n");
        internetContext = `\n\n[CONTEXTO WEB ACTUALIZADO — ${new Date().toISOString()}]\nResultados de búsqueda para "${query}":\n${snippets}\n[/CONTEXTO WEB]\n\n`;
      }
    } catch (err) {
      console.warn("[agent/execute] Internet search failed:", err);
    }
  }

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
        // ===== DETECTAR Y EJECUTAR ACCIÓN DE CONECTOR =====
        // Si el usuario pide algo que mapea a una acción de conector (ej: "listar
        // mis repos", "dame el contenido del repo X"), ejecutar la acción
        // directamente sin pasar por el LLM.
        const connectedList = connectedConnectors.map((c) => ({
          source: c.source,
          name: c.name,
          actions: c.actions.map((a) => a.name),
        }));
        const cleanMessage = (userObjective || objective)
          .replace(/^Contexto previo[\s\S]*?Nuevo mensaje del usuario:\s*/i, "")
          .trim();
        const intent = detectConnectorIntent(cleanMessage, connectedList, previousMessages);
        console.log("[agent/execute] Intent detection:", { cleanMessage, intent: intent ? `${intent.source}/${intent.action} (${intent.confidence})` : "null", connectedSources: connectedList.map(c => c.source) });

        if (intent && intent.confidence > 0.5) {
          send("simple_start", { conversationId });
          try {
            const actionResult = await connectorManager.executeAction(
              getUserId(),
              intent.source as never,
              { action: intent.action, params: intent.params }
            );
            const formatted = formatConnectorResult(intent.source, intent.action, actionResult);
            send("simple_done", {
              conversationId,
              content: formatted,
              tokensUsed: 0,
              cost: 0,
            });
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            send("simple_done", {
              conversationId,
              content: `❌ Error ejecutando **${intent.source}/${intent.action}**: ${errorMsg}`,
              tokensUsed: 0,
              cost: 0,
            });
          }
          cleanup();
          controller.close();
          return;
        }

        // ===== Decidir si es conversación simple o tarea compleja =====
        const detection = forceSimple ? { isSimple: true, confidence: 1 } : detectSimpleTask(userObjective || objective);

        if (detection.isSimple && detection.confidence > 0.6) {
          // ===== RESPUESTA DIRECTA (conversación simple) =====
          const systemContent = internetMode
            ? "Eres un asistente IA útil, conciso y profesional. Responde directamente al usuario. " +
              "Se te ha proporcionado contexto web actualizado extraído de internet en el último mensaje del usuario. " +
              "Úsalo para responder con información actual y cita las URL relevantes cuando sea apropiado. " +
              "Mantén el contexto de la conversación previa. Conoces los conectores del usuario."
            : "Eres un asistente IA útil, conciso y profesional. Responde directamente sin usar herramientas. Mantén el contexto de la conversación previa. Conoces los conectores del usuario e puedes describir sus acciones.";

          const userContent = `${objective}${connectorsContext}${internetContext}`;

          const messages: LLMChatMessage[] = [
            { role: "system", content: systemContent },
            ...previousMessages.map((m) => ({ role: m.role, content: m.content }) as LLMChatMessage),
            { role: "user", content: userContent },
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

        const enrichedObjective = `${objective}${connectorsContext}${internetContext}`;

        send("start", { conversationId, objective: enrichedObjective });

        const result = await orchestrator.executeTask(
          enrichedObjective,
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
          userObjective,
          mode as AgentMode
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

/**
 * Convierte el mensaje del usuario en una query de búsqueda concisa.
 * - Quita saludos, signos de puntuación y palabras de relleno.
 * - Si el mensaje incluye "contexto previo" solo usa el nuevo mensaje.
 * - Si el mensaje es una petición de reintento ("intenta de nuevo", etc.),
 *   usa la última pregunta sustantiva del historial.
 * - Traduce consultas sobre deportes/eventos actuales al inglés para
 *   obtener mejores resultados de Bing.
 */
function extractSearchQuery(
  message: string,
  previousMessages?: Array<{ role: string; content: string }>
): string {
  let q = message;
  // Quitar el bloque "Contexto previo de la conversación"
  const ctxIdx = q.indexOf("Contexto previo de la conversación");
  if (ctxIdx >= 0) {
    const newMsgIdx = q.indexOf("Nuevo mensaje del usuario:");
    if (newMsgIdx >= 0) {
      q = q.slice(newMsgIdx + "Nuevo mensaje del usuario:".length).trim();
    } else {
      q = q.slice(ctxIdx);
    }
  }
  // Quitar saludos comunes
  q = q.replace(/^(hola|hey|buenas|hello|hi|oye|consulta|pregunta)[:\s,!]*/i, "").trim();

  // Detectar peticiones de reintento y usar la última pregunta sustantiva
  const RETRY_PATTERNS = [
    /^(intenta|hazlo|prueba|haz)\s+(de nuevo|otra vez|lo de nuevo|otra)$/i,
    /^(intenta|prueba)\s+(de nuevo|otra vez)$/i,
    /^(again|retry|repeat|try again)$/i,
    /^(otra vez|de nuevo|repite)$/i,
    /^(no funcion|no sirve|sigue sin|dale soluci)/i,
  ];
  const isRetry = RETRY_PATTERNS.some((re) => re.test(q.toLowerCase()));

  if (isRetry && previousMessages && previousMessages.length > 0) {
    for (let i = previousMessages.length - 1; i >= 0; i--) {
      const msg = previousMessages[i];
      if (msg.role === "user" && msg.content.length > 10) {
        const cleaned = msg.content
          .replace(/^Contexto previo[\s\S]*?Nuevo mensaje del usuario:\s*/i, "")
          .trim();
        if (cleaned.length > 10 && !RETRY_PATTERNS.some((re) => re.test(cleaned.toLowerCase()))) {
          q = cleaned;
          break;
        }
      }
    }
  }

  // Traducir consultas deportivas al inglés para mejores resultados en Bing
  const sportsTranslations: Array<[RegExp, string]> = [
    [/estados unidos\s+vs\s+belgic?a/i, "USA vs Belgium result"],
    [/belgic?a\s+vs\s+estados unidos/i, "Belgium vs USA result"],
    [/estados unidos\s+vs\s+([a-záéíóúñ\s]+)/i, "USA vs $1 result"],
    [/([a-záéíóúñ\s]+)\s+vs\s+estados unidos/i, "$1 vs USA result"],
    [/resultado\s+(?:del?\s+)?partido/i, "match result today"],
    [/quien\s+gan/i, "who won today match"],
  ];
  for (const [re, replacement] of sportsTranslations) {
    if (re.test(q)) {
      q = q.replace(re, replacement);
      break;
    }
  }

  // Añadir "2026 result" si menciona partido/hoy/resultado sin año
  if (/partido|hoy|resultado|ganó|ganador/i.test(q) && !/result|today|2026/i.test(q)) {
    q = `${q} 2026 result`;
  }

  if (q.length > 200) q = q.slice(0, 200).replace(/\s+\S*$/, "");
  return q || message.slice(0, 200);
}
