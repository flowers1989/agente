"use client";

import type { AgentType, AgentConfig, MemoryType } from "../types";
import { AGENTS } from "../mock-data";
import { getAdapter, type ChatMessage } from "./opencode-adapter";
import { useMemoryStore } from "../memory/memory-store";

// ==================== AGENTE BASE ====================
// Clase abstracta que heredan los 7 agentes.
// Cada agente:
// - Tiene su modelo OpenCode Go asignado
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

  constructor(agentType: AgentType) {
    this.config = AGENTS[agentType];
  }

  // Llamar al LLM con el system prompt del agente
  protected async callLLM(userPrompt: string, params?: { temperature?: number; maxTokens?: number }): Promise<string> {
    const messages: ChatMessage[] = [
      { role: "system", content: this.config.systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const response = await this.adapter.chat(messages, {
      ...params,
      model: this.config.modelId,  // Cada agente usa su modelo asignado
    });

    return response.content;
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
  get modelId(): string { return this.config.modelId; }
  get type(): AgentType { return this.config.type; }
  get description(): string { return this.config.description; }
  get responsibilities(): string[] { return this.config.responsibilities; }
}
