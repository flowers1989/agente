import { describe, it, expect } from "vitest";
import { BrowserSession } from "./BrowserSession";

describe("BrowserSession.runOAuthFlow", () => {
  it("devuelve error cuando la sesión no está iniciada", async () => {
    const session = new BrowserSession("s1", "u1");
    const result = await session.runOAuthFlow(
      "https://example.com/auth",
      "http://localhost:3000/cb"
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe("Sesión no iniciada");
  });
});