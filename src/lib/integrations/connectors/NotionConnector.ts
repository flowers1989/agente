// ==================== NOTION CONNECTOR ====================
// Conector para Notion: páginas y bases de datos.

import { OAuth2Connector } from "./base/OAuth2Connector";
import type { ConnectorInit } from "../BaseConnector";
import type { ConnectorActionResult, ConnectorCredentials, IntegrationSource, Resource, ListFilters } from "../types";

export class NotionConnector extends OAuth2Connector {
  protected baseUrl = "https://api.notion.com/v1";
  protected authUrl = "https://api.notion.com/v1/oauth/authorize";
  protected tokenUrl = "https://api.notion.com/v1/oauth/token";
  protected defaultScopes: string[] = [];

  constructor(init: { source: IntegrationSource; userId: string; credentials: ConnectorCredentials }) {
    super(init as ConnectorInit);
  }

  protected async getAuthHeaders(): Promise<Record<string, string>> {
    const token = this.credentials.accessToken;
    if (!token) throw new Error("No hay token de Notion configurado");
    return {
      Authorization: `Bearer ${token}`,
      "Notion-Version": "2022-06-28",
    };
  }

  async authenticate(): Promise<void> {
    await this.request("/users/me");
  }

  async listResources(_filters?: ListFilters): Promise<Resource[]> {
    const result = await this.listPages({ limit: 100 });
    if (!result.success) throw new Error(result.error);
    const pages = (result.data as { results: Array<{ id: string; url: string; properties: Record<string, unknown> }> }).results || [];
    return pages.map((page) => ({
      id: `notion_${page.id}`,
      name: this.extractTitle(page.properties) || page.id,
      type: "document" as const,
      source: "notion",
      url: page.url,
      size: 0,
      metadata: { createdAt: new Date(), modifiedAt: new Date(), owner: "", shared: true, permissions: [], external: page },
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

  async listPages(params: { limit?: number } = {}): Promise<ConnectorActionResult> {
    return this.executeAction("listPages", () =>
      this.request("/search", {
        method: "POST",
        body: { query: "", page_size: params.limit || 100 },
      })
    );
  }

  async createPage(params: { parentId: string; title: string; content?: string }): Promise<ConnectorActionResult> {
    return this.executeAction("createPage", () =>
      this.request("/pages", {
        method: "POST",
        body: {
          parent: { page_id: params.parentId },
          properties: {
            title: {
              title: [{ type: "text", text: { content: params.title } }],
            },
          },
          children: params.content
            ? [
                {
                  object: "block",
                  type: "paragraph",
                  paragraph: {
                    rich_text: [{ type: "text", text: { content: params.content } }],
                  },
                },
              ]
            : undefined,
        },
      })
    );
  }

  private extractTitle(properties: Record<string, unknown>): string | undefined {
    const titleProp = Object.values(properties).find(
      (p) => typeof p === "object" && p !== null && "title" in p && Array.isArray((p as { title?: unknown }).title)
    ) as { title?: Array<{ plain_text?: string }> } | undefined;
    return titleProp?.title?.map((t) => t.plain_text).join("");
  }
}
