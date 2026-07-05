import { describe, it, expect } from "vitest";
import { extractRequirements } from "./analyzer";

describe("compilation analyzer", () => {
  it("detects game requirements", () => {
    const req = extractRequirements("Quiero un juego 2D de plataformas para Android");
    expect(req.type).toBe("game");
    expect(req.features.graphics).toBe("2d");
  });

  it("detects enterprise requirements", () => {
    const req = extractRequirements("Necesito una herramienta de gestión de proyectos");
    expect(req.type).toBe("enterprise");
  });

  it("detects mobile requirements", () => {
    const req = extractRequirements("App móvil de chat en tiempo real");
    expect(req.type).toBe("mobile");
    expect(req.features.realtime).toBe(true);
  });

  it("detects budget constraints", () => {
    const req = extractRequirements("App barata para Android");
    expect(req.constraints.budget).toBe("low");
  });
});
