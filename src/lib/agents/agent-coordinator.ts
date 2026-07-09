/**
 * Agent Coordinator - Orquestador automático de agentes
 * Coordina la ejecución entre múltiples agentes basándose en el tipo de tarea
 * y las herramientas requeridas
 */

import type { ExecutionPlan, ExecutionStep, Analysis } from "../types";
import { getAgentForTool, selectToolsByKeywords, selectToolsByCategory, selectToolsByComplexity, mergeAndRankRecommendations } from "./tool-selector";

export interface AgentCoordinationPlan {
  agentSequence: Array<{
    agent: string;
    role: string;
    toolsToUse: string[];
    stepsToExecute: number[];
    estimatedTime: number;
    dependencies: number[];
  }>;
  totalEstimatedTime: number;
  parallelizableSteps: number[][];
  criticalPath: number[];
}

/**
 * Coordinador de agentes que orquesta la ejecución automática
 */
export class AgentCoordinator {
  /**
   * Crear un plan de coordinación basado en el análisis y objetivo
   */
  static createCoordinationPlan(
    objective: string,
    analysis: Analysis,
    executionPlan: ExecutionPlan
  ): AgentCoordinationPlan {
    // 1. Seleccionar herramientas recomendadas
    const keywordTools = selectToolsByKeywords(objective);
    const categoryTools = selectToolsByCategory(analysis.category);
    const complexityTools = selectToolsByComplexity(analysis.complexity);

    const rankedTools = mergeAndRankRecommendations([keywordTools, categoryTools, complexityTools]);

    // 2. Mapear herramientas a agentes
    const agentToolMap = new Map<string, Set<string>>();
    const agentRoles: Record<string, string> = {
      analyzer: "Análisis y comprensión del contexto",
      planner: "Planificación y coordinación",
      executor: "Ejecución de herramientas",
      verifier: "Validación y pruebas",
      optimizer: "Optimización de resultados",
      reporter: "Generación de reportes",
      monitor: "Monitoreo y despliegue",
    };

    for (const tool of rankedTools) {
      const agent = tool.agent;
      if (!agentToolMap.has(agent)) {
        agentToolMap.set(agent, new Set());
      }
      agentToolMap.get(agent)!.add(tool.toolName);
    }

    // 3. Asignar pasos a agentes
    const agentSteps = new Map<string, number[]>();
    for (let i = 0; i < executionPlan.steps.length; i++) {
      const step = executionPlan.steps[i];
      const agent = getAgentForTool(step.toolName);

      if (!agentSteps.has(agent)) {
        agentSteps.set(agent, []);
      }
      agentSteps.get(agent)!.push(i);
    }

    // 4. Construir secuencia de agentes
    const agentSequence = Array.from(agentToolMap.entries()).map(([agent, tools]) => {
      const steps = agentSteps.get(agent) || [];
      const estimatedTime = steps.reduce((sum, idx) => sum + (executionPlan.steps[idx].duration || 30), 0);
      const dependencies = this.calculateDependencies(steps, executionPlan.steps);

      return {
        agent,
        role: agentRoles[agent] || "Ejecución",
        toolsToUse: Array.from(tools),
        stepsToExecute: steps,
        estimatedTime,
        dependencies,
      };
    });

    // 5. Identificar pasos paralelizables
    const parallelizableSteps = this.identifyParallelizableSteps(executionPlan.steps);

    // 6. Calcular ruta crítica
    const criticalPath = this.calculateCriticalPath(executionPlan.steps);

    // 7. Calcular tiempo total
    const totalEstimatedTime = executionPlan.totalEstimatedTime;

    return {
      agentSequence,
      totalEstimatedTime,
      parallelizableSteps,
      criticalPath,
    };
  }

  /**
   * Calcular dependencias de un conjunto de pasos
   */
  private static calculateDependencies(stepIndices: number[], allSteps: ExecutionStep[]): number[] {
    const dependencies = new Set<number>();

    for (const idx of stepIndices) {
      const step = allSteps[idx];
      if (step.dependencies && Array.isArray(step.dependencies)) {
        for (const dep of step.dependencies) {
          if (!stepIndices.includes(dep)) {
            dependencies.add(dep);
          }
        }
      }
    }

    return Array.from(dependencies);
  }

  /**
   * Identificar pasos que pueden ejecutarse en paralelo
   */
  private static identifyParallelizableSteps(steps: ExecutionStep[]): number[][] {
    const parallelGroups: number[][] = [];
    const processed = new Set<number>();

    for (let i = 0; i < steps.length; i++) {
      if (processed.has(i)) continue;

      const group: number[] = [i];
      processed.add(i);

      // Buscar otros pasos que no dependan de este y que este no dependa de ellos
      for (let j = i + 1; j < steps.length; j++) {
        if (processed.has(j)) continue;

        const stepI = steps[i];
        const stepJ = steps[j];

        // Verificar si pueden ejecutarse en paralelo
        const iDependsOnJ = stepI.dependencies?.includes(j) || false;
        const jDependsOnI = stepJ.dependencies?.includes(i) || false;

        if (!iDependsOnJ && !jDependsOnI) {
          group.push(j);
          processed.add(j);
        }
      }

      if (group.length > 1) {
        parallelGroups.push(group);
      }
    }

    return parallelGroups;
  }

  /**
   * Calcular la ruta crítica (pasos que no pueden ser paralelizados)
   */
  private static calculateCriticalPath(steps: ExecutionStep[]): number[] {
    const path: number[] = [];
    let currentStep = 0;

    while (currentStep < steps.length) {
      path.push(currentStep);

      // Encontrar el siguiente paso que depende del actual
      let nextStep = -1;
      for (let i = currentStep + 1; i < steps.length; i++) {
        if (steps[i].dependencies?.includes(currentStep)) {
          nextStep = i;
          break;
        }
      }

      if (nextStep === -1) break;
      currentStep = nextStep;
    }

    return path;
  }

  /**
   * Generar un resumen de la coordinación
   */
  static generateCoordinationSummary(plan: AgentCoordinationPlan): string {
    const agentSummary = plan.agentSequence
      .map((a) => `- **${a.agent}**: ${a.role} (${a.toolsToUse.length} herramientas, ${a.stepsToExecute.length} pasos)`)
      .join("\n");

    const parallelInfo = plan.parallelizableSteps.length > 0
      ? `\n\n**Pasos paralelizables**: ${plan.parallelizableSteps.map((g) => `[${g.join(", ")}]`).join(", ")}`
      : "";

    const criticalInfo = plan.criticalPath.length > 0
      ? `\n\n**Ruta crítica**: Pasos ${plan.criticalPath.join(" → ")} (${plan.totalEstimatedTime}s)`
      : "";

    return `## Plan de Coordinación de Agentes\n\n${agentSummary}${parallelInfo}${criticalInfo}\n\n**Tiempo total estimado**: ${plan.totalEstimatedTime}s`;
  }

  /**
   * Validar que el plan de coordinación es viable
   */
  static validateCoordinationPlan(plan: AgentCoordinationPlan): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validar que todos los agentes tengan herramientas
    for (const agent of plan.agentSequence) {
      if (agent.toolsToUse.length === 0) {
        errors.push(`Agente ${agent.agent} no tiene herramientas asignadas`);
      }
      if (agent.stepsToExecute.length === 0) {
        errors.push(`Agente ${agent.agent} no tiene pasos asignados`);
      }
    }

    // Validar que no hay ciclos en las dependencias
    for (const agent of plan.agentSequence) {
      for (const dep of agent.dependencies) {
        // Verificar que la dependencia existe
        const depAgent = plan.agentSequence.find((a) => a.stepsToExecute.includes(dep));
        if (!depAgent) {
          errors.push(`Dependencia no resuelta: paso ${dep}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
