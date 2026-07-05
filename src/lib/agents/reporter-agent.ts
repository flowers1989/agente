"use client";

import { BaseAgent } from "./base-agent";
import type { Execution, MessageOutput } from "../types";
import { useMemoryStore } from "../memory/memory-store";
import { sanitizeLLMOutput } from "../utils";

// ==================== AGENTE 6: REPORTERO ====================
// Modelo: Kimi K2.7 Code (generación de contenido, formato)
//
// Responsabilidad:
// - Recopilar datos de la ejecución
// - Formatear resultados de forma clara y profesional
// - Crear documento final descargable (Markdown primero, PDF/Excel futuro)
//
// Lee: Working Memory (todos los resultados)
// Escribe: Episodic Memory (reportes generados)

export class ReporterAgent extends BaseAgent {
  constructor() {
    super("reporter");
  }

  async generateReport(execution: Execution, conversationId: string, category: string): Promise<MessageOutput> {
    // 1. Si el último paso generó un documento/output enriquecido (ej. tareas de contenido),
    //    usarlo directamente como reporte final para no sobrescribirlo con metadatos.
    if (execution.finalOutput?.content && ["file", "html", "code"].includes(execution.finalOutput.type)) {
      const output: MessageOutput = {
        type: "file",
        title: execution.finalOutput.title || this.getReportTitle(category),
        filename: execution.finalOutput.filename || this.getReportFilename(category),
        content: sanitizeLLMOutput(execution.finalOutput.content),
      };

      this.storeInMemory("episodic", `report:${conversationId}`, output.content, {
        conversationId,
        success: true,
        tags: ["report", category],
      });
      this.emit("report:generated", { conversationId, output });
      return output;
    }

    // 2. Recopilar datos de los pasos ejecutados
    const stepResults = execution.plan.steps.map((step) => ({
      step: step.description,
      tool: step.toolName,
      status: step.status,
      duration: step.duration,
      result: step.result,
      error: step.error,
    }));

    // 2.5 Validar que los resultados sean relevantes para el objetivo del usuario.
    // Si los datos recopilados no mencionan el tema solicitado, evitamos generar
    // un reporte sobre un tema distinto.
    const objectiveEntry = this.retrieveFromMemory("working", `objective:${conversationId}`);
    const objective = objectiveEntry?.value || "";
    const topicMismatch = this.detectTopicMismatch(objective, stepResults);
    if (topicMismatch) {
      const output: MessageOutput = {
        type: "file",
        title: this.getReportTitle(category),
        filename: this.getReportFilename(category),
        content: this.buildMismatchReport(objective, stepResults, topicMismatch),
      };
      this.storeInMemory("episodic", `report:${conversationId}`, output.content, {
        conversationId,
        success: false,
        tags: ["report", category, "mismatch"],
      });
      this.emit("report:generated", { conversationId, output });
      return output;
    }

    // 3. Construir prompt para el LLM (compacto)
    const prompt = this.buildReportPrompt(execution, category, stepResults);

    // 4. Generar reporte con LLM real si está disponible
    let reportContent: string;
    let reportTokens = 0;
    let reportCost = 0;
    try {
      const response = await this.callLLM(prompt, { maxTokens: 8192 });
      reportContent = sanitizeLLMOutput(response.content);
      reportTokens = response.tokensUsed;
      reportCost = response.cost;
      // Actualizar costo real de la ejecución
      execution.tokensUsed += reportTokens;
      execution.actualCost += reportCost;
    } catch (error) {
      console.error("[ReporterAgent] LLM failed, using fallback:", error);
      reportContent = this.generateFallbackReport(execution, category, stepResults);
    }

    // 5. Normalizar a Markdown
    const markdown = this.ensureMarkdown(reportContent, category);

    const output: MessageOutput = {
      type: "file",
      title: this.getReportTitle(category),
      filename: this.getReportFilename(category),
      content: markdown,
    };

    // 5. Guardar reporte en episodic memory
    this.storeInMemory("episodic", `report:${conversationId}`, markdown, {
      conversationId,
      success: true,
      tags: ["report", category],
    });

    // 6. Emitir evento
    this.emit("report:generated", { conversationId, output });

    return output;
  }

  private buildReportPrompt(
    execution: Execution,
    category: string,
    stepResults: Array<{ step: string; tool: string; status: string; duration?: number; result?: string; error?: string }>
  ): string {
    const completedSteps = stepResults.filter((s) => s.status === "completed");
    const failedSteps = stepResults.filter((s) => s.status === "failed");

    return `Eres un reportero experto. Genera un reporte útil y profesional basado ÚNICAMENTE en los datos de la ejecución. NO inventes datos que no estén en los resultados.

Categoría: ${category}
Pasos completados: ${completedSteps.length}/${execution.plan.steps.length} | Fallidos: ${failedSteps.length}

Resultados de los pasos:
${stepResults
      .map(
        (s) =>
          `- [${s.status}] ${s.step} (${s.tool})${s.duration ? ` ${s.duration}s` : ""}${
            s.result ? `\n  → ${s.result.slice(0, 4000)}${s.result.length > 4000 ? "\n  ..." : ""}` : ""
          }${s.error ? `\n  ✕ ${s.error.slice(0, 300)}${s.error.length > 300 ? "..." : ""}` : ""}`
      )
      .join("\n")}

Instrucciones:
1. El resumen ejecutivo debe decir QUÉ SE ENCONTRÓ, no solo metadatos de ejecución.
2. Hallazgos principales: extrae información factual del contenido (nombres, cifras, tendencias, fuentes). Si no hay datos concretos, indícalo claramente.
3. Incluye una sección "Fuentes" con las URLs mencionadas en los resultados (si las hay).
4. Limitaciones: menciona solo errores reales o datos faltantes.
5. Próximos pasos: recomendaciones concretas basadas en lo encontrado.
6. Máximo 3000 palabras. Sé detallado y profesional.

Responde SOLO con el contenido del reporte.`;
  }

  private generateFallbackReport(
    execution: Execution,
    category: string,
    stepResults: Array<{ step: string; tool: string; status: string; duration?: number; result?: string; error?: string }>
  ): string {
    const completedSteps = stepResults.filter((s) => s.status === "completed");
    const failedSteps = stepResults.filter((s) => s.status === "failed");

    return `# Reporte de ${category}

## Resumen

Se ejecutaron ${execution.plan.steps.length} pasos. ${completedSteps.length} completados, ${failedSteps.length} fallidos.

## Pasos ejecutados

${completedSteps
  .map(
    (s) =>
      `- **${s.step}** (${s.tool})${s.duration ? ` - ${s.duration}s` : ""}\n${
        s.result ? `  - ${s.result.slice(0, 500)}${s.result.length > 500 ? "..." : ""}` : ""
      }`
  )
  .join("\n")}

${
  failedSteps.length > 0
    ? `## Limitaciones\n\n${failedSteps.map((s) => `- **${s.step}**: ${s.error || "Error desconocido"}`).join("\n")}`
    : ""
}

## Nota

Algunos datos pueden requerir verificación con fuentes oficiales o APIs especializadas.`;
  }

  // Detecta si los resultados recopilados no mencionan el tema solicitado.
  // Devuelve el tema detectado en los resultados si hay un desajuste claro.
  private detectTopicMismatch(
    objective: string,
    stepResults: Array<{ step: string; tool: string; status: string; duration?: number; result?: string; error?: string }>
  ): string | null {
    if (!objective) return null;

    const lowerObjective = objective.toLowerCase();
    const topicWords = lowerObjective
      .split(/\s+/)
      .filter((w) => w.length > 4 && !["sobre", "para", "desde", "hasta", "entre", "después", "reporte", "investiga", "analiza", "genera", "crea", "escribe"].includes(w))
      .slice(0, 5);

    if (topicWords.length === 0) return null;

    const combinedResults = stepResults
      .filter((s) => s.status === "completed" && s.result)
      .map((s) => s.result!.toLowerCase())
      .join(" ");

    if (combinedResults.length === 0) return null;

    const matches = topicWords.filter((word) => combinedResults.includes(word)).length;
    const matchRatio = matches / topicWords.length;

    // Si menos del 20% de las palabras clave del objetivo aparecen en los resultados,
    // consideramos que hay un desajuste de tema.
    if (matchRatio < 0.2) {
      // Intentar inferir el tema real de los resultados (primer sustantivo repetido).
      const commonSpanishWords = new Set(["como", "para", "sobre", "desde", "hasta", "este", "esta", "estos", "estas", "del", "los", "las", "una", "uno", "con", "por", "que", "cual", "donde", "cuando", "mas", "más", "muy", "tan", "not", "the", "and", "for", "are", "was", "were", "will", "with", "from", "have", "has", "had", "been", "this", "that", "they", "them", "their", "there"]);
      const wordCounts = new Map<string, number>();
      combinedResults.split(/\s+/).forEach((w) => {
        const clean = w.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
        if (clean.length > 4 && !commonSpanishWords.has(clean)) {
          wordCounts.set(clean, (wordCounts.get(clean) || 0) + 1);
        }
      });
      const sorted = Array.from(wordCounts.entries()).sort((a, b) => b[1] - a[1]);
      const detectedTopic = sorted.slice(0, 3).map(([w]) => w).join(", ") || "tema no identificado";
      return detectedTopic;
    }

    return null;
  }

  private buildMismatchReport(
    objective: string,
    stepResults: Array<{ step: string; tool: string; status: string; duration?: number; result?: string; error?: string }>,
    detectedTopic: string
  ): string {
    const completedSteps = stepResults.filter((s) => s.status === "completed");
    const failedSteps = stepResults.filter((s) => s.status === "failed");

    return `# Reporte de investigación

## Resumen Ejecutivo

La investigación no pudo completarse correctamente. Los datos recopilados **no corresponden al tema solicitado**.

- **Tema solicitado:** ${objective.slice(0, 200)}
- **Tema detectado en los resultados:** ${detectedTopic}
- **Pasos completados:** ${completedSteps.length}/${stepResults.length}
- **Pasos fallidos:** ${failedSteps.length}

## Posibles causas

1. La consulta de búsqueda se generó a partir de texto adicional pegado en el mensaje (por ejemplo, respuestas anteriores o metadatos).
2. El motor de búsqueda interpretó una palabra aislada del objetivo como otra pregunta.
3. No hay API key configurada o el servicio de búsqueda no está disponible, por lo que se usó información de fallback no relacionada.

## Recomendación

Reformula la consulta de forma directa, por ejemplo:

> "Genera un reporte sobre los 10 alimentos más nutritivos recomendados por la OMS."

Y evita pegar contenido previo en el mismo mensaje para que el agente identifique claramente el tema.`;
  }

  private ensureMarkdown(content: string, category: string): string {
    let md = content.trim();
    if (!md.startsWith("#")) {
      md = `# Reporte de ${category}\n\n${md}`;
    }
    return md;
  }

  private getReportTitle(category: string): string {
    const titles: Record<string, string> = {
      research: "Reporte de investigación",
      code: "Código generado",
      data: "Análisis de datos",
      automation: "Automatización configurada",
      content: "Contenido generado",
    };
    return titles[category] || "Reporte";
  }

  private getReportFilename(category: string): string {
    const filenames: Record<string, string> = {
      research: "reporte.md",
      code: "solution.ts",
      data: "analisis.md",
      automation: "automatizacion.md",
      content: "articulo.md",
    };
    return filenames[category] || "reporte.md";
  }
}
