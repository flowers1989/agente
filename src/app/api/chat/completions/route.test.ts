import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("POST /api/chat/completions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rechaza requests sin API key", async () => {
    const request = new Request("http://localhost/api/chat/completions", {
      method: "POST",
      body: JSON.stringify({ model: "kimi-k2.7-code", messages: [{ role: "user", content: "hola" }] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain("API key");
  });

  it("rechaza requests con body inválido", async () => {
    const request = new Request("http://localhost/api/chat/completions", {
      method: "POST",
      headers: { "X-API-Key": "sk-test-valid-key", "Content-Type": "application/json" },
      body: JSON.stringify({ model: "", messages: [] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("reenvía la llamada a OpenCode Go y devuelve la respuesta", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Hola mundo" } }],
        model: "kimi-k2.7-code",
        usage: { total_tokens: 10, prompt_tokens: 3, completion_tokens: 7 },
      }),
    });

    const request = new Request("http://localhost/api/chat/completions", {
      method: "POST",
      headers: { "X-API-Key": "sk-test-valid-key", "Content-Type": "application/json" },
      body: JSON.stringify({ model: "kimi-k2.7-code", messages: [{ role: "user", content: "hola" }] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.choices[0].message.content).toBe("Hola mundo");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://opencode.ai/zen/go/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer sk-test-valid-key",
        }),
      })
    );
  });

  it("propaga errores del upstream", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });

    const request = new Request("http://localhost/api/chat/completions", {
      method: "POST",
      headers: { "X-API-Key": "sk-test-valid-key", "Content-Type": "application/json" },
      body: JSON.stringify({ model: "kimi-k2.7-code", messages: [{ role: "user", content: "hola" }] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("fuerza temperature=1 para modelos Kimi", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Hola" } }],
        model: "kimi-k2.7-code",
        usage: { total_tokens: 2, prompt_tokens: 1, completion_tokens: 1 },
      }),
    });

    const request = new Request("http://localhost/api/chat/completions", {
      method: "POST",
      headers: { "X-API-Key": "sk-test-valid-key", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "kimi-k2.7-code",
        messages: [{ role: "user", content: "hola" }],
        temperature: 0.7,
      }),
    });

    await POST(request);

    const callBody = JSON.parse((mockFetch.mock.calls[0][1] as { body: string }).body);
    expect(callBody.temperature).toBe(1);
    expect(callBody.top_p).toBe(0.95);
  });
});
