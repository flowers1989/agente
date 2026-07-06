"use client";

import type { AgentType, AgentConfig, MemoryType } from "../types";
import { AGENTS } from "../mock-data";
import { getAdapter, type ChatMessage } from "./opencode-adapter";
import { useMemoryStore } from "../memory/memory-store";
import { getAgentModel, type AgentModelKey, type AgentMode } from "../config/model-routing";

// ==================== AGENTE BASE ====================
// Clase abstracta que heredan los 7 agentes.
// Cada agente:
// - Tiene su modelo OpenCode Go asignado (resuelto desde model-routing.ts)
// - Soporta modo "economy" (default, bajo costo) y "quality" (alta calidad)
// - Tiene su system prompt
// - Puede leer y escribir en la memoria compartida
// - Puede emitir eventos al frontend

export interface AgentEvent {
  type: "log" | "step:started" | "step:completed" | "step:failed" | "analysis:completed" | "plan:created" | "verification:passed" | "verification:failed" | "optimization:suggested" | "report:generated" | "alert" | "metrics:updated";
  agent: AgentType;
  data: Record<string, unknown>;
  timestamp: string;
}

export abstract class BaseAgent {
  protected config: AgentConfig;
  protected adapter = getAdapter();
  /** Modo de ejecución: "economy" (default, bajo costo) o "quality" (alta calidad). */
  protected mode: AgentMode = "economy";

  constructor(agentType: AgentType) {
    this.config = AGENTS[agentType];
  }

  /** Cambia el modo de ejecución del agente. */
  setMode(mode: AgentMode): void {
    this.mode = mode;
  }

  /** Devuelve el modo de ejecución activo. */
  getMode(): AgentMode {
    return this.mode;
  }

  // Llamar al LLM con el system prompt del agente.
  // El modelo se resuelve desde model-routing.ts según el modo activo,
  // eliminando la dependencia de this.config.modelId en runtime.
  protected async callLLM(
    userPrompt: string,
    params?: { temperature?: number; maxTokens?: number; mode?: AgentMode }
  ): Promise<{ content: string; tokensUsed: number; cost: number; model: string }> {
    const messages: ChatMessage[] = [
      { role: "system", content: this.config.systemPrompt },
      { role: "user", content: userPrompt },
    ];

    // Resolver modelo desde la fuente de verdad centralizada (model-routing.ts)
    const effectiveMode = params?.mode ?? this.mode;
    const resolvedModel = getAgentModel(this.config.type as AgentModelKey, effectiveMode);

    // Limitar tokens de salida para reducir costos (sobreescribible por params)
    const maxTokens = params?.maxTokens ?? 2048;

    const response = await this.adapter.chat(messages, {
      ...params,
      maxTokens,
      model: resolvedModel,
    });

    return {
      content: response.content,
      tokensUsed: response.tokensUsed,
      cost: response.cost,
      model: response.model,
    };
  }

  // Guardar en memoria
  protected storeInMemory(type: MemoryType, key: string, value: string, options?: {
    conversationId?: string;
    success?: boolean;
    confidence?: number;
    tags?: string[];
  }): void {
    useMemoryStore.getState().store(type, key, value, options);
  }

  // Leer de memoria
  protected retrieveFromMemory(type: MemoryType, key: string) {
    return useMemoryStore.getState().retrieve(type, key);
  }

  // Buscar en memoria
  protected searchMemory(type: MemoryType, query: string) {
    return useMemoryStore.getState().search(type, query);
  }

  // Emitir evento (en producción iría por WebSocket)
  protected emit(eventType: AgentEvent["type"], data: Record<string, unknown>): AgentEvent {
    const event: AgentEvent = {
      type: eventType,
      agent: this.config.type,
      data,
      timestamp: new Date().toISOString(),
    };
    // En producción: this.eventBus.emit(eventType, event);
    // Por ahora solo lo devolvemos
    return event;
  }

  // Getters
  get name(): string { return this.config.name; }
  /** modelId refleja el modelo economy (default). Para el modelo activo en runtime usar getAgentModel(). */
  get modelId(): string { return this.config.modelId; }
  get type(): AgentType { return this.config.type; }
  get description(): string { return this.config.description; }
  get responsibilities(): string[] { return this.config.responsibilities; }
}
