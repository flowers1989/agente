/**
 * Webhook Service - Servicio real de webhooks
 * Registra y procesa webhooks de fuentes externas
 * Utiliza la memoria semántica para persistencia
 */

import { useMemoryStore } from "../memory/memory-store";

export interface WebhookListener {
  id: string;
  source: string;
  event: string;
  url?: string;
  conversationId: string;
  createdAt: string;
  enabled: boolean;
  lastTriggered?: string;
  triggerCount: number;
}

export interface WebhookEvent {
  id: string;
  listenerId: string;
  source: string;
  event: string;
  payload: Record<string, unknown>;
  receivedAt: string;
  processed: boolean;
}

/**
 * Servicio de Webhooks que registra y procesa eventos
 */
export class WebhookService {
  private listeners = new Map<string, WebhookListener>();
  private events: WebhookEvent[] = [];
  private memory = useMemoryStore.getState();

  constructor() {
    this.loadListenersFromMemory();
  }

  /**
   * Registrar un nuevo webhook listener
   */
  registerListener(
    source: string,
    event: string,
    conversationId: string,
    url?: string
  ): { success: boolean; listenerId?: string; endpoint?: string; error?: string } {
    try {
      const listenerId = `webhook-${source}-${Date.now()}`;
      const listener: WebhookListener = {
        id: listenerId,
        source,
        event,
        url,
        conversationId,
        createdAt: new Date().toISOString(),
        enabled: true,
        triggerCount: 0,
      };

      this.listeners.set(listenerId, listener);
      this.memory.store("semantic", `webhook:listener:${listenerId}`, JSON.stringify(listener), {
        tags: ["webhook", source, event],
        confidence: 1.0,
      });

      const endpoint = `/api/webhooks/${source}`;

      return {
        success: true,
        listenerId,
        endpoint,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Listar todos los webhooks registrados
   */
  listListeners(): WebhookListener[] {
    return Array.from(this.listeners.values());
  }

  /**
   * Obtener un webhook específico
   */
  getListener(listenerId: string): WebhookListener | undefined {
    return this.listeners.get(listenerId);
  }

  /**
   * Eliminar un webhook
   */
  deleteListener(listenerId: string): boolean {
    const deleted = this.listeners.delete(listenerId);
    if (deleted) {
      this.memory.semantic = this.memory.semantic.filter((e) => e.key !== `webhook:listener:${listenerId}`);
    }
    return deleted;
  }

  /**
   * Procesar un evento de webhook entrante
   */
  processWebhookEvent(
    source: string,
    event: string,
    payload: Record<string, unknown>
  ): { success: boolean; processedCount: number; error?: string } {
    try {
      let processedCount = 0;

      // Encontrar todos los listeners que coincidan con la fuente y evento
      for (const [listenerId, listener] of this.listeners.entries()) {
        if (
          listener.enabled &&
          listener.source === source &&
          (listener.event === event || listener.event === "*")
        ) {
          // Crear evento
          const webhookEvent: WebhookEvent = {
            id: `event-${Date.now()}-${Math.random()}`,
            listenerId,
            source,
            event,
            payload,
            receivedAt: new Date().toISOString(),
            processed: true,
          };

          // Guardar evento
          this.events.push(webhookEvent);
          this.memory.store("semantic", `webhook:event:${webhookEvent.id}`, JSON.stringify(webhookEvent), {
            tags: ["webhook", "event", source],
            confidence: 1.0,
          });

          // Actualizar listener
          listener.lastTriggered = new Date().toISOString();
          listener.triggerCount++;
          this.listeners.set(listenerId, listener);
          this.memory.store("semantic", `webhook:listener:${listenerId}`, JSON.stringify(listener), {
            tags: ["webhook", source, event],
            confidence: 1.0,
          });

          processedCount++;
        }
      }

      return {
        success: true,
        processedCount,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, processedCount: 0, error: message };
    }
  }

  /**
   * Obtener eventos recientes
   */
  getRecentEvents(limit: number = 10): WebhookEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Obtener eventos de un listener específico
   */
  getListenerEvents(listenerId: string, limit: number = 10): WebhookEvent[] {
    return this.events.filter((e) => e.listenerId === listenerId).slice(-limit);
  }

  /**
   * Actualizar el estado de un listener
   */
  updateListener(listenerId: string, updates: Partial<WebhookListener>): boolean {
    const listener = this.listeners.get(listenerId);
    if (!listener) return false;

    const updatedListener = { ...listener, ...updates };
    this.listeners.set(listenerId, updatedListener);
    this.memory.store("semantic", `webhook:listener:${listenerId}`, JSON.stringify(updatedListener), {
      tags: ["webhook"],
      confidence: 1.0,
    });

    return true;
  }

  /**
   * Cargar listeners desde la memoria semántica
   */
  private loadListenersFromMemory(): void {
    const webhookListeners = this.memory.semantic.filter((e) => e.key.startsWith("webhook:listener:"));

    for (const entry of webhookListeners) {
      try {
        const listener: WebhookListener = JSON.parse(entry.value);
        this.listeners.set(listener.id, listener);
      } catch (error) {
        console.error("Error cargando webhook listener de memoria:", error);
      }
    }
  }
}

// Instancia global del servicio de Webhooks
let webhookServiceInstance: WebhookService | null = null;

export function getWebhookService(): WebhookService {
  if (!webhookServiceInstance) {
    webhookServiceInstance = new WebhookService();
  }
  return webhookServiceInstance;
}
