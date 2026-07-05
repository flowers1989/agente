// ==================== SLACK CONNECTOR ====================
// Conector para Slack: mensajes y canales.

import { OAuth2Connector } from "./base/OAuth2Connector";
import type { ConnectorInit } from "../BaseConnector";
import type { ConnectorActionResult, ConnectorCredentials, IntegrationSource, Resource, ListFilters } from "../types";

export class SlackConnector extends OAuth2Connector {
  protected baseUrl = "https://slack.com/api";
  protected authUrl = "https://slack.com/oauth/v2/authorize";
  protected tokenUrl = "https://slack.com/api/oauth.v2.access";
  protected defaultScopes = ["chat:write", "channels:read", "users:read"];

  constructor(init: { source: IntegrationSource; userId: string; credentials: ConnectorCredentials }) {
    super(init as ConnectorInit);
  }

  protected async getAuthHeaders(): Promise<Record<string, string>> {
    const token = this.credentials.accessToken;
    if (!token) throw new Error("No hay token de Slack configurado");
    return { Authorization: `Bearer ${token}` };
  }

  async authenticate(): Promise<void> {
    const data = await this.request<{ ok: boolean; error?: string }>("/auth.test");
    if (!data.ok) throw new Error(data.error || "Autenticación fallida en Slack");
  }

  async listResources(_filters?: ListFilters): Promise<Resource[]> {
    const result = await this.listChannels({ limit: 100 });
    if (!result.success) throw new Error(result.error);
    const channels = (result.data as { channels: Array<{ id: string; name: string }> }).channels || [];
    return channels.map((ch) => ({
      id: `slack_${ch.id}`,
      name: `#${ch.name}`,
      type: "folder" as const,
      source: "slack",
      size: 0,
      metadata: { createdAt: new Date(), modifiedAt: new Date(), owner: "", shared: true, permissions: [], external: ch },
      syncStatus: "synced" as const,
      lastSyncedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  async getResource(id: string): Promise<Resource> {
    const resources = await this.listResources();
    const found = resources.find((r) => r.id === id);
    if (!found) throw new Error(`Recurso no encontrado: ${id}`);
    return found;
  }

  async search(query: string): Promise<Resource[]> {
    const resources = await this.listResources();
    return resources.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()));
  }

  async sendMessage(params: { channel: string; text: string }): Promise<ConnectorActionResult> {
    return this.executeAction("sendMessage", () =>
      this.request<{ ok: boolean; error?: string; ts?: string }>("/chat.postMessage", {
        method: "POST",
        body: { channel: params.channel, text: params.text },
      })
    );
  }

  async listChannels(params: { limit?: number } = {}): Promise<ConnectorActionResult> {
    return this.executeAction("listChannels", () =>
      this.request<{ ok: boolean; error?: string; channels: unknown[] }>("/conversations.list", {
        query: { limit: params.limit || 100, types: "public_channel,private_channel" },
      })
    );
  }

  async revokeToken(): Promise<void> {
    const token = this.credentials.accessToken;
    if (!token) return;
    await this.postRevoke(
      "https://slack.com/api/auth.revoke",
      new URLSearchParams({ token }),
      { Authorization: `Bearer ${token}` }
    );
  }
}
