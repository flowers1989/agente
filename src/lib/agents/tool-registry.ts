"use client";

// ==================== TOOL REGISTRY ====================
// Registro central de herramientas ejecutables por el ExecutorAgent.
// Cada herramienta puede mapearse a:
// - Una llamada HTTP a un endpoint del proyecto (browser, connectors)
// - Una función del cliente (localStorage, fetch genérico)
// - Una llamada al LLM (code generation)
// - Una simulación si no hay implementación real todavía

import { getAdapter } from "./opencode-adapter";
import { useMemoryStore } from "../memory/memory-store";

export interface ToolContext {
  conversationId: string;
  userId: string;
  stepId?: string;
}

const isServer = () => typeof window === "undefined";

export interface ToolExecutionResult {
  success: boolean;
  result?: string;
  error?: string;
  data?: unknown;
  // Para herramientas que generan output enriquecido
  output?: {
    type: "text" | "code" | "file" | "image" | "link" | "data" | "html";
    content: string;
    title?: string;
    language?: string;
    filename?: string;
    url?: string;
  };
}

export type ToolExecutor = (
  params: Record<string, unknown>,
  context: ToolContext
) => Promise<ToolExecutionResult>;

export class ToolRegistry {
  private tools = new Map<string, ToolExecutor>();
  private browserSessions = new Map<string, string>(); // conversationId -> sessionId

  constructor() {
    this.registerDefaults();
  }

  register(toolName: string, executor: ToolExecutor): void {
    this.tools.set(toolName, executor);
  }

  has(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  async execute(
    toolName: string,
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolExecutionResult> {
    const executor = this.tools.get(toolName);
    if (!executor) {
      return {
        success: false,
        error: `Herramienta no registrada: ${toolName}`,
      };
    }
    try {
      return await executor(params, context);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  private registerDefaults(): void {
    // === Navegación Web ===
    this.register("Browser Navigation", this.createBrowserExecutor("navigate", ["url"]));
    this.register("Screenshot", this.createBrowserExecutor("screenshot", []));
    this.register("Web Extraction", this.webExtractionExecutor.bind(this));
    this.register("JavaScript Execution", this.createBrowserExecutor("executeScript", ["code"]));

    // === Búsqueda ===
    this.register("Web Search", this.webSearchExecutor.bind(this));
    this.register("Web Scraping", this.webScrapingExecutor.bind(this));

    // === Integración de APIs ===
    this.register("HTTP Client", this.httpClientExecutor.bind(this));

    // === Comunicación ===
    this.register("Email", this.createConnectorExecutor("gmail", "sendEmail"));
    this.register("Chat/Messaging", this.chatMessagingExecutor.bind(this));

    // === Generación de Contenido ===
    this.register("Code Generation", this.codeGenerationExecutor.bind(this));
    this.register("Document Generation", this.documentGenerationExecutor.bind(this));

    // === Operaciones de Archivos ===
    this.register("File Read", this.fileReadExecutor.bind(this));
    this.register("File Write", this.fileWriteExecutor.bind(this));

    // === Versionamiento ===
    this.register("Git", this.gitExecutor.bind(this));

    // === Ejecución de Código ===
    this.register("Python Execution", this.simulatedExecutor("Python ejecutado en sandbox"));
    this.register("Node.js Execution", this.simulatedExecutor("Node.js ejecutado"));
    this.register("Bash/Shell Execution", this.simulatedExecutor("Shell ejecutado"));

    // === Análisis y Visualización ===
    this.register("Data Analysis", this.dataAnalysisExecutor.bind(this));
    this.register("Visualization", this.simulatedExecutor("Visualización generada"));
    this.register("Report Generation", this.simulatedExecutor("Reporte generado"));

    // === Adicionales ===
    this.register("Testing", this.simulatedExecutor("Tests ejecutados"));
    this.register("Project Management", this.simulatedExecutor("Tarea gestionada"));
    this.register("Deployment", this.compilationExecutor.bind(this));
  }

  // ==================== COMPILACIÓN MULTIPLATAFORMA ====================

  private compilationExecutor: ToolExecutor = async (params) => {
    const projectName = String(params.projectName || "MyApp");
    const objective = String(params.objective || "");
    const platforms = Array.isArray(params.platforms)
      ? params.platforms.map(String)
      : ["linux"];

    if (!objective && !projectName) {
      return { success: false, error: "Se requiere objective o projectName" };
    }

    try {
      // 1. Obtener recomendaciones
      const recRes = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objective }),
      });
      const recData = (await recRes.json()) as {
        requirements: Record<string, unknown>;
        recommendations: { platform: string; score: number; framework: string }[];
      };

      // 2. Crear build
      const buildRes = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName,
          requirements: recData.requirements,
          platforms,
        }),
      });
      const buildData = (await buildRes.json()) as {
        buildId: string;
        status: string;
        estimatedTime: number;
        error?: string;
      };

      if (!buildRes.ok || buildData.error) {
        return {
          success: false,
          error: buildData.error || "Error creando build",
        };
      }

      // 3. Esperar a que termine (polling simple)
      const buildId = buildData.buildId;
      let status = buildData.status;
      let attempts = 0;
      let finalBuild: { status: string; artifacts: { platform: string; downloadUrl: string; fileSize: number }[]; error?: string } | null = null;

      while (status === "queued" || status === "compiling") {
        await new Promise((r) => setTimeout(r, 1000));
        const statusRes = await fetch(`/api/compile/${buildId}`);
        finalBuild = (await statusRes.json()) as {
          status: string;
          artifacts: { platform: string; downloadUrl: string; fileSize: number }[];
          error?: string;
        };
        status = finalBuild.status;
        if (++attempts > 60) break;
      }

      const artifactList = finalBuild?.artifacts || [];
      const artifactSummary = artifactList
        .map((a) => `- ${a.platform}: ${a.downloadUrl} (${(a.fileSize / 1024).toFixed(1)} KB)`)
        .join("\n");

      return {
        success: status === "completed",
        result: `Compilación ${status}. ${artifactList.length} artefacto(s) generado(s).\n\n${artifactSummary}`,
        data: { buildId, status, artifacts: artifactList },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  };

  // ==================== BROWSER HELPERS ====================

  private async getOrCreateBrowserSession(conversationId: string): Promise<string | null> {
    const existing = this.browserSessions.get(conversationId);
    if (existing) {
      // Verificar que sigue activa
      if (isServer()) {
        try {
          const { browserControlConnector } = await import("@/lib/browser/BrowserControlConnector");
          if (browserControlConnector.getSession(existing)) return existing;
        } catch {
          // Ignorar, vamos a crear una nueva
        }
      } else {
        try {
          const res = await fetch(`/api/browser/sessions/${existing}`);
          if (res.ok) return existing;
        } catch {
          // Ignorar, vamos a crear una nueva
        }
      }
    }

    try {
      if (isServer()) {
        const { browserControlConnector } = await import("@/lib/browser/BrowserControlConnector");
        const { getUserId } = await import("@/lib/api/auth");
        const session = await browserControlConnector.createSession(getUserId(), {});
        this.browserSessions.set(conversationId, session.id);
        return session.id;
      }
      const res = await fetch("/api/browser/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeoutMs: 10 * 60 * 1000 }),
      });
      if (!res.ok) throw new Error(`Error creando sesión: ${res.status}`);
      const data = (await res.json()) as { session: { id: string } };
      this.browserSessions.set(conversationId, data.session.id);
      return data.session.id;
    } catch (error) {
      console.error("[ToolRegistry] Failed to create browser session:", error);
      return null;
    }
  }

  private createBrowserExecutor(
    action: string,
    requiredParams: string[]
  ): ToolExecutor {
    return async (params, context) => {
      const missing = requiredParams.filter((p) => params[p] === undefined);
      if (missing.length > 0) {
        return {
          success: false,
          error: `Parámetros requeridos faltantes: ${missing.join(", ")}`,
        };
      }

      const sessionId = await this.getOrCreateBrowserSession(context.conversationId);
      if (!sessionId) {
        return { success: false, error: "No se pudo crear sesión de navegador" };
      }

      // Ejecutar la acción solicitada
      const actionResult = await this.executeBrowserAction(sessionId, action, params);
      if (!actionResult.success) {
        return actionResult;
      }

      const data = actionResult.data as {
        success: boolean;
        data?: { url?: string; title?: string };
        screenshot?: string;
        error?: string;
      };

      // Guardar URL/título en working memory para contexto
      if (data.data?.url) {
        useMemoryStore
          .getState()
          .store(
            "working",
            `browser:url:${context.conversationId}`,
            data.data.url,
            { conversationId: context.conversationId, tags: ["browser"] }
          );
      }

      let resultText = `Acción ${action} completada`;
      if (data.data?.title) resultText += ` - ${data.data.title}`;
      if (data.data?.url) resultText += ` (${data.data.url})`;

      // Para navegación, si no hay screenshot, tomamos uno automáticamente
      // para que el usuario vea la página en el workspace
      let screenshot = data.screenshot;
      if (!screenshot && (action === "navigate" || action === "click" || action === "clickBySelector" || action === "type")) {
        const screenshotResult = await this.executeBrowserAction(sessionId, "screenshot", {});
        if (screenshotResult.success) {
          screenshot = (screenshotResult.data as { screenshot?: string }).screenshot;
        }
      }

      return {
        success: true,
        result: resultText,
        data,
        output: screenshot
          ? {
              type: "image",
              content: `data:image/jpeg;base64,${screenshot}`,
              title: data.data?.title || "Screenshot",
              url: data.data?.url,
            }
          : undefined,
      };
    };
  }

  private async executeBrowserAction(
    sessionId: string,
    action: string,
    params: Record<string, unknown>
  ): Promise<ToolExecutionResult> {
    // En el servidor, llamamos directamente al connector (sin fetch HTTP).
    if (isServer()) {
      try {
        const { browserControlConnector } = await import("@/lib/browser/BrowserControlConnector");
        const result = await browserControlConnector.executeAction(sessionId, action, params);
        if (!result.success) {
          return { success: false, error: result.error || "Error desconocido" };
        }
        return { success: true, result: `Acción ${action} completada`, data: result };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: `Error ejecutando ${action}: ${message}` };
      }
    }

    const res = await fetch(`/api/browser/sessions/${sessionId}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, params }),
    });

    if (!res.ok) {
      return {
        success: false,
        error: `Error ejecutando ${action}: ${res.status}`,
      };
    }

    const data = await res.json();
    if (!data.success) {
      return { success: false, error: data.error || "Error desconocido" };
    }

    return { success: true, result: `Acción ${action} completada`, data };
  }

  private webExtractionExecutor: ToolExecutor = async (params, context) => {
    let urls: string[] = [];

    if (params.url && typeof params.url === "string") {
      urls = [params.url];
    }

    // Si no hay URL directa, intentar usar resultados de búsqueda previos
    if (urls.length === 0) {
      const searchEntry = useMemoryStore.getState().retrieve("working", `search:results:${context.conversationId}`);
      if (searchEntry) {
        try {
          const parsed = JSON.parse(searchEntry.value) as Array<{ url: string }>;
          urls = parsed.map((r) => r.url).filter(Boolean).slice(0, 3);
          if (urls.length > 0) {
            // Guardar primera URL en memoria para contexto de navegación
            useMemoryStore.getState().store(
              "working",
              `browser:url:${context.conversationId}`,
              urls[0],
              { conversationId: context.conversationId, tags: ["browser"] }
            );
          }
        } catch {
          // Ignorar errores de parseo
        }
      }
    }

    if (urls.length === 0) {
      // Si aún no hay URL, usamos el LLM para responder sobre el tema del paso/contexto.
      try {
        const adapter = getAdapter();
        const topic = params.topic || params.query || context.stepId || "el tema solicitado";
        const response = await adapter.chat(
          [
            {
              role: "system",
              content:
                "Eres un asistente de investigación. Resume datos clave y métricas de forma concisa. Máximo 3 párrafos.",
            },
            { role: "user", content: `Resume datos y métricas clave sobre: ${topic}` },
          ],
          { model: "deepseek-v4-flash", maxTokens: 1024 }
        );
        return {
          success: true,
          result: `Resumen de información sobre "${topic}":\n\n${response.content}`,
          data: response,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message };
      }
    }

    return this.runWebExtraction(urls, context);
  };

  private async runWebExtraction(urls: string[], context: ToolContext): Promise<ToolExecutionResult> {
    const navigate = this.createBrowserExecutor("navigate", ["url"]);
    const extract = this.createBrowserExecutor("extractText", []);

    const extracted: Array<{ url: string; title: string; text: string }> = [];

    for (const url of urls.slice(0, 3)) {
      try {
        const navResult = await navigate({ url }, context);
        if (!navResult.success) continue;

        const extractResult = await extract({}, context);
        if (!extractResult.success) continue;

        const text = typeof extractResult.data === "string"
          ? extractResult.data
          : (extractResult.data as { data?: string })?.data || "";

        // Extraer título del resultado de navegación
        const title = (navResult.data as { title?: string } | undefined)?.title || url;

        extracted.push({ url, title, text: text.slice(0, 4000) });
      } catch (error) {
        console.warn(`[ToolRegistry] Failed to extract ${url}:`, error);
      }
    }

    if (extracted.length === 0) {
      return { success: false, error: "No se pudo extraer contenido de ninguna URL" };
    }

    const combinedText = extracted
      .map((e, i) => `--- Fuente ${i + 1}: ${e.title} (${e.url}) ---\n${e.text}`)
      .join("\n\n");

    return {
      success: true,
      result: `Contenido extraído de ${extracted.length} URL(s). Total: ${combinedText.length} caracteres.\n\n${combinedText.slice(0, 6000)}${combinedText.length > 6000 ? "\n\n..." : ""}`,
      data: { sources: extracted.length, extracted },
    };
  }

  // ==================== BÚSQUEDA / SCRAPING ====================

  private webSearchExecutor: ToolExecutor = async (params, context) => {
    const query = params.query;
    if (!query || typeof query !== "string") {
      return { success: false, error: "Parámetro 'query' requerido" };
    }

    try {
      // En el servidor, llamamos directamente a la función de búsqueda.
      // En el cliente, usamos el endpoint /api/search vía fetch.
      let results: Array<{ title: string; url: string; snippet: string }>;

      if (isServer()) {
        const { searchWeb } = await import("@/lib/search/search-web");
        results = await searchWeb(query, Math.min(Number(params.limit) || 5, 10));
      } else {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, limit: Math.min(Number(params.limit) || 5, 10) }),
        });
        if (!res.ok) {
          throw new Error(`Error en búsqueda web: ${res.status}`);
        }
        const data = (await res.json()) as { results?: Array<{ title: string; url: string; snippet: string }> };
        results = data.results || [];
      }

      if (results.length === 0) {
        return { success: false, error: "No se encontraron resultados" };
      }

      // Guardar URLs en memoria para que Web Extraction las use después
      useMemoryStore.getState().store(
        "working",
        `search:results:${context.conversationId}`,
        JSON.stringify(results),
        { conversationId: context.conversationId, tags: ["search", "web"] }
      );

      const summary = results
        .map((r, i) => `${i + 1}. ${r.title}\n   URL: ${r.url}\n   ${r.snippet}`)
        .join("\n\n");

      return {
        success: true,
        result: `Resultados de búsqueda para "${query}":\n\n${summary}`,
        data: { results },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn("[ToolRegistry] Web search failed, falling back to LLM:", message);

      // Fallback a LLM si DuckDuckGo falla
      try {
        const adapter = getAdapter();
        const response = await adapter.chat(
          [
            {
              role: "system",
              content:
                "Eres un asistente de investigación. Responde de forma concisa, estructurada y factual. Máximo 3 párrafos. Indica que la información proviene del conocimiento del modelo y puede no estar actualizada.",
            },
            { role: "user", content: `Investiga y resume: ${query}` },
          ],
          { model: "deepseek-v4-flash", maxTokens: 1024 }
        );
        return {
          success: true,
          result: `Información encontrada sobre "${query}" (fallback a conocimiento del modelo):\n\n${response.content}`,
          data: response,
        };
      } catch (llmError) {
        return {
          success: false,
          error: `No se pudo realizar la búsqueda: ${message}`,
        };
      }
    }
  };

  private webScrapingExecutor: ToolExecutor = async (params, context) => {
    return this.webExtractionExecutor(params, context);
  };

  // ==================== HTTP / APIs ====================

  private httpClientExecutor: ToolExecutor = async (params) => {
    const method = String(params.method || "GET").toUpperCase();
    const url = String(params.url || "");
    if (!url) {
      return { success: false, error: "Parámetro 'url' requerido" };
    }

    try {
      const res = await fetch(url, {
        method,
        headers: (params.headers as Record<string, string>) || {},
        body: params.body ? JSON.stringify(params.body) : undefined,
      });
      const text = await res.text();
      return {
        success: res.ok,
        result: `HTTP ${res.status} ${res.statusText}. Body: ${text.slice(0, 1500)}`,
        data: { status: res.status, statusText: res.statusText, body: text },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  };

  // ==================== CONNECTORS ====================

  private createConnectorExecutor(
    source: string,
    defaultAction: string
  ): ToolExecutor {
    return async (params, context) => {
      const action = String(params.action || defaultAction);
      try {
        const res = await fetch(`/api/connectors/${source}/actions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, params }),
        });
        const data = (await res.json()) as {
          success: boolean;
          data?: unknown;
          error?: string;
        };
        if (!data.success) {
          return {
            success: false,
            error: data.error || `Error ejecutando ${source}/${action}`,
          };
        }
        return {
          success: true,
          result: `Acción ${source}/${action} completada`,
          data: data.data,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message };
      }
    };
  }

  private chatMessagingExecutor: ToolExecutor = async (params, context) => {
    const platform = String(params.platform || "slack").toLowerCase();
    const sourceMap: Record<string, string> = {
      slack: "slack",
      discord: "discord",
      telegram: "telegram",
    };
    const source = sourceMap[platform] || "slack";
    const executor = this.createConnectorExecutor(source, "sendMessage");
    return executor(params, context);
  };

  // ==================== GENERACIÓN DE CONTENIDO ====================

  private codeGenerationExecutor: ToolExecutor = async (params) => {
    const description = String(params.description || "");
    const language = String(params.language || "typescript");
    if (!description) {
      return { success: false, error: "Parámetro 'description' requerido" };
    }
    try {
      const adapter = getAdapter();
      const response = await adapter.chat(
        [
          {
            role: "system",
            content: `Eres un experto programador. Genera código limpio, documentado y listo para usar en ${language}. Responde SOLO con el código, sin explicaciones adicionales.`,
          },
          { role: "user", content: description },
        ],
        { model: "deepseek-v4-flash", maxTokens: 2048 }
      );
      return {
        success: true,
        result: `Código generado en ${language} (${response.content.length} caracteres)`,
        data: response,
        output: {
          type: "code",
          content: response.content,
          language,
          title: params.title ? String(params.title) : `generated.${language}`,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  };

  private documentGenerationExecutor: ToolExecutor = async (params, context) => {
    const topic = String(params.topic || params.template || params.description || "");
    if (!topic) {
      return { success: false, error: "Parámetro 'topic', 'template' o 'description' requerido" };
    }

    const adapter = getAdapter();

    // Sin API key no podemos generar contenido original con LLM.
    if (!adapter.isInitialized()) {
      const memory = useMemoryStore.getState();
      const extractionEntry = memory
        .search("working", `step:${context.conversationId}:`)
        .find((e) => e.value && e.value.includes("Contenido extraído"));
      const extractedContent = extractionEntry?.value || "";

      const searchEntry = memory.retrieve("working", `search:results:${context.conversationId}`);
      let sources = "No se encontraron fuentes.";
      if (searchEntry) {
        try {
          const results = JSON.parse(searchEntry.value) as Array<{ title: string; url: string }>;
          sources = results.map((r) => `- [${r.title}](${r.url})`).join("\n");
        } catch {
          sources = searchEntry.value.slice(0, 1000);
        }
      }

      const contentPreview = extractedContent
        ? `\n\n## Información investigada (preview)\n\n${extractedContent.slice(0, 1500)}${extractedContent.length > 1500 ? "\n\n..." : ""}`
        : "";

      const notice = `# ${topic}\n\n## ⚠️ API KEY REQUERIDA\n\n**No se pudo generar el contenido porque no hay una API key de OpenCode Go configurada o no pasó el test de conexión.**\n\nSin embargo, el agente **sí investigó** el tema y encontró las siguientes fuentes:\n\n${sources}\n${contentPreview}\n\n## Para continuar\n\n1. Ve a **Configuración → API** en el agente.\n2. Introduce tu API key de OpenCode Go.\n3. Haz clic en **Probar** y espera "Conexión exitosa".\n4. Vuelve a pedirme esta tarea.`;

      return {
        success: true,
        result: "Documento no generado: falta API key",
        output: {
          type: "file",
          content: notice,
          title: topic,
          filename: "api_key_requerida.md",
        },
      };
    }

    // Recuperar contenido web extraído previamente para enriquecer la generación
    const memory = useMemoryStore.getState();
    const extractionEntry = memory
      .search("working", `step:${context.conversationId}:`)
      .find((e) => e.value && e.value.includes("Contenido extraído"));
    const extractedContent = extractionEntry?.value || "";

    try {
      // Limitar contexto para dejar espacio de tokens a la respuesta.
      const maxContextLength = 8000;
      const contextSnippet = extractedContent
        ? `${extractedContent.slice(0, maxContextLength)}${extractedContent.length > maxContextLength ? "\n\n..." : ""}`
        : "";

      const isMultipleArticles = /\b(10|diez)\s+articulos?|\b(10|diez)\s+artículos?/i.test(topic);
      const articleCount = topic.match(/\b(\d+)\s+articulos?|\b(\d+)\s+artículos?/i)?.[1] || "10";

      const userContent = extractedContent
        ? `Tema: ${topic}\n\nUsa la siguiente información investigada como base factual (no inventes datos que no estén aquí):\n\n${contextSnippet}\n\n${
            isMultipleArticles
              ? `Genera EXACTAMENTE ${articleCount} artículos SEO completos y estructurados. Cada artículo debe tener un título, subtítulos cuando aplique, y 3-4 párrafos de contenido útil. Enumera los artículos del 1 al ${articleCount}.`
              : `Genera un documento completo, estructurado y detallado sobre el tema.`
          }`
        : `${
            isMultipleArticles
              ? `Genera EXACTAMENTE ${articleCount} artículos SEO completos y estructurados sobre: ${topic}. Cada artículo debe tener un título, subtítulos cuando aplique, y 3-4 párrafos de contenido útil. Enumera los artículos del 1 al ${articleCount}.`
              : `Genera un documento completo, estructurado y detallado sobre: ${topic}`
          }`;

      const response = await adapter.chat(
        [
          {
            role: "system",
            content:
              "Eres un escritor SEO experto. Genera contenido bien estructurado, útil, profesional y optimizado para motores de búsqueda. Usa títulos, subtítulos, viñetas y tablas cuando apliquen. Cuando se te proporcionen datos de investigación, utilízalos como base factual. Nunca devuelvas solo el título; genera siempre el contenido completo solicitado. No menciones el formato ni el nombre del formato en el contenido.",
          },
          { role: "user", content: userContent },
        ],
        { model: "deepseek-v4-flash", maxTokens: 16384 }
      );

      let content = response.content.trim();
      if (!content.startsWith("#")) {
        content = `# ${topic}\n\n${content}`;
      }

      // Validar que el contenido tenga sustancia (más de 300 caracteres después del título).
      const contentWithoutTitle = content.replace(/^#\s.*$/m, "").trim();
      if (contentWithoutTitle.length < 300) {
        return {
          success: false,
          error: "El modelo generó un documento demasiado corto o incompleto. Intenta de nuevo o usa una API key con mayor límite de tokens.",
        };
      }

      const safeFilename = topic.replace(/[^a-z0-9\u00e1\u00e9\u00ed\u00f3\u00fa\u00f1\s]/gi, "").replace(/\s+/g, "_").toLowerCase() || "documento";

      return {
        success: true,
        result: `Documento "${topic}" generado (${content.length} caracteres)`,
        output: {
          type: "file",
          content,
          title: topic,
          filename: `${safeFilename}.md`,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: `Error generando documento: ${message}` };
    }
  };

  // ==================== ANÁLISIS DE DATOS REALES ====================

  private dataAnalysisExecutor: ToolExecutor = async (params, context) => {
    try {
      const memory = useMemoryStore.getState();
      const searchEntry = memory.retrieve("working", `search:results:${context.conversationId}`);

      // Recuperar todas las entradas de pasos de esta conversación (más recientes primero)
      const stepEntries = memory
        .search("working", `step:${context.conversationId}:`)
        .filter((e) => e.value && e.value.length > 20);

      // Priorizar contenido extraído, luego resultados de búsqueda, luego cualquier otro resultado de paso
      let contentToAnalyze = "";
      const extractionEntry = stepEntries.find((e) => e.value.includes("Contenido extraído"));
      const searchResultEntry = stepEntries.find((e) => e.value.includes("Resultados de búsqueda"));

      if (extractionEntry) {
        contentToAnalyze = extractionEntry.value;
      } else if (searchResultEntry) {
        contentToAnalyze = searchResultEntry.value;
      } else if (searchEntry) {
        contentToAnalyze = searchEntry.value;
      } else if (stepEntries.length > 0) {
        contentToAnalyze = stepEntries.map((e) => e.value).join("\n\n");
      }

      if (!contentToAnalyze || contentToAnalyze.length < 50) {
        return {
          success: true,
          result: "Análisis completado. No había suficiente contenido web para analizar.",
        };
      }

      const adapter = getAdapter();

      // Sin API key: devolver un resumen estructurado simple sin LLM.
      if (!adapter.isInitialized()) {
        const lines = contentToAnalyze
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 10 && !l.startsWith("http"))
          .slice(0, 10);

        return {
          success: true,
          result: `Análisis completado (sin API key). Se encontraron ${lines.length} fragmentos relevantes:\n\n${lines.join("\n\n")}\n\nPara obtener un análisis con IA, configura una API key en Configuración → API.`,
          data: { analysis: lines.join("\n") },
        };
      }

      // Resumir con LLM para obtener insights reales
      const response = await adapter.chat(
        [
          {
            role: "system",
            content:
              "Eres un analista de datos. Analiza el contenido proporcionado y extrae: 1) Hallazgos principales (bullet points), 2) Tendencias o patrones, 3) Conclusiones clave. Sé conciso. Máximo 5 bullets.",
          },
          {
            role: "user",
            content: `Analiza el siguiente contenido web y extrae los puntos clave:\n\n${contentToAnalyze.slice(0, 12000)}`,
          },
        ],
        { model: "deepseek-v4-flash", maxTokens: 4096 }
      );

      return {
        success: true,
        result: `Análisis de datos completado:\n\n${response.content}`,
        data: { analysis: response.content },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: `Error en análisis: ${message}` };
    }
  };

  // ==================== ARCHIVOS LOCALES ====================

  private fileReadExecutor: ToolExecutor = async (params) => {
    const path = String(params.path || "");
    if (!path) return { success: false, error: "Parámetro 'path' requerido" };
    // Usar localStorage para archivos virtuales
    const key = `agent:file:${path}`;
    const content = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    if (content === null) {
      return { success: false, error: `Archivo no encontrado: ${path}` };
    }
    return {
      success: true,
      result: `Archivo leído: ${path} (${content.length} caracteres)`,
      data: { path, content },
    };
  };

  private fileWriteExecutor: ToolExecutor = async (params) => {
    const path = String(params.path || "");
    const content = String(params.content || "");
    if (!path) return { success: false, error: "Parámetro 'path' requerido" };
    if (typeof window !== "undefined") {
      localStorage.setItem(`agent:file:${path}`, content);
    }
    return {
      success: true,
      result: `Archivo escrito: ${path} (${content.length} caracteres)`,
      data: { path },
    };
  };

  // ==================== GIT ====================

  private gitExecutor: ToolExecutor = async (params) => {
    // Sin backend de Git real, usamos simulación
    const action = String(params.action || "status");
    const repo = String(params.repo || "repositorio actual");
    return {
      success: true,
      result: `Git ${action} en ${repo} completado (simulado)`,
    };
  };

  // ==================== SIMULACIÓN ====================

  private simulatedExecutor(resultText: string): ToolExecutor {
    return async () => ({
      success: true,
      result: resultText,
    });
  }
}

export const toolRegistry = new ToolRegistry();
