import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

const mockBelongsToUser = vi.fn();
const mockExecuteAction = vi.fn();

vi.mock("@/lib/browser/BrowserControlConnector", () => ({
  browserControlConnector: {
    belongsToUser: (...args: unknown[]) => mockBelongsToUser(...args),
    executeAction: (...args: unknown[]) => mockExecuteAction(...args),
  },
}));

describe("POST /api/browser/sessions/[id]/actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rechaza acciones sobre sesiones de otros usuarios", async () => {
    mockBelongsToUser.mockReturnValue(false);

    const request = new Request("http://localhost/api/browser/sessions/sesion-1/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "screenshot", params: {} }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: "sesion-1" }) });
    expect(response.status).toBe(404);
    expect(mockExecuteAction).not.toHaveBeenCalled();
  });

  it("ejecuta acciones sobre sesiones propias", async () => {
    mockBelongsToUser.mockReturnValue(true);
    mockExecuteAction.mockResolvedValue({ success: true, data: { url: "https://example.com" } });

    const request = new Request("http://localhost/api/browser/sessions/sesion-1/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "navigate", params: { url: "https://example.com" } }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: "sesion-1" }) });
    expect(response.status).toBe(200);
    expect(mockExecuteAction).toHaveBeenCalledWith("sesion-1", "navigate", { url: "https://example.com" });
  });

  it("rechaza acciones no soportadas", async () => {
    mockBelongsToUser.mockReturnValue(true);

    const request = new Request("http://localhost/api/browser/sessions/sesion-1/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "invalidAction", params: {} }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: "sesion-1" }) });
    expect(response.status).toBe(400);
  });
});
