import { describe, it, expect } from "vitest";
import { detectCategory } from "./mock-data";

describe("detectCategory", () => {
  it("classifies food and nutrition requests as content", () => {
    expect(detectCategory("hazme el reporte de los 10 alimentos")).toBe("content");
    expect(detectCategory("reporte sobre nutrición saludable")).toBe("content");
    expect(detectCategory("recetas de comida baja en sodio")).toBe("content");
    expect(detectCategory("dieta balanceada para deportistas")).toBe("content");
  });

  it("still classifies market/competitor reports as research", () => {
    expect(detectCategory("investiga el mercado de herramientas AI")).toBe("research");
    expect(detectCategory("reporte de competidores de Notion")).toBe("research");
    expect(detectCategory("compara acciones de Tesla y Apple")).toBe("research");
  });

  it("classifies code requests correctly", () => {
    expect(detectCategory("refactoriza esta función a TypeScript")).toBe("code");
    expect(detectCategory("implementa un componente de React")).toBe("code");
  });

  it("classifies data requests correctly", () => {
    expect(detectCategory("procesa este CSV y genera un dashboard")).toBe("data");
    expect(detectCategory("estadísticas de ventas Q1")).toBe("data");
  });

  it("classifies automation requests correctly", () => {
    expect(detectCategory("automatiza el envío de newsletters")).toBe("automation");
    expect(detectCategory("configura un webhook cada hora")).toBe("automation");
  });

  it("falls back to general when no clear category is detected", () => {
    expect(detectCategory("hola")).toBe("general");
    expect(detectCategory("gracias por tu ayuda")).toBe("general");
  });
});
