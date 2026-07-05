// ==================== TELEGRAM CONNECTOR ====================
// Conector básico para Telegram Bot API (esqueleto funcional).

import { RestConnector } from "./base/RestConnector";
import type { ConnectorInit } from "../BaseConnector";
import type { ConnectorActionResult, ConnectorCredentials, IntegrationSource, Resource, ListFilters } from "../types";

export class TelegramConnector extends RestConnector {
  protected baseUrl = "https://api.telegram.org";

  constructor(init: { source: IntegrationSource; userId: string; credentials: ConnectorCredentials }) {
    super(init as ConnectorInit);
  }

  protected getAuthHeaders(): Record<string, string> {
    return {};
  }

  private get botToken(): string {
    const token = this.credentials.accessToken || this.credentials.apiKey;
    if (!token) throw new Error("No hay bot token de Telegram configurado");
    return token;
  }

  async authenticate(): Promise<void> {
    await this.request(`/bot${this.botToken}/getMe`);
  }

  async listResources(_filters?: ListFilters): Promise<Resource[]> {
    return [];
  }

  async getResource(id: string): Promise<Resource> {
    throw new Error(`Recurso no encontrado: ${id}`);
  }

  async search(_query: string): Promise<Resource[]> {
    return [];
  }

  async sendMessage(params: { chatId: string; text: string }): Promise<ConnectorActionResult> {
    return this.executeAction("sendMessage", () =>
      this.request(`/bot${this.botToken}/sendMessage`, {
        method: "POST",
        body: { chat_id: params.chatId, text: params.text },
      })
    );
  }
}
