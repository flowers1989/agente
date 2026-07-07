import { OAuth2Connector } from "./base/OAuth2Connector";
import type { ConnectorInit } from "../BaseConnector";
import type {
  ConnectorActionResult,
  ConnectorCredentials,
  IntegrationSource,
  Resource,
  ListFilters,
} from "../types";

interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  owner: { login: string };
  description?: string | null;
  private: boolean;
}

interface GithubIssue {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  body?: string | null;
  html_url: string;
  user?: { login: string } | null;
  created_at: string;
  updated_at: string;
}

interface GithubFileResponse {
  content: {
    name: string;
    path: string;
    sha: string;
    content?: string;
    encoding?: string;
  };
  commit: {
    sha: string;
    html_url: string;
  };
}

interface GithubPRResponse {
  number: number;
  html_url: string;
  state: string;
  title: string;
  head?: { ref: string; sha: string };
  base?: { ref: string; sha: string };
  merged?: boolean;
  mergeable?: boolean | null;
  user?: { login: string };
  created_at?: string;
  updated_at?: string;
}

interface GithubBranch {
  name: string;
  commit: { sha: string; url: string };
  protected?: boolean;
}

interface GithubCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; email: string; date: string };
  };
  html_url: string;
}

interface GithubRepoDetailed {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  private: boolean;
  owner: { login: string };
  default_branch: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string | null;
  created_at: string;
  updated_at: string;
}

interface GithubIssueDetailed {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  body?: string | null;
  html_url: string;
  user?: { login: string } | null;
  created_at: string;
  updated_at: string;
  labels?: Array<{ name: string; color: string }>;
  assignees?: Array<{ login: string }>;
  state_reason?: string | null;
}

interface GithubSearchResponse<T> {
  total_count: number;
  items: T[];
}

export class GithubConnector extends OAuth2Connector {
  protected baseUrl = "https://api.github.com";
  protected authUrl = "https://github.com/login/oauth/authorize";
  protected tokenUrl = "https://github.com/login/oauth/access_token";
  protected defaultScopes = ["repo", "read:user", "user:email"];

  constructor(init: {
    source: IntegrationSource;
    userId: string;
    credentials: ConnectorCredentials;
  }) {
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
    const repos = (result.data as GithubRepo[]) || [];
    return repos.map((repo) => ({
      id: `github_${repo.id}`,
      name: repo.full_name,
      type: "folder" as const,
      source: "github" as IntegrationSource,
      url: repo.html_url,
      size: 0,
      metadata: {
        createdAt: new Date(),
        modifiedAt: new Date(),
        owner: repo.owner.login,
        shared: !repo.private,
        permissions: [],
        external: repo as unknown as Record<string, unknown>,
      },
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
    return resources.filter((r) =>
      r.name.toLowerCase().includes(query.toLowerCase())
    );
  }

  async listRepos(params: { limit?: number } = {}): Promise<ConnectorActionResult> {
    return this.executeAction("listRepos", () =>
      this.request<GithubRepo[]>("/user/repos", {
        query: { sort: "updated", per_page: params.limit || 30 },
      })
    );
  }

  async listRepoContent(params: {
    owner: string;
    repo: string;
    path?: string;
    branch?: string;
  }): Promise<ConnectorActionResult> {
    return this.executeAction("listRepoContent", async () => {
      const query: Record<string, string> = {};
      if (params.branch) query.ref = params.branch;
      const path = params.path ? encodeURIComponent(params.path) : "";
      const data = await this.request<Array<{
        name: string;
        path: string;
        type: "file" | "dir" | "symlink" | "submodule";
        size: number;
        sha: string;
      }>>(`/repos/${params.owner}/${params.repo}/contents/${path}`, { query });
      // GitHub devuelve un objeto si path apunta a un archivo, o un array si es dir
      if (Array.isArray(data)) {
        return data.map((item) => ({
          name: item.name,
          path: item.path,
          type: item.type,
          size: item.size,
        }));
      }
      // Si es un solo archivo, devolverlo como lista de 1 elemento
      const file = data as unknown as { name: string; path: string; type: string; size: number; content?: string; encoding?: string };
      return [{
        name: file.name,
        path: file.path,
        type: file.type,
        size: file.size,
        content: file.encoding === "base64" ? file.content : undefined,
      }];
    });
  }

  async readFile(params: {
    owner: string;
    repo: string;
    path: string;
    branch?: string;
  }): Promise<ConnectorActionResult> {
    return this.executeAction("readFile", async () => {
      const query: Record<string, string> = {};
      if (params.branch) query.ref = params.branch;
      const data = await this.request<{
        name: string;
        content?: string;
        encoding?: string;
        size: number;
        html_url: string;
      }>(`/repos/${params.owner}/${params.repo}/contents/${encodeURIComponent(params.path)}`, { query });
      let content = "";
      if (data.encoding === "base64" && data.content) {
        // Base64 de GitHub viene con saltos de línea cada 76 chars; hay que limpiarlos
        const clean = data.content.replace(/\n/g, "");
        content = Buffer.from(clean, "base64").toString("utf8");
      }
      return {
        name: data.name,
        path: params.path,
        size: data.size,
        content,
        url: data.html_url,
      };
    });
  }

  async listIssues(params: {
    owner: string;
    repo: string;
    state?: "open" | "closed" | "all";
    limit?: number;
  }): Promise<ConnectorActionResult> {
    return this.executeAction("listIssues", () =>
      this.request<GithubIssue[]>(
        `/repos/${params.owner}/${params.repo}/issues`,
        {
          query: {
            state: params.state || "open",
            per_page: params.limit || 30,
          },
        }
      )
    );
  }

  async createIssue(params: {
    owner: string;
    repo: string;
    title: string;
    body?: string;
    labels?: string[];
    assignees?: string[];
  }): Promise<ConnectorActionResult> {
    return this.executeAction("createIssue", () =>
      this.request<GithubIssue>(`/repos/${params.owner}/${params.repo}/issues`, {
        method: "POST",
        body: {
          title: params.title,
          body: params.body,
          labels: params.labels,
          assignees: params.assignees,
        },
      })
    );
  }

  async closeIssue(params: {
    owner: string;
    repo: string;
    issueNumber: number;
  }): Promise<ConnectorActionResult> {
    return this.executeAction("closeIssue", () =>
      this.request<GithubIssue>(
        `/repos/${params.owner}/${params.repo}/issues/${params.issueNumber}`,
        {
          method: "PATCH",
          body: { state: "closed" },
        }
      )
    );
  }

  async createFile(params: {
    owner: string;
    repo: string;
    path: string;
    content: string;
    message: string;
    branch?: string;
  }): Promise<ConnectorActionResult> {
    return this.executeAction("createFile", async () => {
      // Reemplazar saltos de línea para base64 válido en todos los entornos.
      const normalized = params.content.replace(/\r\n/g, "\n");
      const encoded = Buffer.from(normalized, "utf8").toString("base64");
      const body: Record<string, unknown> = {
        message: params.message,
        content: encoded,
      };
      if (params.branch) body.branch = params.branch;
      const result = await this.request<GithubFileResponse>(
        `/repos/${params.owner}/${params.repo}/contents/${encodeURIComponent(params.path)}`,
        { method: "PUT", body }
      );
      return {
        sha: result.commit?.sha,
        url: result.commit?.html_url,
        path: result.content?.path,
      };
    });
  }

  async createPR(params: {
    owner: string;
    repo: string;
    title: string;
    head: string;
    base: string;
    body?: string;
    draft?: boolean;
  }): Promise<ConnectorActionResult> {
    return this.executeAction("createPR", () =>
      this.request<GithubPRResponse>(`/repos/${params.owner}/${params.repo}/pulls`, {
        method: "POST",
        body: {
          title: params.title,
          head: params.head,
          base: params.base,
          body: params.body,
          draft: params.draft ?? false,
        },
      })
    );
  }

  // ==================== ACCIONES AVANZADAS (Manus-like) ====================

  /**
   * Devuelve el usuario autenticado (útil para que el agente sepa a quién
   * pertenecen los repos y pueda resolver owner automáticamente).
   */
  async getAuthenticatedUser(): Promise<ConnectorActionResult> {
    return this.executeAction("getAuthenticatedUser", () =>
      this.request<{ login: string; id: number; name: string | null; avatar_url: string; html_url: string }>("/user")
    );
  }

  async getRepo(params: {
    owner: string;
    repo: string;
  }): Promise<ConnectorActionResult> {
    return this.executeAction("getRepo", () =>
      this.request<GithubRepoDetailed>(`/repos/${params.owner}/${params.repo}`)
    );
  }

  async getReadme(params: {
    owner: string;
    repo: string;
    branch?: string;
  }): Promise<ConnectorActionResult> {
    return this.executeAction("getReadme", async () => {
      const query: Record<string, string> = {};
      if (params.branch) query.ref = params.branch;
      try {
        const data = await this.request<{ name: string; content: string; encoding: string; path: string; html_url?: string }>(
          `/repos/${params.owner}/${params.repo}/readme`,
          { query }
        );
        let content = "";
        if (data.encoding === "base64" && data.content) {
          content = Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8");
        }
        return { name: data.name, path: data.path, content, url: data.html_url };
      } catch (error) {
        // Sin README: devolver respuesta útil en lugar de error
        if (error instanceof Error && /404|Not Found/i.test(error.message)) {
          return { name: "README.md", content: "", notFound: true };
        }
        throw error;
      }
    });
  }

  async getIssue(params: {
    owner: string;
    repo: string;
    issueNumber: number;
  }): Promise<ConnectorActionResult> {
    return this.executeAction("getIssue", () =>
      this.request<GithubIssueDetailed>(
        `/repos/${params.owner}/${params.repo}/issues/${params.issueNumber}`
      )
    );
  }

  async updateIssue(params: {
    owner: string;
    repo: string;
    issueNumber: number;
    title?: string;
    body?: string;
    state?: "open" | "closed";
    labels?: string[];
    assignees?: string[];
  }): Promise<ConnectorActionResult> {
    return this.executeAction("updateIssue", () =>
      this.request<GithubIssueDetailed>(
        `/repos/${params.owner}/${params.repo}/issues/${params.issueNumber}`,
        {
          method: "PATCH",
          body: {
            title: params.title,
            body: params.body,
            state: params.state,
            labels: params.labels,
            assignees: params.assignees,
          },
        }
      )
    );
  }

  async addIssueComment(params: {
    owner: string;
    repo: string;
    issueNumber: number;
    body: string;
  }): Promise<ConnectorActionResult> {
    return this.executeAction("addIssueComment", () =>
      this.request<{ id: number; html_url: string; body: string }>(
        `/repos/${params.owner}/${params.repo}/issues/${params.issueNumber}/comments`,
        { method: "POST", body: { body: params.body } }
      )
    );
  }

  async listPRs(params: {
    owner: string;
    repo: string;
    state?: "open" | "closed" | "all";
    limit?: number;
  }): Promise<ConnectorActionResult> {
    return this.executeAction("listPRs", () =>
      this.request<GithubPRResponse[]>(
        `/repos/${params.owner}/${params.repo}/pulls`,
        {
          query: {
            state: params.state || "open",
            per_page: params.limit || 20,
          },
        }
      )
    );
  }

  async getPR(params: {
    owner: string;
    repo: string;
    prNumber: number;
  }): Promise<ConnectorActionResult> {
    return this.executeAction("getPR", () =>
      this.request<GithubPRResponse>(
        `/repos/${params.owner}/${params.repo}/pulls/${params.prNumber}`
      )
    );
  }

  async closePR(params: {
    owner: string;
    repo: string;
    prNumber: number;
  }): Promise<ConnectorActionResult> {
    return this.executeAction("closePR", () =>
      this.request<GithubPRResponse>(
        `/repos/${params.owner}/${params.repo}/pulls/${params.prNumber}`,
        { method: "PATCH", body: { state: "closed" } }
      )
    );
  }

  async mergePR(params: {
    owner: string;
    repo: string;
    prNumber: number;
    commitTitle?: string;
    commitMessage?: string;
    mergeMethod?: "merge" | "squash" | "rebase";
  }): Promise<ConnectorActionResult> {
    return this.executeAction("mergePR", () =>
      this.request<{ sha: string; merged: boolean; message: string }>(
        `/repos/${params.owner}/${params.repo}/pulls/${params.prNumber}/merge`,
        {
          method: "PUT",
          body: {
            commit_title: params.commitTitle,
            commit_message: params.commitMessage,
            merge_method: params.mergeMethod || "merge",
          },
        }
      )
    );
  }

  async createReview(params: {
    owner: string;
    repo: string;
    prNumber: number;
    event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT";
    body?: string;
  }): Promise<ConnectorActionResult> {
    return this.executeAction("createReview", () =>
      this.request<{ id: number; html_url: string }>(
        `/repos/${params.owner}/${params.repo}/pulls/${params.prNumber}/reviews`,
        { method: "POST", body: { event: params.event, body: params.body } }
      )
    );
  }

  async listBranches(params: {
    owner: string;
    repo: string;
    limit?: number;
  }): Promise<ConnectorActionResult> {
    return this.executeAction("listBranches", () =>
      this.request<GithubBranch[]>(`/repos/${params.owner}/${params.repo}/branches`, {
        query: { per_page: params.limit || 30 },
      })
    );
  }

  async createBranch(params: {
    owner: string;
    repo: string;
    branch: string;
    fromBranch?: string;
  }): Promise<ConnectorActionResult> {
    return this.executeAction("createBranch", async () => {
      // Necesitamos el SHA del branch origen (default_branch o fromBranch)
      let ref = params.fromBranch;
      if (!ref) {
        const repoData = await this.request<GithubRepoDetailed>(`/repos/${params.owner}/${params.repo}`);
        ref = repoData.default_branch;
      }
      const refData = await this.request<{ object: { sha: string } }>(
        `/repos/${params.owner}/${params.repo}/git/refs/heads/${ref}`
      );
      const sha = refData.object.sha;
      const created = await this.request<{ ref: string; object: { sha: string } }>(
        `/repos/${params.owner}/${params.repo}/git/refs`,
        {
          method: "POST",
          body: { ref: `refs/heads/${params.branch}`, sha },
        }
      );
      return { ref: created.ref, sha: created.object.sha, fromBranch: ref };
    });
  }

  async listCommits(params: {
    owner: string;
    repo: string;
    branch?: string;
    limit?: number;
  }): Promise<ConnectorActionResult> {
    return this.executeAction("listCommits", () => {
      const query: Record<string, string> = { per_page: String(params.limit || 20) };
      if (params.branch) query.sha = params.branch;
      return this.request<GithubCommit[]>(`/repos/${params.owner}/${params.repo}/commits`, { query });
    });
  }

  async updateFile(params: {
    owner: string;
    repo: string;
    path: string;
    content: string;
    message: string;
    branch?: string;
    sha?: string;
  }): Promise<ConnectorActionResult> {
    return this.executeAction("updateFile", async () => {
      // Si no nos pasan el SHA (necesario para update), lo buscamos leyendo el archivo.
      let fileSha = params.sha;
      if (!fileSha) {
        const query: Record<string, string> = {};
        if (params.branch) query.ref = params.branch;
        const data = await this.request<{ sha: string }>(
          `/repos/${params.owner}/${params.repo}/contents/${encodeURIComponent(params.path)}`,
          { query }
        );
        fileSha = data.sha;
      }
      const normalized = params.content.replace(/\r\n/g, "\n");
      const encoded = Buffer.from(normalized, "utf8").toString("base64");
      const body: Record<string, unknown> = {
        message: params.message,
        content: encoded,
        sha: fileSha,
      };
      if (params.branch) body.branch = params.branch;
      const result = await this.request<GithubFileResponse>(
        `/repos/${params.owner}/${params.repo}/contents/${encodeURIComponent(params.path)}`,
        { method: "PUT", body }
      );
      return {
        sha: result.commit?.sha,
        url: result.commit?.html_url,
        path: result.content?.path,
      };
    });
  }

  async deleteFile(params: {
    owner: string;
    repo: string;
    path: string;
    message: string;
    branch?: string;
    sha?: string;
  }): Promise<ConnectorActionResult> {
    return this.executeAction("deleteFile", async () => {
      let fileSha = params.sha;
      if (!fileSha) {
        const query: Record<string, string> = {};
        if (params.branch) query.ref = params.branch;
        const data = await this.request<{ sha: string }>(
          `/repos/${params.owner}/${params.repo}/contents/${encodeURIComponent(params.path)}`,
          { query }
        );
        fileSha = data.sha;
      }
      const query: Record<string, string> = {};
      if (params.branch) query.ref = params.branch;
      const result = await this.request<{ content: { sha: string; path: string }; commit: { sha: string; html_url: string } }>(
        `/repos/${params.owner}/${params.repo}/contents/${encodeURIComponent(params.path)}`,
        { method: "DELETE", body: { message: params.message, sha: fileSha, branch: params.branch }, query }
      );
      return {
        sha: result.commit?.sha,
        url: result.commit?.html_url,
        path: result.content?.path,
      };
    });
  }

  async searchCode(params: {
    q: string;
    owner?: string;
    repo?: string;
    limit?: number;
  }): Promise<ConnectorActionResult> {
    return this.executeAction("searchCode", () => {
      let q = params.q;
      if (params.owner && params.repo) q = `repo:${params.owner}/${params.repo} ${q}`;
      else if (params.owner) q = `user:${params.owner} ${q}`;
      return this.request<GithubSearchResponse<{ name: string; path: string; html_url: string; repository: { full_name: string } }>>(
        "/search/code",
        { query: { q, per_page: String(params.limit || 20) } }
      );
    });
  }

  async searchRepositories(params: {
    q: string;
    limit?: number;
  }): Promise<ConnectorActionResult> {
    return this.executeAction("searchRepositories", () =>
      this.request<GithubSearchResponse<GithubRepo>>("/search/repositories", {
        query: { q: params.q, per_page: String(params.limit || 20) },
      })
    );
  }

  async revokeToken(): Promise<void> {
    const token = this.credentials.accessToken;
    if (!token || !this.appCredentials.clientId || !this.appCredentials.clientSecret)
      return;
    const credentials = Buffer.from(
      `${this.appCredentials.clientId}:${this.appCredentials.clientSecret}`
    ).toString("base64");
    await fetch(
      "https://api.github.com/applications/" +
        this.appCredentials.clientId +
        "/token",
      {
        method: "DELETE",
        headers: {
          Authorization: `Basic ${credentials}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ access_token: token }),
      }
    );
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.authenticate();
      return true;
    } catch (error) {
      console.error("[GithubConnector] Validation failed:", error);
      return false;
    }
  }
}