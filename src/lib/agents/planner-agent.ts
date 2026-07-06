"use client";

import { BaseAgent } from "./base-agent";
import type { ExecutionPlan, ExecutionStep, Analysis, TaskCategory } from "../types";
import { TASK_TEMPLATES, detectCategory, type StepTemplate } from "../mock-data";
import { getAgentModel, type AgentModelKey } from "../config/model-routing";

// ==================== AGENTE 2: PLANIFICADOR ====================
// Modelo: economy=deepseek-v4-flash / quality=qwen3.7-plus
// Fuente de verdad: src/lib/config/model-routing.ts
//
// Responsabilidad:
// - Descomponer el objetivo en pasos ejecutables
// - Identificar dependencias entre pasos
// - Seleccionar herramientas apropiadas para cada paso
// - Estimar recursos (tiempo, costo)
// - Optimizar el orden de ejecución
//
// Lee: Working Memory (análisis del Analizador) + Episodic Memory (tareas similares)
// Escribe: Working Memory (plan actual)

export class PlannerAgent extends BaseAgent {
  constructor() {
    super("planner");
  }

  async createPlan(analysis: Analysis, objective: string, conversationId: string): Promise<ExecutionPlan> {
    // 1. Recuperar análisis de memoria
    const analysisFromMemory = this.retrieveFromMemory("working", `analysis:${conversationId}`);

    // 2. Detectar categoría de tarea
    const category = detectCategory(objective) as TaskCategory;

    // 3. Intentar generar un plan dinámico con LLM real. Si falla (sin API key,
    //    error de red), usar plantilla predefinida según categoría.
    let steps: ExecutionStep[];
    let totalEstimatedTime: number;

    try {
      const dynamicPlan = await this.createPlanWithLLM(objective, analysis, category);
      steps = dynamicPlan.steps;
      totalEstimatedTime = dynamicPlan.totalEstimatedTime;
    } catch (error) {
      console.warn("[PlannerAgent] LLM planning failed, using template fallback:", error);
      const template = TASK_TEMPLATES[category];
      steps = template.steps.map((stepTemplate: StepTemplate, i: number) =>
        this.stepTemplateToExecutionStep(stepTemplate, i)
      );
      totalEstimatedTime = template.steps.reduce((acc, s) => acc + s.duration, 0);
    }

    const plan: ExecutionPlan = {
      steps,
      totalEstimatedTime,
      riskFactors: this.identifyRiskFactors(analysis, category),
    };

    // 4. Guardar plan en working memory
    this.storeInMemory("working", `plan:${conversationId}`, JSON.stringify(plan), {
      conversationId,
      tags: ["plan", conversationId],
    });

    // 5. Emitir evento
    this.emit("plan:created", { conversationId, plan, category });

    return plan;
  }

  private async createPlanWithLLM(
    objective: string,
    analysis: Analysis,
    category: TaskCategory
  ): Promise<{ steps: ExecutionStep[]; totalEstimatedTime: number }> {
    const toolsDescription = this.getAvailableToolsDescription(category);

    const prompt = `Eres un planificador experto. Crea un plan ejecutable para este objetivo del usuario.

Objetivo: """${objective}"""

Análisis previo:
- Contexto: ${analysis.context}
- Complejidad: ${analysis.complexity}
- Entidades: ${analysis.entities.map((e) => `${e.type}:${e.value}`).join(", ")}
- Restricciones: ${analysis.constraints.map((c) => c.description).join("; ")}

Herramientas disponibles:
${toolsDescription}

Responde ÚNICAMENTE con este JSON:
{
  "steps": [
    {
      "number": 1,
      "description": "...",
      "tool": "nombre_herramienta",
      "parameters": { ... },
      "dependencies": [],
      "estimatedTime": 30,
      "produces": "browser|terminal|files|output|data"
    }
  ],
  "totalEstimatedTime": 120
}

Reglas:
- Para investigación/contenido: primero Web Search, luego Web Extraction, luego Document Generation.
- Si el usuario pide N artículos/documentos, genera N pasos de Document Generation o uno solo que los genere todos.
- Las dependencias son los números de pasos previos necesarios.
- estimatedTime en segundos.
- Responde SOLO el JSON.`;

    const response = await this.callLLM(prompt, { maxTokens: 2048 });
    const content = response.content.trim();

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No se encontró JSON en la respuesta del planificador");
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      steps: Array<{
        number: number;
        description: string;
        tool: string;
        parameters?: Record<string, unknown>;
        dependencies?: number[];
        estimatedTime?: number;
        produces?: string;
      }>;
      totalEstimatedTime?: number;
    };

    if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      throw new Error("Plan dinámico inválido: sin pasos");
    }

    const validProduces = ["browser", "terminal", "files", "output", "data"] as const;
    const agentForTool = this.getAgentForTool.bind(this);

    const steps: ExecutionStep[] = parsed.steps.map((step, i) => ({
      id: `step-${i + 1}-${Date.now()}`,
      stepNumber: step.number || i + 1,
      description: step.description,
      toolName: step.tool,
      toolCategory: this.inferToolCategory(step.tool),
      toolParams: step.parameters || {},
      status: "pending" as const,
      logs: [],
      produces: validProduces.includes(step.produces as (typeof validProduces)[number])
        ? (step.produces as (typeof validProduces)[number])
        : "output",
      agent: agentForTool(step.tool),
      modelUsed: getAgentModel(agentForTool(step.tool) as AgentModelKey),
      dependencies: step.dependencies || (i > 0 ? [i] : []),
      duration: step.estimatedTime,
    }));

    return {
      steps,
      totalEstimatedTime: parsed.totalEstimatedTime || steps.reduce((acc, s) => acc + (s.duration || 30), 0),
    };
  }

  private stepTemplateToExecutionStep(stepTemplate: StepTemplate, i: number): ExecutionStep {
    return {
      id: `step-${i + 1}-${Date.now()}`,
      stepNumber: i + 1,
      description: stepTemplate.title,
      toolName: stepTemplate.tool,
      toolCategory: stepTemplate.toolCategory as ExecutionStep["toolCategory"],
      toolParams: {},
      status: "pending" as const,
      logs: [],
      produces: stepTemplate.produces,
      agent: stepTemplate.agent,
      modelUsed: getAgentModel(stepTemplate.agent as AgentModelKey),
      dependencies: i > 0 ? [i] : [],
    };
  }

  private getAvailableToolsDescription(category: TaskCategory): string {
    const baseTools = [
      "Web Search: buscar información en internet (query)",
      "Web Extraction: extraer texto de URLs encontradas",
      "Browser Navigation: navegar a una URL específica",
      "HTTP Client: llamadas a APIs genéricas",
      "Code Generation: generar código",
      "Document Generation: generar documentos Markdown",
      "File Read / File Write: leer/escribir archivos virtuales",
      "Data Analysis: analizar contenido web recopilado",
    ];

    const categoryTools: Record<string, string[]> = {
      research: ["Web Search", "Web Extraction", "Data Analysis", "Document Generation"],
      content: ["Web Search", "Web Extraction", "Document Generation", "Data Analysis"],
      code: ["Code Generation", "File Write", "Testing", "Bash/Shell Execution"],
      data: ["Web Search", "Web Extraction", "Data Analysis", "Visualization"],
      automation: ["HTTP Client", "Chat/Messaging", "Email"],
      general: baseTools,
    };

    return categoryTools[category]?.join("\n") || baseTools.join("\n");
  }

  private inferToolCategory(toolName: string): ExecutionStep["toolCategory"] {
    const map: Record<string, ExecutionStep["toolCategory"]> = {
      "Web Search": "Búsqueda",
      "Web Extraction": "Navegación Web",
      "Web Scraping": "Navegación Web",
      "Browser Navigation": "Navegación Web",
      "HTTP Client": "Integración de APIs",
      Email: "Comunicación",
      "Chat/Messaging": "Comunicación",
      "Code Generation": "Generación de Contenido",
      "Document Generation": "Generación de Contenido",
      "File Read": "Operaciones de Archivos",
      "File Write": "Operaciones de Archivos",
      Git: "Versionamiento",
      "Python Execution": "Ejecución de Código",
      "Node.js Execution": "Ejecución de Código",
      "Bash/Shell Execution": "Ejecución de Código",
      "Data Analysis": "Análisis y Visualización",
      Visualization: "Análisis y Visualización",
      Testing: "Adicionales",
    };
    return map[toolName] || "Adicionales";
  }

  private getAgentForTool(toolName: string): StepTemplate["agent"] {
    const map: Record<string, StepTemplate["agent"]> = {
      "Web Search": "analyzer",
      "Web Extraction": "executor",
      "Web Scraping": "executor",
      "Browser Navigation": "executor",
      "HTTP Client": "executor",
      Email: "executor",
      "Chat/Messaging": "executor",
      "Code Generation": "executor",
      "Document Generation": "reporter",
      "File Read": "executor",
      "File Write": "reporter",
      Git: "executor",
      "Python Execution": "executor",
      "Node.js Execution": "executor",
      "Bash/Shell Execution": "executor",
      "Data Analysis": "verifier",
      Visualization: "reporter",
      Testing: "verifier",
      "Project Management": "planner",
      Deployment: "executor",
    };
    return map[toolName] || "executor";
  }

  private identifyRiskFactors(analysis: Analysis, category: TaskCategory): string[] {
    const risks: string[] = [];

    if (analysis.complexity === "high") {
      risks.push("Tarea de alta complejidad - requiere múltiples pasos coordinados");
    }

    if (analysis.constraints.some((c) => c.type === "access")) {
      risks.push("Dependencia de APIs externas con rate limits");
    }

    if (category === "code") {
      risks.push("Cambios en código pueden tener efectos secundarios");
    }

    if (category === "data" && analysis.constraints.some((c) => c.type === "resource")) {
      risks.push("Volumen de datos puede requerir procesamiento por lotes");
    }

    return risks;
  }
}
