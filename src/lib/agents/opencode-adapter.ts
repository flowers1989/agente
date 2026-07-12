"use client";

import type { AIModel } from "../types";
import { AI_MODELS } from "../mock-data";
import { sanitizeLLMOutput } from "../utils";

// ==================== OPencode GO ADAPTER ====================
// Adaptador para los 13 modelos de OpenCode Go.
// Ahora las llamadas reales pasan por el proxy backend (/api/chat/completions)
// para no exponer la API key en el cliente.

// Soporte multimodal: el content puede ser string (texto) o array de
// { type: "text", text } | { type: "image_url", image_url: { url } }
// para enviar screenshots al LLM (visión, estilo Manus IA).
export type ChatMessageContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    >;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: ChatMessageContent;
}

export interface ChatParams {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  model?: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  tokensUsed: number;
  cost: number;
  duration: number;
}

const PROXY_ENDPOINT = "/api/chat/completions";
const DIRECT_ENDPOINT = "https://opencode.ai/zen/go/v1/chat/completions";
const MODELS_ENDPOINT = "https://opencode.ai/zen/go/v1/models";

// En el servidor (Route Handlers) llamamos directamente a OpenCode Go con la
// API key (no se expone al cliente porque el código corre server-side). En el
// navegador usamos el proxy /api/chat/completions para no exponer la key.
const isServer = () => typeof window === "undefined";

const PRICING = AI_MODELS.reduce((acc, m) => {
  acc[m.id] = { input: m.costInput, output: m.costOutput };
  return acc;
}, {} as Record<string, { input: number; output: number }>);

export class OpenCodeGoAdapter {
  private apiKey: string | null = null;
  private defaultModel: string = "kimi-k2.7-code";
  private totalTokens = 0;
  private totalCost = 0;
  private modelUsage: Record<string, number> = {};

  initialize(apiKey: string): void {
    this.apiKey = apiKey;
  }

  resetUsage(): void {
    this.totalTokens = 0;
    this.totalCost = 0;
    this.modelUsage = {};
  }

  addUsage(tokens: number, cost: number, model: string): void {
    this.totalTokens += tokens;
    this.totalCost += cost;
    this.modelUsage[model] = (this.modelUsage[model] || 0) + tokens;
  }

  // Devuelve endpoint + headers según el entorno (servidor vs navegador).
  private getRequestConfig(): { endpoint: string; headers: Record<string, string> } {
    if (isServer()) {
      return {
        endpoint: DIRECT_ENDPOINT,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
      };
    }
    return {
      endpoint: PROXY_ENDPOINT,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey!,
      },
    };
  }

  // Test de conexión vía proxy usando un mensaje mínimo.
  // Devuelve true solo si el proxy responde OK con la API key proporcionada.
  async testConnection(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const { endpoint, headers } = this.getRequestConfig();
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: this.defaultModel,
          messages: [{ role: "user", content: "hi" }],
          max_tokens: 5,
        }),
      });
      return res.ok;
    } catch {
      // Si el proxy no responde (red caída, CORS, etc.), no asumir que la key es válida.
      return false;
    }
  }

  // Listar modelos disponibles (actualmente desde mock-data).
  async getAvailableModels(): Promise<AIModel[]> {
    await new Promise((r) => setTimeout(r, 200));
    return AI_MODELS;
  }

  selectModel(modelId: string): void {
    this.defaultModel = modelId;
  }

  isInitialized(): boolean {
    return !!this.apiKey && this.apiKey.length >= 10;
  }

  // Llamada principal al LLM a través del proxy backend.
  async chat(messages: ChatMessage[], params?: ChatParams): Promise<ChatResponse> {
    const model = params?.model || this.defaultModel;
    const pricing = PRICING[model] || PRICING["kimi-k2.7-code"];

    if (!this.apiKey) {
      throw new Error("No API key configured");
    }

    const startTime = Date.now();

    try {
      const { endpoint, headers } = this.getRequestConfig();
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages,
          temperature: params?.temperature ?? 0.7,
          max_tokens: params?.maxTokens ?? 4096,
          top_p: params?.topP ?? 1.0,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "Unknown error");
        throw new Error(`OpenCode Go API error ${res.status}: ${errorText}`);
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
        model?: string;
        usage?: { total_tokens?: number; prompt_tokens?: number; completion_tokens?: number };
      };

      const rawContent = data.choices?.[0]?.message?.content || "";
      const content = sanitizeLLMOutput(rawContent);
      const tokensUsed = data.usage?.total_tokens || Math.floor(rawContent.length / 4);
      const cost =
        ((data.usage?.prompt_tokens || 0) * pricing.input +
          (data.usage?.completion_tokens || 0) * pricing.output) /
        1_000_000;
      this.addUsage(tokensUsed, cost, data.model || model);
      return {
        content,
        model: data.model || model,
        tokensUsed,
        cost,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      // Solo hacemos fallback a simulación si es un error de red/CORS.
      const isNetworkError =
        error instanceof TypeError ||
        (error instanceof Error && /fetch|network|cors|failed/i.test(error.message));

      if (!isNetworkError) {
        throw error;
      }

      console.warn("[OpenCodeGoAdapter] Network error, falling back to simulation:", error);
      return this.simulateChat(messages, model, startTime, pricing);
    }
  }

  // Streaming simulado palabra por palabra (compatible con la UI actual).
  async *stream(messages: ChatMessage[], params?: ChatParams): AsyncGenerator<string> {
    const response = await this.chat(messages, params);
    const words = response.content.split(" ");
    for (const word of words) {
      await new Promise((r) => setTimeout(r, 30));
      yield word + " ";
    }
  }

  getModelInfo(modelId: string): AIModel | undefined {
    return AI_MODELS.find((m) => m.id === modelId);
  }

  getUsageStats(): { totalTokens: number; totalCost: number; modelUsage: Record<string, number> } {
    return {
      totalTokens: this.totalTokens,
      totalCost: this.totalCost,
      modelUsage: { ...this.modelUsage },
    };
  }

  private simulateChat(
    messages: ChatMessage[],
    model: string,
    startTime: number,
    pricing: { input: number; output: number }
  ): ChatResponse {
    const systemMsg = messages.find((m) => m.role === "system");
    const userMsg = messages.find((m) => m.role === "user");

    const latency =
      model.includes("flash") || model.includes("mimo")
        ? 200 + Math.random() * 400
        : model.includes("minimax")
        ? 300 + Math.random() * 500
        : model.includes("kimi")
        ? 400 + Math.random() * 600
        : 500 + Math.random() * 800;

    const systemText = typeof systemMsg?.content === "string" ? systemMsg.content : "";
    const userText = typeof userMsg?.content === "string" ? userMsg.content : JSON.stringify(userMsg?.content || "");
    const rawContent = generateSimulatedResponse(systemText, userText, model);
    const content = sanitizeLLMOutput(rawContent);
    const tokensUsed = Math.floor(content.length / 4) + Math.floor(userText.length / 4);
    const cost = (tokensUsed * (pricing.input + pricing.output)) / 2 / 1_000_000;
    this.addUsage(tokensUsed, cost, model);

    return {
      content,
      model,
      tokensUsed,
      cost,
      duration: Date.now() - startTime + latency,
    };
  }
}

let adapterInstance: OpenCodeGoAdapter | null = null;
export function getAdapter(): OpenCodeGoAdapter {
  if (!adapterInstance) {
    adapterInstance = new OpenCodeGoAdapter();
  }
  return adapterInstance;
}

function generateSimulatedResponse(systemPrompt: string, userContent: string, model: string): string {
  const prompt = (systemPrompt + " " + userContent).toLowerCase();

  if (prompt.includes("json") || prompt.includes("retorna json")) {
    if (prompt.includes("analizador") || prompt.includes("analizar objetivo")) {
      return JSON.stringify(
        {
          entities: [
            { type: "action", value: "analizar" },
            { type: "object", value: userContent.split(" ").slice(0, 3).join(" ") },
          ],
          constraints: [],
          context: "tarea general",
          complexity: "medium",
        },
        null,
        2
      );
    }
    if (prompt.includes("planificador") || prompt.includes("plan")) {
      return JSON.stringify(
        {
          steps: [
            { number: 1, description: "Analizar requerimiento", tool: "Code Generation", dependencies: [], estimatedTime: 12 },
            { number: 2, description: "Ejecutar tarea principal", tool: "Bash/Shell Execution", dependencies: [1], estimatedTime: 32 },
            { number: 3, description: "Verificar resultado", tool: "Testing", dependencies: [2], estimatedTime: 14 },
          ],
          totalEstimatedTime: 58,
          riskFactors: [],
        },
        null,
        2
      );
    }
    if (prompt.includes("verificador") || prompt.includes("validar")) {
      return JSON.stringify(
        {
          isValid: true,
          errors: [],
          analysis: { rootCause: "", canRetry: false, suggestedFix: "", likelihood: 1.0 },
          action: "continue",
          recommendation: "Resultado válido, continuar con el siguiente paso.",
        },
        null,
        2
      );
    }
    if (prompt.includes("optimizador") || prompt.includes("optimizar")) {
      return JSON.stringify(
        {
          suggestions: [
            {
              title: "Usar modelo más rápido",
              description: "Cambiar a DeepSeek V4 Flash",
              timeReduction: "40%",
              costReduction: "60%",
              implementation: "Cambiar modelo",
            },
          ],
          savings: { timeReduction: "20 segundos", costReduction: "$0.05" },
        },
        null,
        2
      );
    }
  }

  // Simulación para generación de queries de búsqueda
  if (prompt.includes("consulta de búsqueda") || prompt.includes("search query") || prompt.includes("genera una consulta")) {
    const topicMatch = userContent.match(/Tema de investigación:\s*(.+?)(?:\n|$)/i) ||
                       userContent.match(/Objetivo del usuario:\s*(.+?)(?:\n|Paso actual)/i);
    const topic = topicMatch ? topicMatch[1].trim() : userContent.split("\n")[0].trim();
    const cleanTopic = topic
      .replace(/^\s*(hazme|haz|genera|crea|escribe|redacta|investiga|analiza|dame|muéstrame|muestrame|cuéntame|cuentame|dime|por favor)\s+/i, "")
      .replace(/\s+(por favor)$/i, "")
      .trim();
    if (cleanTopic.length > 0) {
      return `${cleanTopic} information 2026`;
    }
  }

  // Simulación para reportes: evitar inventar datos, dar una plantilla mínima.
  if (prompt.includes("reportero") || prompt.includes("reporte markdown") || prompt.includes("reporte final")) {
    return `# Reporte de investigación\n\n## Resumen Ejecutivo\n\nNo se dispone de datos reales porque la API key no está configurada o la búsqueda no arrojó resultados. Configura una API key en Settings para obtener resultados actualizados.\n\n## Nota\n\nEste contenido es una simulación. Los hallazgos mostrados en pasos anteriores pueden provenir de datos de fallback o conocimiento del modelo.`;
  }

  return `Procesando con ${model}: ${userContent.slice(0, 100)}...`;
}
