// ==================== DISCORD CONNECTOR ====================
// Conector básico para Discord (esqueleto funcional).

import { OAuth2Connector } from "./base/OAuth2Connector";
import type { ConnectorInit } from "../BaseConnector";
import type { ConnectorActionResult, ConnectorCredentials, IntegrationSource, Resource, ListFilters } from "../types";

export class DiscordConnector extends OAuth2Connector {
  protected baseUrl = "https://discord.com/api/v10";
  protected authUrl = "https://discord.com/oauth2/authorize";
  protected tokenUrl = "https://discord.com/api/oauth2/token";
  protected defaultScopes = ["bot"];

  constructor(init: { source: IntegrationSource; userId: string; credentials: ConnectorCredentials }) {
    super(init as ConnectorInit);
  }

  protected async getAuthHeaders(): Promise<Record<string, string>> {
    const token = this.credentials.accessToken;
    if (!token) throw new Error("No hay token de Discord configurado");
    return { Authorization: `Bot ${token}` };
  }

  async authenticate(): Promise<void> {
    await this.request("/users/@me");
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

  async sendMessage(params: { channelId: string; content: string }): Promise<ConnectorActionResult> {
    return this.executeAction("sendMessage", () =>
      this.request(`/channels/${params.channelId}/messages`, {
        method: "POST",
        body: { content: params.content },
      })
    );
  }

  async revokeToken(): Promise<void> {
    const token = this.credentials.accessToken;
    if (!token || !this.appCredentials.clientId || !this.appCredentials.clientSecret) return;
    await this.postRevoke(
      "https://discord.com/api/oauth2/token/revoke",
      new URLSearchParams({ token, client_id: this.appCredentials.clientId, client_secret: this.appCredentials.clientSecret })
    );
  }
}
