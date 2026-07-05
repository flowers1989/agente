import { describe, it, expect } from "vitest";
import {
  ChatCompletionSchema,
  ConnectorActionSchema,
  CompileRequestSchema,
  RecommendationsSchema,
  SaveCredentialsSchema,
  validate,
} from "./validation";

describe("API validation schemas", () => {
  it("valida chat completions correctamente", () => {
    const result = validate(ChatCompletionSchema, {
      model: "kimi-k2.7-code",
      messages: [{ role: "user", content: "hola" }],
    });
    expect(result.success).toBe(true);
  });

  it("rechaza chat completions sin mensajes", () => {
    const result = validate(ChatCompletionSchema, { model: "kimi-k2.7-code", messages: [] });
    expect(result.success).toBe(false);
  });

  it("valida connector actions", () => {
    const result = validate(ConnectorActionSchema, { action: "sendMessage", params: { channel: "#general" } });
    expect(result.success).toBe(true);
  });

  it("rechaza connector actions sin acción", () => {
    const result = validate(ConnectorActionSchema, { params: {} });
    expect(result.success).toBe(false);
  });

  it("valida compile request", () => {
    const result = validate(CompileRequestSchema, {
      projectName: "TestApp",
      requirements: { type: "utility" },
      platforms: ["linux"],
    });
    expect(result.success).toBe(true);
  });

  it("rechaza plataformas inválidas", () => {
    const result = validate(CompileRequestSchema, {
      projectName: "TestApp",
      requirements: {},
      platforms: ["ios"],
    });
    expect(result.success).toBe(false);
  });

  it("valida recommendations con objective", () => {
    const result = validate(RecommendationsSchema, { objective: "Quiero una app móvil" });
    expect(result.success).toBe(true);
  });

  it("valida credenciales con scopes string", () => {
    const result = validate(SaveCredentialsSchema, {
      source: "slack",
      apiKey: "xoxb-123",
      scopes: "chat:write,channels:read",
    });
    expect(result.success).toBe(true);
  });
});
