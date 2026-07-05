// ==================== GITHUB CONNECTOR ====================
// Conector para GitHub: issues y repositorios.

import { OAuth2Connector } from "./base/OAuth2Connector";
import type { ConnectorInit } from "../BaseConnector";
import type { ConnectorActionResult, ConnectorCredentials, IntegrationSource, Resource, ListFilters } from "../types";

export class GithubConnector extends OAuth2Connector {
  protected baseUrl = "https://api.github.com";
  protected authUrl = "https://github.com/login/oauth/authorize";
  protected tokenUrl = "https://github.com/login/oauth/access_token";
  protected defaultScopes = ["repo", "read:user", "user:email"];

  constructor(init: { source: IntegrationSource; userId: string; credentials: ConnectorCredentials }) {
    super(init as ConnectorInit);
  }

  protected async getAuthHeaders(): Promise<Record<string, string>> {
    const token = this.credentials.accessToken;
    if (!token) throw new Error("No hay token de GitHub configurado");
    return {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
  }

  async authenticate(): Promise<void> {
    await this.request("/user");
  }

  async listResources(_filters?: ListFilters): Promise<Resource[]> {
    const result = await this.listRepos({ limit: 100 });
    if (!result.success) throw new Error(result.error);
    const repos = (result.data as Array<{ id: number; name: string; full_name: string; html_url: string; owner: { login: string } }>) || [];
    return repos.map((repo) => ({
      id: `github_${repo.id}`,
      name: repo.full_name,
      type: "folder" as const,
      source: "github",
      url: repo.html_url,
      size: 0,
      metadata: { createdAt: new Date(), modifiedAt: new Date(), owner: repo.owner.login, shared: true, permissions: [], external: repo },
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

  async createIssue(params: { owner: string; repo: string; title: string; body?: string }): Promise<ConnectorActionResult> {
    return this.executeAction("createIssue", () =>
      this.request(`/repos/${params.owner}/${params.repo}/issues`, {
        method: "POST",
        body: { title: params.title, body: params.body },
      })
    );
  }

  async listRepos(params: { limit?: number } = {}): Promise<ConnectorActionResult> {
    return this.executeAction("listRepos", () =>
      this.request<Array<unknown>>("/user/repos", {
        query: { sort: "updated", per_page: params.limit || 30 },
      })
    );
  }

  async revokeToken(): Promise<void> {
    const token = this.credentials.accessToken;
    if (!token || !this.appCredentials.clientId || !this.appCredentials.clientSecret) return;
    const credentials = Buffer.from(`${this.appCredentials.clientId}:${this.appCredentials.clientSecret}`).toString("base64");
    await fetch("https://api.github.com/applications/" + this.appCredentials.clientId + "/token", {
      method: "DELETE",
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ access_token: token }),
    });
  }
}
