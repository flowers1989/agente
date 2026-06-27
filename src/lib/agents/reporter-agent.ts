"use client";

import { BaseAgent } from "./base-agent";
import type { Execution, MessageOutput } from "../types";
import { useMemoryStore } from "../memory/memory-store";

// ==================== AGENTE 6: REPORTERO ====================
// Modelo: Kimi K2.7 Code (generación de contenido, formato)
//
// Responsabilidad:
// - Recopilar datos de la ejecución
// - Formatear resultados de forma clara y profesional
// - Crear visualizaciones
// - Generar documento final
//
// Lee: Working Memory (todos los resultados)
// Escribe: Episodic Memory (reportes generados)

export class ReporterAgent extends BaseAgent {
  constructor() {
    super("reporter");
  }

  async generateReport(execution: Execution, conversationId: string, category: string): Promise<MessageOutput> {
    // 1. Recopilar datos de memoria
    const memoryStore = useMemoryStore.getState();
    const stepResults = execution.plan.steps.map((step) => ({
      step: step.description,
      tool: step.toolName,
      status: step.status,
      duration: step.duration,
      result: step.result,
    }));

    // 2. Generar output según categoría
    // En producción: const response = await this.callLLM(prompt);
    const output = this.generateOutputByCategory(category, execution);

    // 3. Guardar reporte en episodic memory
    this.storeInMemory("episodic", `report:${conversationId}`, output.content, {
      conversationId,
      success: true,
      tags: ["report", category],
    });

    // 4. Emitir evento
    this.emit("report:generated", { conversationId, output });

    return output;
  }

  private generateOutputByCategory(category: string, execution: Execution): MessageOutput {
    switch (category) {
      case "research":
        return {
          type: "text",
          title: "Análisis completado",
          content: `He completado el análisis. Los hallazgos principales muestran tendencias claras en el período evaluado, con oportunidades identificadas en 3 áreas clave. El reporte completo incluye datos cuantitativos, recomendaciones priorizadas y próximos pasos sugeridos.\n\nTiempo total: ${execution.plan.steps.reduce((acc, s) => acc + (s.duration || 0), 0)}s\nTokens: ${execution.tokensUsed.toLocaleString()}`,
        };

      case "code":
        return {
          type: "code",
          title: "solution.ts",
          language: "typescript",
          content: `// Solución generada por el agente\nexport async function processItem(input: Input): Promise<Output> {\n  const validated = validate(input);\n  const transformed = transform(validated);\n  return await persist(transformed);\n}\n\n// 247 líneas totales - código limpio y testeable\n// Tests: 18/18 pasados\n// Cobertura: 87%`,
        };

      case "data":
        return {
          type: "html",
          title: "Dashboard generado",
          content: `<!DOCTYPE html><html>...dashboard interactivo con 8 KPIs, 6 gráficos Chart.js, filtros por región/producto/fecha. Total: $4.2M, crecimiento 23% YoY...`,
        };

      case "automation":
        return {
          type: "text",
          content: `Automatización configurada y verificada. Se ejecutará según el schedule configurado. Monitoreo activo y notificaciones habilitadas.\n\nPróxima ejecución: según cron configurado\nEstado: activo`,
        };

      case "content":
        return {
          type: "file",
          title: "articulo.md",
          filename: "articulo.md",
          content: `# Título del artículo\n\n## Introducción\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.\n\n## Sección 1\n\nContenido optimizado SEO con keywords estratégicas...`,
        };

      default:
        return {
          type: "text",
          content: `Tarea completada exitosamente. He generado el resultado solicitado y está disponible para descarga o revisión en el workspace.\n\nPasos completados: ${execution.plan.steps.length}\nTiempo total: ${execution.plan.steps.reduce((acc, s) => acc + (s.duration || 0), 0)}s`,
        };
    }
  }
}
