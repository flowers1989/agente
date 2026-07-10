"use client";

import { BaseAgent } from "./base-agent";
import type { ExecutionStep } from "../types";
import { useMemoryStore } from "../memory/memory-store";
import { toolRegistry, type ToolExecutionResult } from "./tool-registry";
import { getAuthUser } from "../api/auth";

// ==================== AGENTE 3: EJECUTOR ====================
// Modelo: DeepSeek V4 Flash (velocidad extrema, bajo costo)
//
// Responsabilidad:
// - Ejecutar cada paso del plan
// - Preparar parámetros para cada herramienta
// - Ejecutar la herramienta (ahora vía ToolRegistry)
// - Manejar errores
// - Guardar resultado en memoria
//
// Lee: Working Memory (plan y contexto)
// Escribe: Working Memory (resultados de pasos)

export class ExecutorAgent extends BaseAgent {
  constructor() {
    super("executor");
  }

  async executeStep(step: ExecutionStep, conversationId: string): Promise<{
    success: boolean;
    result?: string;
    error?: string;
    duration: number;
    output?: ToolExecutionResult["output"];
  }> {
    // 1. Preparar parámetros
    const params = await this.prepareParameters(step, conversationId);

    // 3. Ejecutar la herramienta vía ToolRegistry
    const startTime = Date.now();
    const userId = getAuthUser().id;

    const toolResult = await toolRegistry.execute(step.toolName, params, {
      conversationId,
      userId,
      stepId: step.id,
    });

    const duration = Math.floor((Date.now() - startTime) / 1000);

    if (!toolResult.success) {
      const error = toolResult.error || "Error desconocido ejecutando herramienta";

      // Guardar error en memoria episódica
      this.storeInMemory("episodic", `error:${conversationId}:${step.id}`, error, {
        conversationId,
        success: false,
        tags: ["error", "retryable", step.id],
      });

      this.emit("step:failed", { conversationId, stepId: step.id, error });

      return { success: false, error, duration };
    }

    // 4. Guardar resultado en working memory
    const result = toolResult.result || "Operación completada";
    this.storeInMemory("working", `step:${conversationId}:${step.id}`, result, {
      conversationId,
      tags: ["step-result", step.id],
    });

    // 5. Emitir evento
    this.emit("step:completed", { conversationId, stepId: step.id, result, duration });

    return { success: true, result, duration, output: toolResult.output };
  }

  // Preparar parámetros combinando toolParams con contexto del objetivo
  private async prepareParameters(
    step: ExecutionStep,
    conversationId: string
  ): Promise<Record<string, unknown>> {
    const params: Record<string, unknown> = { ...step.toolParams };

    // Si el paso necesita una URL y no tiene, intentar recuperar del contexto
    if (step.toolName === "Browser Navigation" || step.toolName === "Web Extraction" || step.toolName === "Web Scraping") {
      if (!params.url) {
        const lastUrl = this.retrieveFromMemory("working", `browser:url:${conversationId}`);
        if (lastUrl) params.url = lastUrl;
      }
      // Para Web Extraction/Web Scraping sin URL, pasar el tema del paso para búsqueda LLM
      if ((step.toolName === "Web Extraction" || step.toolName === "Web Scraping") && !params.url && !params.topic) {
        params.topic = step.description;
      }
    }

    // Si es generación de código y no tiene descripción, usar la descripción del paso
    if (step.toolName === "Code Generation" && !params.description) {
      params.description = step.description;
    }

    // Si es generación de documento y no tiene topic, usar el objetivo del usuario
    if (step.toolName === "Document Generation" && !params.topic && !params.template) {
      const objectiveEntry = this.retrieveFromMemory("working", `objective:${conversationId}`);
      params.topic = objectiveEntry?.value || step.description;
    }

    // Si es búsqueda web y no tiene query, generar uno específico basado en el objetivo
    if (step.toolName === "Web Search" && !params.query) {
      params.query = await this.generateSearchQuery(step, conversationId);
    }

    return params;
  }

  // Genera un query de búsqueda optimizado a partir del objetivo del usuario y el paso actual.
  // Prioriza heurísticas locales para no depender del LLM cuando no hay API key.
  private async generateSearchQuery(step: ExecutionStep, conversationId: string): Promise<string> {
    const objectiveEntry = this.retrieveFromMemory("working", `objective:${conversationId}`);
    const rawObjective = objectiveEntry?.value || step.description;
    const objective = this.extractSearchTopic(rawObjective);
    const lowerObjective = objective.toLowerCase();
    const lowerStep = step.description.toLowerCase();

    // Detectar intenciones comunes y generar queries específicos sin gastar tokens en LLM
    const isStocks = /acciones|stock price|fundamentales|sentimiento del mercado|ticker|nasdaq|s&p|bullish|bearish/.test(lowerObjective);
    const isProducts = /productos|ecommerce|e-commerce|vender online|high demand|trending products|dropshipping/.test(lowerObjective);
    const isNews = /noticias|news|noticias del día|latest news|headlines/.test(lowerObjective);
    const isFood = /alimentos|nutrición|nutricion|saludable|dieta|comida|comidas|receta|recetas/.test(lowerObjective);

    if (isStocks) {
      const tickerMatch = objective.match(/\b([A-Z]{1,5})\b/);
      const ticker = tickerMatch ? tickerMatch[1] : "";
      const company = lowerObjective.replace(/acciones de|stock price|fundamentales|sentimiento del mercado|analiza|\b(A[Mm][Zz][Nn]|T[Mm][Ss][Ll][Aa])\b/g, " ").trim();
      if (ticker) {
        if (lowerObjective.includes("fundamentales")) return `${ticker} stock fundamentals revenue earnings 2026`;
        if (lowerObjective.includes("sentimiento")) return `${ticker} stock market sentiment analyst rating news`;
        return `${ticker} stock price analysis latest news 2026`;
      }
      return `${company || objective} stock analysis latest 2026`;
    }

    if (isProducts) {
      if (lowerStep.includes("buscando") || lowerStep.includes("search")) {
        return "trending products to sell online 2026 high demand ecommerce";
      }
      return "best selling products online 2026 high demand";
    }

    if (isNews) {
      return "latest world news today top headlines";
    }

    if (isFood) {
      if (lowerObjective.includes("receta") || lowerObjective.includes("recetas")) {
        return "healthy recipes nutritional information 2026";
      }
      return "top 10 healthy foods nutrition benefits WHO Harvard";
    }

    // Generar query en inglés a partir del tema usando heurísticas.
    const heuristicQuery = this.buildEnglishSearchQuery(objective);
    if (heuristicQuery) {
      return heuristicQuery;
    }

    // Fallback a LLM solo si hay API key disponible.
    try {
      const response = await this.callLLM(
        `Tema de investigación: ${objective}\n\nGenera UNA consulta de búsqueda web corta en inglés para encontrar información actualizada y relevante sobre ese tema. Responde SOLO la consulta, sin comillas ni explicaciones.`,
        { maxTokens: 60 }
      );
      const query = response.content.trim();
      return this.sanitizeSearchQuery(query) || objective;
    } catch {
      return objective;
    }
  }

  // Extrae el tema real de búsqueda descartando metadatos, respuestas anteriores,
  // bloques markdown y cualquier contenido pegado que no sea la petición actual.
  private extractSearchTopic(raw: string): string {
    if (!raw) return "";

    const lines = raw.split(/\r?\n/).filter((l) => l.trim());
    const firstLine = lines[0] || "";

    const looksLikeRequest = /^(hazme|haz|hazlo|genera|crea|escribe|redacta|investiga|analiza|reporte|realiza|elabora|desarrolla|prepara|busca|encuentra|dame|muéstrame|muestrame|cuéntame|cuentame|dime|por favor|quiero|necesito|puedes|podrías|podrias)\b/i.test(firstLine);
    const candidate = looksLikeRequest ? firstLine : raw;

    let cleaned = candidate
      .replace(/#{1,6}\s+/g, " ")
      .replace(/\*\*|\*|__|\||`/g, " ")
      .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, " ")
      .replace(/[-]{3,}/g, " ")
      .trim();

    cleaned = cleaned
      .replace(/^\s*(hazme|haz|hazlo|genera|crea|escribe|redacta|investiga|analiza|realiza|elabora|desarrolla|prepara|busca|encuentra|dame|muéstrame|muestrame|cuéntame|cuentame|dime|por favor|quiero|necesito|puedes|podrías|podrias)\s+/i, "")
      .replace(/\s+(por favor)$/i, "")
      .trim();

    if (cleaned.length < 8 && firstLine.length >= 8) {
      cleaned = firstLine.replace(/^\s*(hazme|haz|hazlo|genera|crea|escribe|redacta|investiga|analiza|realiza|elabora|desarrolla|prepara|busca|encuentra|dame|muéstrame|muestrame|cuéntame|cuentame|dime|por favor|quiero|necesito|puedes|podrías|podrias)\s+/i, "").trim();
    }

    return cleaned || raw.slice(0, 200).trim();
  }

  // Construye una query de búsqueda en inglés a partir del tema en español.
  // Esto evita depender del LLM cuando no hay API key configurada.
  private buildEnglishSearchQuery(topic: string): string {
    if (!topic) return "";

    let cleaned = topic.toLowerCase();

    // Palabras comunes en español a ignorar
    const stopWords = [
      "de", "del", "la", "las", "el", "los", "un", "una", "unos", "unas",
      "y", "o", "con", "por", "para", "en", "sobre", "sobre", "acerca",
      "hazme", "genera", "crea", "escribe", "redacta", "investiga", "analiza",
      "dame", "muéstrame", "muestrame", "cuéntame", "cuentame", "dime",
      "realiza", "elabora", "desarrolla", "prepara", "busca", "encuentra",
      "reporte", "artículos", "articulos", "articulo", "artículo", "documento",
      "haz", "hazlo", "por favor", "quiero", "necesito", "puedes", "podrias", "podrías",
    ];

    // Reemplazar números seguidos de unidades de contenido (10 artículos → quitar "10 artículos")
    cleaned = cleaned.replace(/\b\d+\s+(artículos|articulos|artículo|articulo|posts|entradas|documentos|páginas|paginas|secciones)\b/gi, " ");

    // Quitar stop words
    const words = cleaned
      .split(/\s+/)
      .filter((w) => w.length > 1 && !stopWords.includes(w));

    if (words.length === 0) return "";

    // Traducciones simples de términos clave al inglés para mejores resultados
    const translations: Record<string, string> = {
      "ia": "artificial intelligence",
      "ai": "artificial intelligence",
      "tendencias": "trends",
      "tendencia": "trend",
      "nutrición": "nutrition",
      "nutricion": "nutrition",
      "alimentos": "foods",
      "alimento": "food",
      "comida": "food",
      "comidas": "foods",
      "receta": "recipe",
      "recetas": "recipes",
      "saludable": "healthy",
      "dieta": "diet",
      "tecnología": "technology",
      "tecnologia": "technology",
      "marketing": "marketing",
      "seo": "seo",
      "negocios": "business",
      "empresa": "business",
      "finanzas": "finance",
      "salud": "health",
      "educación": "education",
      "educacion": "education",
    };

    const translated = words
      .map((w) => translations[w] || w)
      .join(" ");

    // Añadir año si el tema parece futurista/tendencias y aún no tiene año
    let query = translated;
    const hasYear = /\b20\d{2}\b/.test(query);
    if (!hasYear && /trend|tendencia|futuro|future|próximo|proximo|nuevo|nueva|upcoming/i.test(query)) {
      query += " 2026";
    }

    return query.trim();
  }

  // Evita que la query de búsqueda contenga basura de simulaciones o metadatos.
  private sanitizeSearchQuery(query: string): string {
    if (!query) return "";
    const lower = query.toLowerCase();
    if (/^procesando con\s+/.test(lower)) return "";
    if (lower.includes("objetivo del usuario") || lower.includes("paso actual")) return "";
    if (lower.includes("reporte de investigación") && lower.includes("resultados")) return "";
    return query.slice(0, 300).trim();
  }
}
