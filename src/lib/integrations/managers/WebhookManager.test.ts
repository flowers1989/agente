import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");

const mockDb = vi.hoisted(() => ({
  connectorWebhookEvent: {
    create: vi.fn(),
  },
  connectorCredential: {
    findUnique: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));

const { WebhookManager } = await import("./WebhookManager");

describe("WebhookManager", () => {
  let manager: InstanceType<typeof WebhookManager>;

  beforeEach(() => {
    vi.resetAllMocks();
    manager = new WebhookManager();
  });

  it("almacena un evento de webhook recibido", async () => {
    mockDb.connectorCredential.findUnique.mockResolvedValue(null);

    const request = new Request("http://localhost/api/webhooks/github", {
      method: "POST",
      headers: { "x-hub-signature-256": "sha256=fake" },
      body: JSON.stringify({ action: "opened", issue: { id: 1 } }),
    });

    const result = await manager.processWebhook("github", request);

    expect(result.received).toBe(true);
    expect(result.verified).toBe(false);
    expect(mockDb.connectorWebhookEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: "github",
          eventType: "opened",
          verified: false,
        }),
      })
    );
  });
});
