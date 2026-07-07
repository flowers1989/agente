import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    resource: { findMany: vi.fn(), findFirst: vi.fn(), upsert: vi.fn(), delete: vi.fn() },
    integrationAccount: { findFirst: vi.fn(), findMany: vi.fn() },
  },
}));

const { GithubConnector } = await import("./GithubConnector");
const { GoogleDriveConnector } = await import("./GoogleDriveConnector");
const { FigmaConnector } = await import("./FigmaConnector");

type FetchCall = { url: string; init?: RequestInit };

function mockFetch(responses: Array<{
  match: (url: string, init?: RequestInit) => boolean;
  body: unknown;
  status?: number;
}>) {
  const calls: FetchCall[] = [];
  vi.mocked(global.fetch).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : (input as URL).toString();
    calls.push({ url, init });
    const matched = responses.find((r) => r.match(url, init));
    if (!matched) {
      return {
        ok: false,
        status: 404,
        text: async () => `No mock for ${url}`,
      } as Response;
    }
    return {
      ok: true,
      status: matched.status || 200,
      json: async () => matched.body,
      text: async () =>
        typeof matched.body === "string" ? matched.body : JSON.stringify(matched.body),
      arrayBuffer: async () => new ArrayBuffer(0),
    } as Response;
  });
  return calls;
}

function makeCreds(overrides: Record<string, unknown> = {}) {
  return {
    source: "x" as never,
    userId: "user-1",
    credentials: { accessToken: "tok-123", ...overrides },
  };
}

describe("GithubConnector (real API shape)", () => {
  let connector: InstanceType<typeof GithubConnector>;

  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
    connector = new GithubConnector({
      source: "github",
      userId: "user-1",
      credentials: { accessToken: "gho_token" },
    } as never);
  });

  it("listRepos llama a /user/repos con Bearer + Accept de GitHub", async () => {
    const calls = mockFetch([
      {
        match: (url) => url.includes("/user/repos"),
        body: [{ id: 1, name: "r", full_name: "me/r", html_url: "u", owner: { login: "me" }, private: false }],
      },
    ]);
    const r = await connector.listRepos({ limit: 5 });
    expect(r.success).toBe(true);
    expect(calls[0].url).toContain("https://api.github.com/user/repos");
    expect(calls[0].url).toContain("per_page=5");
    const headers = calls[0].init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer gho_token");
    expect(headers["X-GitHub-Api-Version"]).toBe("2022-11-28");
  });

  it("createFile codifica contenido en base64 y hace PUT a /contents/<path>", async () => {
    const calls = mockFetch([
      {
        match: (url) => url.includes("/repos/me/repo/contents/"),
        body: { commit: { sha: "abc", html_url: "u" }, content: { path: "a.txt" } },
      },
    ]);
    const r = await connector.createFile({
      owner: "me",
      repo: "repo",
      path: "a.txt",
      content: "hola\n",
      message: "commit msg",
    });
    expect(r.success).toBe(true);
    expect(calls[0].init?.method).toBe("PUT");
    const body = JSON.parse(calls[0].init!.body as string);
    expect(body.content).toBe(Buffer.from("hola\n", "utf8").toString("base64"));
    expect(body.message).toBe("commit msg");
    expect(calls[0].url).toContain("a.txt");
  });

  it("createPR hace POST a /repos/<o>/<r>/pulls", async () => {
    const calls = mockFetch([
      {
        match: (url) => url.endsWith("/pulls"),
        body: { number: 7, html_url: "p", state: "open", title: "T" },
      },
    ]);
    const r = await connector.createPR({
      owner: "me", repo: "repo", title: "T", head: "feat", base: "main",
    });
    expect(r.success).toBe(true);
    expect(calls[0].init?.method).toBe("POST");
    const body = JSON.parse(calls[0].init!.body as string);
    expect(body.head).toBe("feat");
    expect(body.base).toBe("main");
  });

  it("closeIssue hace PATCH state=closed al issue", async () => {
    const calls = mockFetch([
      {
        match: (url) => /\/repos\/me\/repo\/issues\/42$/.test(url),
        body: { number: 42, state: "closed", title: "x" },
      },
    ]);
    const r = await connector.closeIssue({ owner: "me", repo: "repo", issueNumber: 42 });
    expect(r.success).toBe(true);
    expect(calls[0].init?.method).toBe("PATCH");
    const body = JSON.parse(calls[0].init!.body as string);
    expect(body.state).toBe("closed");
  });

  it("getAuthorizationUrl incluye scopes y state", () => {
    connector.setAppCredentials({
      clientId: "cid",
      clientSecret: "cs",
      redirectUri: "http://localhost:3000/api/connectors/oauth/callback",
    });
    const url = connector.getAuthorizationUrl("state-xyz");
    expect(url).toContain("client_id=cid");
    expect(url).toContain("scope=repo");
    expect(url).toContain("state=state-xyz");
  });
});

describe("GoogleDriveConnector (real API shape)", () => {
  let connector: InstanceType<typeof GoogleDriveConnector>;

  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
    connector = new GoogleDriveConnector({
      source: "google-drive",
      userId: "user-1",
      credentials: { accessToken: "ya29.gtoken" },
    } as never);
  });

  it("getAuthorizationUrl incluye access_type=offline y prompt=consent", () => {
    connector.setAppCredentials({
      clientId: "cid",
      clientSecret: "cs",
      redirectUri: "http://localhost:3000/api/connectors/oauth/callback",
    });
    const url = connector.getAuthorizationUrl("st");
    expect(url).toContain("access_type=offline");
    expect(url).toContain("prompt=consent");
    expect(url).toContain("scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.file");
  });

  it("listResources llama a /files con q trashed=false y orderBy", async () => {
    const calls = mockFetch([
      {
        match: (url) => url.includes("/drive/v3/files"),
        body: {
          files: [
            {
              id: "f1", name: "doc.txt", mimeType: "text/plain",
              modifiedTime: "2025-01-01T00:00:00Z", webViewLink: "lk",
            },
          ],
        },
      },
    ]);
    const resources = await connector.listResources({ limit: 5 });
    expect(resources.length).toBe(1);
    expect(resources[0].name).toBe("doc.txt");
    expect(calls[0].url).toContain("q=trashed+%3D+false");
    expect(calls[0].url).toContain("orderBy=modifiedByMeTime+desc");
    const headers = calls[0].init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer ya29.gtoken");
  });

  it("createFile sube vía multipart a upload/drive/v3/files", async () => {
    const calls = mockFetch([
      {
        match: (url) => url.includes("upload/drive/v3/files"),
        body: { id: "new1", name: "a.txt", mimeType: "text/plain" },
      },
    ]);
    const r = await connector.createFile({
      name: "a.txt", content: "hello", mimeType: "text/plain", folderId: "fld",
    });
    expect(r.success).toBe(true);
    expect(calls[0].init?.method).toBe("POST");
    const ct = (calls[0].init?.headers as Record<string, string>)["Content-Type"];
    expect(ct).toContain("multipart/related; boundary=opencode-");
    const body = calls[0].init?.body as string;
    expect(body).toContain("hello");
    expect(body).toContain("application/json; charset=UTF-8");
  });

  it("deleteFile hace DELETE a /files/<id>", async () => {
    const calls = mockFetch([
      { match: (url) => url.endsWith("/drive/v3/files/f1"), status: 204, body: null },
    ]);
    const r = await connector.deleteFile({ id: "f1" });
    expect(r.success).toBe(true);
    expect(calls[0].init?.method).toBe("DELETE");
  });

  it("createFolder envía mimeType application/vnd.google-apps.folder", async () => {
    const calls = mockFetch([
      {
        match: (url) => url.includes("/drive/v3/files?"),
        body: { id: "fld1", name: "n", mimeType: "application/vnd.google-apps.folder" },
      },
    ]);
    const r = await connector.createFolder({ name: "n", parentId: "p" });
    expect(r.success).toBe(true);
    const body = JSON.parse(calls[0].init!.body as string);
    expect(body.mimeType).toBe("application/vnd.google-apps.folder");
    expect(body.parents).toEqual(["p"]);
  });
});

describe("FigmaConnector (real API shape)", () => {
  let connector: InstanceType<typeof FigmaConnector>;

  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
    connector = new FigmaConnector({
      source: "figma",
      userId: "user-1",
      credentials: { accessToken: "figd_token", metadata: { teamId: "T1" } },
    } as never);
  });

  it("authenticate llama a /v1/me con X-Figma-Token", async () => {
    const calls = mockFetch([
      { match: (url) => url.endsWith("/v1/me"), body: { id: "u1", email: "a@b.c", handle: "h" } },
    ]);
    await connector.authenticate();
    expect(calls[0].url).toBe("https://api.figma.com/v1/me");
    const headers = calls[0].init?.headers as Record<string, string>;
    expect(headers["X-Figma-Token"]).toBe("figd_token");
  });

  it("listResources sin teamId devuelve [] sin llamar a la API", async () => {
    const c = new FigmaConnector(makeCreds({}) as never);
    const calls = mockFetch([]);
    const r = await c.listResources();
    expect(r).toEqual([]);
    expect(calls.length).toBe(0);
  });

  it("listResources con teamId llama a /v1/teams/<id>/files", async () => {
    const calls = mockFetch([
      {
        match: (url) => url.includes("/v1/teams/T1/files"),
        body: {
          files: [
            {
              key: "k1", name: "Design", last_modified: "2025-01-01T00:00:00Z",
              thumbnail_url: "t",
            },
          ],
        },
      },
    ]);
    const r = await connector.listResources();
    expect(r.length).toBe(1);
    expect(r[0].id).toBe("k1");
    expect(r[0].type).toBe("design");
    expect(calls[0].url).toContain("/v1/teams/T1/files");
    expect(calls[0].url).toContain("limit=100");
  });

  it("getFile llama a /v1/files/<fileKey>", async () => {
    const calls = mockFetch([
      {
        match: (url) => url.includes("/v1/files/abc"),
        body: { key: "abc", name: "F", lastModified: "2025-01-01T00:00:00Z", thumbnailUrl: "t" },
      },
    ]);
    const r = await connector.getFile({ fileKey: "abc" });
    expect(r.success).toBe(true);
    expect((r.data as { id: string }).id).toBe("abc");
  });

  it("listTeamProjects llama a /v1/teams/<teamId>/projects", async () => {
    const calls = mockFetch([
      { match: (url) => url.endsWith("/v1/teams/T1/projects"), body: { projects: [] } },
    ]);
    const r = await connector.listTeamProjects();
    expect(r.success).toBe(true);
    expect(calls[0].url).toContain("/v1/teams/T1/projects");
  });
});