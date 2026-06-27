"use client";

import type { AIModel } from "../types";
import { AI_MODELS } from "../mock-data";

// ==================== OPencode GO ADAPTER ====================
// Adaptador para los 13 modelos de OpenCode Go.
// En producción, esto haría llamadas reales a:
//   https://opencode.ai/zen/go/v1/chat/completions
//   https://opencode.ai/zen/go/v1/messages
//   https://opencode.ai/zen/go/v1/models
//
// Por ahora simulamos las llamadas para que el frontend funcione sin backend.
// Cuando se conecte el backend real, solo hay que cambiar la implementación
// de los métodos callLLM() y streamLLM().

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatParams {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  model?: string;  // Override del modelo por defecto
}

export interface ChatResponse {
  content: string;
  model: string;
  tokensUsed: number;
  cost: number;
  duration: number;
}

const ENDPOINTS = {
  CHAT: "https://opencode.ai/zen/go/v1/chat/completions",
  MESSAGES: "https://opencode.ai/zen/go/v1/messages",
  MODELS: "https://opencode.ai/zen/go/v1/models",
};

const PRICING = AI_MODELS.reduce((acc, m) => {
  acc[m.id] = { input: m.costInput, output: m.costOutput };
  return acc;
}, {} as Record<string, { input: number; output: number }>);

export class OpenCodeGoAdapter {
  private apiKey: string | null = null;
  private defaultModel: string = "kimi-k2.7-code";

  // Inicializar con API key
  initialize(apiKey: string): void {
    this.apiKey = apiKey;
  }

  // Test de conexión (en producción: GET /v1/models)
  async testConnection(): Promise<boolean> {
    if (!this.apiKey) return false;
    // En producción:
    // const res = await fetch(ENDPOINTS.MODELS, {
    //   headers: { Authorization: `Bearer ${this.apiKey}` },
    // });
    // return res.ok;
    await new Promise((r) => setTimeout(r, 800));
    return this.apiKey.length >= 10;
  }

  // Listar modelos disponibles
  async getAvailableModels(): Promise<AIModel[]> {
    // En producción: GET /v1/models
    await new Promise((r) => setTimeout(r, 200));
    return AI_MODELS;
  }

  // Seleccionar modelo por defecto
  selectModel(modelId: string): void {
    this.defaultModel = modelId;
  }

  // Llamada principal al LLM (chat completion)
  async chat(messages: ChatMessage[], params?: ChatParams): Promise<ChatResponse> {
    const model = params?.model || this.defaultModel;
    const pricing = PRICING[model] || PRICING["kimi-k2.7-code"];

    if (!this.apiKey) {
      throw new Error("No API key configured");
    }

    // En producción:
    // const res = await fetch(ENDPOINTS.CHAT, {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     Authorization: `Bearer ${this.apiKey}`,
    //   },
    //   body: JSON.stringify({
    //     model,
    //     messages,
    //     temperature: params?.temperature ?? 0.7,
    //     max_tokens: params?.maxTokens ?? 4096,
    //     top_p: params?.topP ?? 1.0,
    //   }),
    // });
    // const data = await res.json();
    // return {
    //   content: data.choices[0].message.content,
    //   model: data.model,
    //   tokensUsed: data.usage.total_tokens,
    //   cost: (data.usage.prompt_tokens * pricing.input + data.usage.completion_tokens * pricing.output) / 1_000_000,
    //   duration: Date.now() - startTime,
    // };

    // === SIMULACIÓN ===
    // Cada agente tiene su comportamiento simulado
    const startTime = Date.now();
    const systemMsg = messages.find((m) => m.role === "system");
    const userMsg = messages.find((m) => m.role === "user");

    // Simular latencia según el modelo (modelos más baratos = más rápidos)
    const latency = model.includes("flash") || model.includes("mimo") ? 200 + Math.random() * 400 :
                    model.includes("minimax") ? 300 + Math.random() * 500 :
                    model.includes("kimi") ? 400 + Math.random() * 600 :
                    500 + Math.random() * 800; // glm, qwen, deepseek-pro
    await new Promise((r) => setTimeout(r, latency));

    // Generar respuesta simulada según el system prompt
    const content = generateSimulatedResponse(systemMsg?.content || "", userMsg?.content || "", model);

    // Calcular tokens y costo simulados
    const tokensUsed = Math.floor(content.length / 4) + Math.floor((userMsg?.content.length || 0) / 4);
    const cost = (tokensUsed * (pricing.input + pricing.output) / 2) / 1_000_000;

    return {
      content,
      model,
      tokensUsed,
      cost,
      duration: Date.now() - startTime,
    };
  }

  // Streaming (en producción sería Server-Sent Events)
  async *stream(messages: ChatMessage[], params?: ChatParams): AsyncGenerator<string> {
    const response = await this.chat(messages, params);
    // Simular streaming palabra por palabra
    const words = response.content.split(" ");
    for (const word of words) {
      await new Promise((r) => setTimeout(r, 30));
      yield word + " ";
    }
  }

  // Info del modelo
  getModelInfo(modelId: string): AIModel | undefined {
    return AI_MODELS.find((m) => m.id === modelId);
  }

  // Estadísticas de uso (simulado)
  getUsageStats(): { totalTokens: number; totalCost: number; modelUsage: Record<string, number> } {
    return {
      totalTokens: 0,
      totalCost: 0,
      modelUsage: {},
    };
  }
}

// Singleton
let adapterInstance: OpenCodeGoAdapter | null = null;
export function getAdapter(): OpenCodeGoAdapter {
  if (!adapterInstance) {
    adapterInstance = new OpenCodeGoAdapter();
  }
  return adapterInstance;
}

// Generar respuesta simulada según el agente (basado en system prompt)
function generateSimulatedResponse(systemPrompt: string, userContent: string, model: string): string {
  const prompt = (systemPrompt + " " + userContent).toLowerCase();

  // Si pide JSON, generar JSON
  if (prompt.includes("json") || prompt.includes("retorna json")) {
    if (prompt.includes("analizador") || prompt.includes("analizar objetivo")) {
      return JSON.stringify({
        entities: [
          { type: "action", value: "analizar" },
          { type: "object", value: userContent.split(" ").slice(0, 3).join(" ") },
        ],
        constraints: [],
        context: "tarea general",
        complexity: "medium",
      }, null, 2);
    }
    if (prompt.includes("planificador") || prompt.includes("plan")) {
      return JSON.stringify({
        steps: [
          { number: 1, description: "Analizar requerimiento", tool: "Code Generation", dependencies: [], estimatedTime: 12 },
          { number: 2, description: "Ejecutar tarea principal", tool: "Bash/Shell Execution", dependencies: [1], estimatedTime: 32 },
          { number: 3, description: "Verificar resultado", tool: "Testing", dependencies: [2], estimatedTime: 14 },
        ],
        totalEstimatedTime: 58,
        riskFactors: [],
      }, null, 2);
    }
    if (prompt.includes("verificador") || prompt.includes("validar")) {
      return JSON.stringify({
        isValid: true,
        errors: [],
        analysis: { rootCause: "", canRetry: false, suggestedFix: "", likelihood: 1.0 },
        action: "continue",
        recommendation: "Resultado válido, continuar con el siguiente paso.",
      }, null, 2);
    }
    if (prompt.includes("optimizador") || prompt.includes("optimizar")) {
      return JSON.stringify({
        suggestions: [
          { title: "Usar modelo más rápido", description: "Cambiar a DeepSeek V4 Flash", timeReduction: "40%", costReduction: "60%", implementation: "Cambiar modelo" },
        ],
        savings: { timeReduction: "20 segundos", costReduction: "$0.05" },
      }, null, 2);
    }
  }

  // Respuesta de texto simulada
  return `Procesando con ${model}: ${userContent.slice(0, 100)}...`;
}
