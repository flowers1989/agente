"use client";

import { BaseAgent } from "./base-agent";
import type { ExecutionPlan, ExecutionStep, Analysis, TaskCategory } from "../types";
import { TASK_TEMPLATES, detectCategory, type StepTemplate } from "../mock-data";

// ==================== AGENTE 2: PLANIFICADOR ====================
// Modelo: Qwen3.7 Plus (razonamiento, planificación)
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

    // 3. En producción: const response = await this.callLLM(prompt);
    // Por ahora: usar plantilla según categoría
    const template = TASK_TEMPLATES[category];

    // 4. Generar pasos basados en la plantilla
    const steps: ExecutionStep[] = template.steps.map((stepTemplate: StepTemplate, i: number) => ({
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
      // Cada paso sabe qué agente lo ejecuta y con qué modelo
      // Esto es INVISIBLE al usuario - solo se usa internamente
      modelUsed: this.getModelForAgent(stepTemplate.agent),
      dependencies: i > 0 ? [i] : [],
    }));

    const plan: ExecutionPlan = {
      steps,
      totalEstimatedTime: template.steps.reduce((acc, s) => acc + s.duration, 0),
      riskFactors: this.identifyRiskFactors(analysis, category),
    };

    // 5. Guardar plan en working memory
    this.storeInMemory("working", `plan:${conversationId}`, JSON.stringify(plan), {
      conversationId,
      tags: ["plan", conversationId],
    });

    // 6. Emitir evento
    this.emit("plan:created", { conversationId, plan, category });

    return plan;
  }

  // Cada agente tiene su modelo OpenCode Go ideal asignado
  private getModelForAgent(agent: StepTemplate["agent"]): string {
    const modelMap: Record<string, string> = {
      analyzer: "deepseek-v4-flash",
      planner: "qwen3.7-plus",
      executor: "deepseek-v4-flash",
      verifier: "glm-5.2",
      optimizer: "minimax-m3",
      reporter: "kimi-k2.7-code",
      monitor: "mimo-v2.5",
    };
    return modelMap[agent] || "deepseek-v4-flash";
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
