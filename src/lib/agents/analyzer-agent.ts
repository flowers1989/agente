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

    // 2. Intentar análisis con LLM real; si falla (sin API key, error de red),
    //    hacer fallback a análisis basado en reglas.
    let analysis: Analysis;
    try {
      analysis = await this.analyzeWithLLM(objective);
    } catch (error) {
      console.warn("[AnalyzerAgent] LLM analysis failed, using fallback:", error);
      analysis = this.simulateAnalysis(objective);
    }

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

  private async analyzeWithLLM(objective: string): Promise<Analysis> {
    const prompt = `Analiza el siguiente objetivo del usuario y responde ÚNICAMENTE con el JSON solicitado.

Objetivo: """${objective}"""

Responde con este JSON exacto:
{
  "entities": [{ "type": "person|place|object|action", "value": "..." }],
  "constraints": [{ "type": "time|resource|access|other", "description": "..." }],
  "context": "...",
  "complexity": "low|medium|high"
}`;

    const response = await this.callLLM(prompt, { maxTokens: 1024 });
    const content = response.content.trim();

    // Extraer JSON de la respuesta (puede venir envuelto en markdown)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No se encontró JSON en la respuesta del analizador");
    }

    const parsed = JSON.parse(jsonMatch[0]) as Analysis;

    // Validar campos mínimos
    if (!Array.isArray(parsed.entities) || !Array.isArray(parsed.constraints)) {
      throw new Error("JSON de análisis inválido");
    }

    return {
      entities: parsed.entities,
      constraints: parsed.constraints,
      context: parsed.context || "tarea general",
      complexity: ["low", "medium", "high"].includes(parsed.complexity) ? parsed.complexity : "medium",
    };
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
