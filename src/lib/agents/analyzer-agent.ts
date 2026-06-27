"use client";

import { BaseAgent } from "./base-agent";
import type { Analysis } from "../types";
import { useMemoryStore } from "../memory/memory-store";

// ==================== AGENTE 1: ANALIZADOR ====================
// Modelo: DeepSeek V4 Flash (rápido, económico)
//
// Responsabilidad:
// - Analizar el objetivo del usuario
// - Extraer entidades (personas, lugares, objetos, acciones)
// - Identificar restricciones (tiempo, recursos, acceso)
// - Detectar contexto
// - Evaluar complejidad (low, medium, high)
//
// Lee: Semantic Memory (patrones conocidos)
// Escribe: Working Memory (análisis actual)

export class AnalyzerAgent extends BaseAgent {
  constructor() {
    super("analyzer");
  }

  async analyze(objective: string, conversationId: string): Promise<Analysis> {
    // 1. Recuperar contexto relevante de memoria
    const memoryStore = useMemoryStore.getState();
    const relevantContext = memoryStore.getRelevantContext(objective);

    // 2. Llamar al LLM para análisis
    // En producción: const response = await this.callLLM(prompt);
    // Por ahora: simulamos basándonos en el objetivo
    const analysis = this.simulateAnalysis(objective);

    // 3. Guardar análisis en working memory
    this.storeInMemory("working", `analysis:${conversationId}`, JSON.stringify(analysis), {
      conversationId,
      tags: ["analysis", conversationId],
    });

    // 4. Si hay patrones aprendidos relevantes, usarlos
    if (relevantContext.learnedPatterns.length > 0) {
      // Aplicar patrones aprendidos al análisis
      analysis.constraints.push({
        type: "other",
        description: `${relevantContext.learnedPatterns.length} patrones aprendidos aplicados`,
      });
    }

    // 5. Emitir evento
    this.emit("analysis:completed", { conversationId, analysis });

    return analysis;
  }

  private simulateAnalysis(objective: string): Analysis {
    const lower = objective.toLowerCase();

    // Detectar entidades
    const entities: { type: string; value: string }[] = [];
    if (/investiga|analiza|estudia|compara/.test(lower)) {
      entities.push({ type: "action", value: "investigar" });
    }
    if (/codigo|código|refactor|migrar|implementa/.test(lower)) {
      entities.push({ type: "action", value: "desarrollar código" });
    }
    if (/csv|datos|data|dataset|dashboard/.test(lower)) {
      entities.push({ type: "object", value: "datos" });
    }
    if (/newsletter|email|envía|envio/.test(lower)) {
      entities.push({ type: "object", value: "comunicación" });
    }
    if (/artículo|blog|contenido|escribe|redacta/.test(lower)) {
      entities.push({ type: "object", value: "contenido" });
    }

    // Detectar restricciones
    const constraints: { type: string; description: string }[] = [];
    if (/\d+/.test(objective)) {
      const match = objective.match(/\d+/);
      if (match) {
        constraints.push({ type: "resource", description: `Cantidad detectada: ${match[0]}` });
      }
    }
    if (/twitter|api|rate limit/i.test(lower)) {
      constraints.push({ type: "access", description: "Requiere API externa con rate limits" });
    }

    // Detectar contexto
    let context = "tarea general";
    if (/investiga|mercado|compet|reporte/.test(lower)) context = "investigación y análisis";
    else if (/codigo|código|refactor|migrar|api/.test(lower)) context = "desarrollo de software";
    else if (/csv|datos|dashboard|estadística/.test(lower)) context = "análisis de datos";
    else if (/newsletter|email|envía|automatiza/.test(lower)) context = "automatización";
    else if (/artículo|blog|contenido|seo/.test(lower)) context = "generación de contenido";

    // Evaluar complejidad
    const wordCount = objective.split(/\s+/).length;
    let complexity: "low" | "medium" | "high" = "low";
    if (wordCount > 30 || entities.length > 3) complexity = "high";
    else if (wordCount > 15 || entities.length > 1) complexity = "medium";

    return { entities, constraints, context, complexity };
  }
}
