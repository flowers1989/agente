// ==================== GMAIL CONNECTOR ====================
// Conector para Gmail: envío de emails y lectura básica.

import { OAuth2Connector } from "./base/OAuth2Connector";
import type { ConnectorInit } from "../BaseConnector";
import type { ConnectorActionResult, ConnectorCredentials, IntegrationSource, Resource, ListFilters } from "../types";

export class GmailConnector extends OAuth2Connector {
  protected baseUrl = "https://gmail.googleapis.com/gmail/v1";
  protected authUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  protected tokenUrl = "https://oauth2.googleapis.com/token";
  protected defaultScopes = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
  ];

  constructor(init: { source: IntegrationSource; userId: string; credentials: ConnectorCredentials }) {
    super(init as ConnectorInit);
  }

  async authenticate(): Promise<void> {
    await this.request("/users/me/profile");
  }

  async listResources(_filters?: ListFilters): Promise<Resource[]> {
    const result = await this.listLabels();
    if (!result.success) throw new Error(result.error);
    const labels = (result.data as { labels?: Array<{ id: string; name: string }> }).labels || [];
    return labels.map((label) => ({
      id: `gmail_${label.id}`,
      name: label.name,
      type: "folder" as const,
      source: "gmail",
      size: 0,
      metadata: { createdAt: new Date(), modifiedAt: new Date(), owner: "", shared: false, permissions: [], external: label },
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

  async sendEmail(params: { to: string; subject: string; body: string; html?: boolean }): Promise<ConnectorActionResult> {
    const boundary = "__connector_boundary__";
    const contentType = params.html ? "text/html; charset=utf-8" : "text/plain; charset=utf-8";
    const emailBody = [
      `To: ${params.to}`,
      `Subject: ${params.subject}`,
      `Content-Type: ${contentType}`,
      "",
      params.body,
    ].join("\r\n");

    const encoded = Buffer.from(emailBody).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    return this.executeAction("sendEmail", () =>
      this.request<{ id: string }>("/users/me/messages/send", {
        method: "POST",
        body: { raw: encoded },
      })
    );
  }

  async listLabels(_params?: unknown): Promise<ConnectorActionResult> {
    return this.executeAction("listLabels", () => this.request<{ labels: unknown[] }>("/users/me/labels"));
  }

  async revokeToken(): Promise<void> {
    const token = this.credentials.accessToken;
    if (!token) return;
    await this.postRevoke("https://oauth2.googleapis.com/revoke", new URLSearchParams({ token }));
  }
}
