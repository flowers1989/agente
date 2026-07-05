"use client";

import type { Analysis, ExecutionPlan, ExecutionStep, MessageOutput, TaskCategory, AgentStatus } from "../types";
import type { VerificationResult } from "./verifier-agent";
import type { OptimizationResult } from "./optimizer-agent";
import type { MonitorMetrics, Anomaly } from "./monitor-agent";
import type { OrchestratorResult } from "./orchestrator";

// ==================== CLIENTE DEL STREAM DE EJECUCIÓN ====================
// Consume el endpoint POST /api/agent/execute, que devuelve un stream SSE.
// Como EventSource solo soporta GET, leemos el body del fetch POST y parseamos
// los eventos SSE manualmente.

export interface StreamCallbacks {
  onStart?: (data: { conversationId: string; objective: string }) => void;
  onAnalysisComplete?: (analysis: Analysis) => void;
  onPlanCreated?: (plan: ExecutionPlan, category: TaskCategory) => void;
  onStepStarted?: (step: ExecutionStep, agentStatus: AgentStatus) => void;
  onStepProgress?: (stepId: string, log: string) => void;
  onStepCompleted?: (step: ExecutionStep, result: string, output?: MessageOutput) => void;
  onStepFailed?: (step: ExecutionStep, error: string) => void;
  onVerificationResult?: (verification: VerificationResult) => void;
  onOptimizationSuggestions?: (optimization: OptimizationResult) => void;
  onReportGenerated?: (output: MessageOutput) => void;
  onMetricsUpdate?: (metrics: MonitorMetrics, anomalies: Anomaly[]) => void;
  onComplete?: (result: OrchestratorResult) => void;
  onError?: (error: string) => void;
  // Conversación simple
  onSimpleStart?: () => void;
  onSimpleChunk?: (content: string) => void;
  onSimpleDone?: (data: { content: string; tokensUsed: number; cost: number }) => void;
  // Fin del stream
  onDone?: (data: { success: boolean; tokensUsed: number; cost: number }) => void;
}

export interface StreamAgentParams {
  objective: string;
  conversationId: string;
  userObjective?: string;
  apiKey: string;
  previousMessages?: Array<{ role: "user" | "assistant"; content: string }>;
  forceSimple?: boolean;
  signal?: AbortSignal;
}

export async function streamAgentExecution(params: StreamAgentParams, callbacks: StreamCallbacks): Promise<void> {
  const res = await fetch("/api/agent/execute", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": params.apiKey,
    },
    body: JSON.stringify({
      objective: params.objective,
      conversationId: params.conversationId,
      userObjective: params.userObjective,
      previousMessages: params.previousMessages,
      forceSimple: params.forceSimple,
    }),
    signal: params.signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Error desconocido");
    throw new Error(`Error en ejecución del agente (${res.status}): ${text}`);
  }

  if (!res.body) {
    throw new Error("No se recibió stream de respuesta");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const dispatch = (eventName: string, data: unknown) => {
    switch (eventName) {
      case "start":
        callbacks.onStart?.(data as { conversationId: string; objective: string });
        break;
      case "analysis":
        callbacks.onAnalysisComplete?.(data as Analysis);
        break;
      case "plan": {
        const p = data as { plan: ExecutionPlan; category: TaskCategory };
        callbacks.onPlanCreated?.(p.plan, p.category);
        break;
      }
      case "step_started": {
        const s = data as { step: ExecutionStep; agentStatus: AgentStatus };
        callbacks.onStepStarted?.(s.step, s.agentStatus);
        break;
      }
      case "step_progress": {
        const s = data as { stepId: string; log: string };
        callbacks.onStepProgress?.(s.stepId, s.log);
        break;
      }
      case "step_completed": {
        const s = data as { step: ExecutionStep; result: string; output?: MessageOutput };
        callbacks.onStepCompleted?.(s.step, s.result, s.output);
        break;
      }
      case "step_failed": {
        const s = data as { step: ExecutionStep; error: string };
        callbacks.onStepFailed?.(s.step, s.error);
        break;
      }
      case "verification":
        callbacks.onVerificationResult?.(data as VerificationResult);
        break;
      case "optimization":
        callbacks.onOptimizationSuggestions?.(data as OptimizationResult);
        break;
      case "report":
        callbacks.onReportGenerated?.((data as { output: MessageOutput }).output);
        break;
      case "metrics": {
        const m = data as { metrics: MonitorMetrics; anomalies: Anomaly[] };
        callbacks.onMetricsUpdate?.(m.metrics, m.anomalies);
        break;
      }
      case "complete":
        callbacks.onComplete?.((data as { result: OrchestratorResult }).result);
        break;
      case "error":
        callbacks.onError?.((data as { error: string }).error);
        break;
      case "simple_start":
        callbacks.onSimpleStart?.();
        break;
      case "simple_chunk":
        callbacks.onSimpleChunk?.((data as { content: string }).content);
        break;
      case "simple_done":
        callbacks.onSimpleDone?.(data as { content: string; tokensUsed: number; cost: number });
        break;
      case "done":
        callbacks.onDone?.(data as { success: boolean; tokensUsed: number; cost: number });
        break;
      default:
        // Evento desconocido: ignorar
        break;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Los eventos SSE están separados por \n\n
    let separatorIndex: number;
    while ((separatorIndex = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);

      // Parsear el evento: líneas "event: X" y "data: Y"
      let eventName = "message";
      let dataStr = "";
      for (const line of rawEvent.split("\n")) {
        if (line.startsWith(":")) continue; // comentario (heartbeat)
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          dataStr += line.slice(5).trim();
        }
      }

      if (dataStr) {
        try {
          const parsed = JSON.parse(dataStr);
          dispatch(eventName, parsed);
        } catch {
          // JSON inválido: ignorar este evento
        }
      }
    }
  }
}
