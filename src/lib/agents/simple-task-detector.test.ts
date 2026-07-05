import { describe, it, expect } from "vitest";
import { detectSimpleTask, shouldAnswerDirectly } from "./simple-task-detector";

describe("simple-task-detector", () => {
  describe("detectSimpleTask", () => {
    it("detects greetings as simple", () => {
      const result = detectSimpleTask("Hola");
      expect(result.isSimple).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it("detects conceptual questions as simple", () => {
      const result = detectSimpleTask("¿Qué es TypeScript?");
      expect(result.isSimple).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it("detects complex tasks that require tools", () => {
      const result = detectSimpleTask("Investiga los competidores de Notion y genera un reporte");
      expect(result.isSimple).toBe(false);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it("detects code generation as complex", () => {
      const result = detectSimpleTask("Genera una función en TypeScript para ordenar arrays");
      expect(result.isSimple).toBe(false);
    });

    it("detects browser actions as complex", () => {
      const result = detectSimpleTask("Navega a example.com y extrae el texto");
      expect(result.isSimple).toBe(false);
    });

    it("detects short questions as simple", () => {
      const result = detectSimpleTask("¿Cómo estás?");
      expect(result.isSimple).toBe(true);
    });
  });

  describe("shouldAnswerDirectly", () => {
    it("returns true for simple messages when api key is configured", () => {
      expect(shouldAnswerDirectly("Hola", true)).toBe(true);
    });

    it("returns false for complex messages", () => {
      expect(shouldAnswerDirectly("Scrapea una web", true)).toBe(false);
    });
  });
});
