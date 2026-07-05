import { describe, it, expect } from "vitest";
import { BrowserSession } from "./BrowserSession";

describe("BrowserSession", () => {
  it("inicia, navega y toma screenshot", async () => {
    const session = new BrowserSession("test-1", "user-1", { timeoutMs: 30000 });
    await session.start();
    expect(session.isActive()).toBe(true);

    const nav = await session.navigate("http://localhost:3000");
    expect(nav.success).toBe(true);
    expect(nav.data).toHaveProperty("url");

    const screenshot = await session.screenshot();
    expect(screenshot.success).toBe(true);
    expect(screenshot.screenshot).toBeTruthy();

    await session.stop();
    expect(session.isActive()).toBe(false);
  }, 60000);
});
