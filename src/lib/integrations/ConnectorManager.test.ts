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
  connectorAuditLog: {
    create: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));

const { ConnectorManager } = await import("./ConnectorManager");

describe("ConnectorManager", () => {
  let manager: InstanceType<typeof ConnectorManager>;

  beforeEach(() => {
    vi.resetAllMocks();
    manager = new ConnectorManager();
    global.fetch = vi.fn();
  });

  it("lista definiciones de conectores registrados", () => {
    const defs = manager.listDefinitions();
    expect(defs.length).toBeGreaterThan(20);
    expect(defs.some((d) => d.source === "slack")).toBe(true);
    expect(defs.some((d) => d.source === "github")).toBe(true);
  });

  it("ejecuta sendMessage en Telegram con mock de API", async () => {
    // Creamos una cuenta para extraer el token encriptado
    mockDb.integrationAccount.findFirst.mockResolvedValue(null);
    mockDb.integrationAccount.create.mockResolvedValue({});
    await manager.saveCredentials("user-1", "telegram", { apiKey: "bot-token" });
    const encryptedToken = mockDb.integrationAccount.create.mock.calls[0][0].data.accessToken;

    mockDb.integrationAccount.findFirst.mockResolvedValue({
      id: "1",
      source: "telegram",
      accessToken: encryptedToken,
      refreshToken: null,
      tokenType: null,
      accountId: null,
      expiresAt: null,
      scopes: null,
      metadata: "{}",
    });

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, result: { message_id: 123 } }),
    } as Response);

    const result = await manager.executeAction("user-1", "telegram", {
      action: "sendMessage",
      params: { chatId: "123", text: "hola" },
    });

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.telegram.org/botbot-token/sendMessage",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ chat_id: "123", text: "hola" }),
      })
    );
  });

  it("valida parámetros requeridos", async () => {
    await expect(
      manager.executeAction("user-1", "slack", {
        action: "sendMessage",
        params: {},
      })
    ).rejects.toThrow("channel");
  });
});
