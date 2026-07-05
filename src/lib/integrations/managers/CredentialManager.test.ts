import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");

const mockDb = vi.hoisted(() => ({
  integrationAccount: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
    findMany: vi.fn(),
  },
  connectorCredential: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));

const { CredentialManager } = await import("./CredentialManager");

describe("CredentialManager", () => {
  let manager: InstanceType<typeof CredentialManager>;

  beforeEach(() => {
    vi.resetAllMocks();
    manager = new CredentialManager();
  });

  it("encripta y desencripta credenciales correctamente", async () => {
    mockDb.integrationAccount.findFirst.mockResolvedValue(null);
    mockDb.integrationAccount.create.mockResolvedValue({});

    await manager.saveCredentials("user-1", "slack", {
      accessToken: "secret-token",
      refreshToken: "refresh-token",
      scopes: ["chat:write"],
    });

    const createCall = mockDb.integrationAccount.create.mock.calls[0][0];
    expect(createCall.data.accessToken).not.toBe("secret-token");
    expect(createCall.data.refreshToken).not.toBe("refresh-token");

    mockDb.integrationAccount.findFirst.mockResolvedValue({
      id: "1",
      source: "slack",
      accessToken: createCall.data.accessToken,
      refreshToken: createCall.data.refreshToken,
      tokenType: null,
      accountId: null,
      expiresAt: null,
      scopes: "chat:write",
      metadata: "{}",
    });

    const creds = await manager.getCredentials("user-1", "slack");
    expect(creds?.accessToken).toBe("secret-token");
    expect(creds?.refreshToken).toBe("refresh-token");
    expect(creds?.scopes).toEqual(["chat:write"]);
  });

  it("almacena credenciales OAuth de app encriptadas", async () => {
    mockDb.connectorCredential.findUnique.mockResolvedValue(null);
    mockDb.connectorCredential.create.mockResolvedValue({});

    await manager.saveAppCredentials("slack", {
      clientId: "client-id",
      clientSecret: "client-secret",
      redirectUri: "http://localhost/callback",
      scopes: ["chat:write"],
    });

    const createCall = mockDb.connectorCredential.create.mock.calls[0][0];
    expect(createCall.data.clientId).not.toBe("client-id");
    expect(createCall.data.clientSecret).not.toBe("client-secret");
  });
});
