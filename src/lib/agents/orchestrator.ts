"use client";

import { AnalyzerAgent } from "./analyzer-agent";
import { PlannerAgent } from "./planner-agent";
import { ExecutorAgent } from "./executor-agent";
import { VerifierAgent, type VerificationResult } from "./verifier-agent";
import { OptimizerAgent, type OptimizationResult } from "./optimizer-agent";
import { ReporterAgent } from "./reporter-agent";
import { MonitorAgent, type MonitorMetrics, type Anomaly } from "./monitor-agent";
import type { Analysis, ExecutionPlan, ExecutionStep, Execution, MessageOutput, AgentStatus, TaskCategory } from "../types";
import { useMemoryStore } from "../memory/memory-store";
import { TASK_TEMPLATES, detectCategory } from "../mock-data";
import type { ToolExecutionResult } from "./tool-registry";
import { getAdapter } from "./opencode-adapter";
import { type AgentMode, ESTIMATED_COST_PER_TASK } from "../config/model-routing";
import { createTodoManager, type TodoManager } from "./todo-manager";
import { executeAgentLoop, type LoopIteration } from "./real-agent-loop";

// ==================== ORQUESTADOR DE AGENTES ====================
// Coordina el flujo completo de los 7 agentes:
//
// 1. Analizador → analiza objetivo
// 2. Planificador → crea plan basado en análisis
// 3. Ejecutor → ejecuta cada paso del plan
// 4. Verificador → valida cada resultado (puede pedir retry)
// 5. Optimizador → analiza ejecución completada y sugiere mejoras
// 6. Reportero → genera reporte final formateado
// 7. Monitor → monitorea todo el tiempo, detecta anomalías
//
// El usuario SOLO VE "Trabajando..." - los 7 agentes son invisibles.
// Internamente, cada agente usa su modelo OpenCode Go resuelto desde model-routing.ts.
// Modo "economy" (default): modelos rápidos y económicos.
// Modo "quality": modelos de alta calidad para tareas complejas.

export interface OrchestratorCallbacks {
  onAnalysisComplete?: (analysis: Analysis) => void;
  onPlanCreated?: (plan: ExecutionPlan, category: TaskCategory) => void;
  onStepStarted?: (step: ExecutionStep, agentStatus: AgentStatus) => void;
  onStepProgress?: (stepId: string, log: string) => void;
  onStepCompleted?: (step: ExecutionStep, result: string, output?: ToolExecutionResult["output"]) => void;
  onStepFailed?: (step: ExecutionStep, error: string) => void;
  onVerificationResult?: (verification: VerificationResult) => void;
  onOptimizationSuggestions?: (optimization: OptimizationResult) => void;
  onReportGenerated?: (output: MessageOutput) => void;
  onMetricsUpdate?: (metrics: MonitorMetrics, anomalies: Anomaly[]) => void;
  onComplete?: (result: OrchestratorResult) => void;
  onError?: (error: string) => void;
}

export interface OrchestratorResult {
  success: boolean;
  analysis: Analysis;
  plan: ExecutionPlan;
  execution: Execution;
  verification: VerificationResult;
  optimizations: OptimizationResult;
  report: MessageOutput;
  monitorReport: {
    totalAnomalies: number;
    criticalAnomalies: number;
    warnings: number;
    recommendations: string[];
  };
  learnedPatterns: string[];
}

export class AgentOrchestrator {
  private analyzer: AnalyzerAgent;
  private planner: PlannerAgent;
  private executor: ExecutorAgent;
  private verifier: VerifierAgent;
  private optimizer: OptimizerAgent;
  private reporter: ReporterAgent;
  private monitor: MonitorAgent;
  private adapter = getAdapter();
  private todoManager: TodoManager = createTodoManager();

  constructor() {
    this.analyzer = new AnalyzerAgent();
    this.planner = new PlannerAgent();
    this.executor = new ExecutorAgent();
    this.verifier = new VerifierAgent();
    this.optimizer = new OptimizerAgent();
    this.reporter = new ReporterAgent();
    this.monitor = new MonitorAgent();
  }

  /**
   * Propaga el modo de ejecución a todos los agentes del sistema.
   * "economy" (default): modelos rápidos y económicos.
   * "quality": modelos de alta calidad para tareas complejas.
   */
  setMode(mode: AgentMode): void {
    this.analyzer.setMode(mode);
    this.planner.setMode(mode);
    this.executor.setMode(mode);
    this.verifier.setMode(mode);
    this.optimizer.setMode(mode);
    this.reporter.setMode(mode);
    this.monitor.setMode(mode);
  }

  async executeTask(
    objective: string,
    conversationId: string,
    callbacks: OrchestratorCallbacks,
    originalObjective?: string,
    mode: AgentMode = "economy"
  ): Promise<OrchestratorResult> {
    // Propagar el modo a todos los agentes antes de iniciar la ejecución
    this.setMode(mode);
    // El objetivo real del usuario se usa para detectar categoría y generar queries.
    // `objective` puede estar enriquecido con contexto previo de la conversación.
    const userObjective = originalObjective || objective;

    try {
      // Guardar objetivo original en working memory para que los agentes generen queries específicos
      useMemoryStore.getState().store(
        "working",
        `objective:${conversationId}`,
        userObjective,
        { conversationId, tags: ["objective", conversationId] }
      );

      // ========== FASE 1: ANÁLISIS (Analizador) ==========
      // Modelo (economy): deepseek-v4-flash | (quality): qwen3.7-plus
      const analysis = await this.analyzer.analyze(objective, conversationId);
      callbacks.onAnalysisComplete?.(analysis);

      // ========== FASE 2: PLANIFICACIÓN (Planificador) ==========
      // Modelo (economy): deepseek-v4-flash | (quality): qwen3.7-plus
      // Usar userObjective para detectar la categoría real de la petición actual,
      // no el contextPrompt enriquecido con mensajes previos.
      const category = detectCategory(userObjective) as TaskCategory;
      // Pasar el objetivo limpio al planificador para que detecte la categoría real
      // y no se deje confundir por el contextPrompt con texto pegado.
      const plan = await this.planner.createPlan(analysis, userObjective, conversationId);
      callbacks.onPlanCreated?.(plan, category);

      // Inicializar el bucle de atención (todo.md dinámico)
      this.todoManager = createTodoManager();
      this.todoManager.initialize(conversationId, userObjective, plan);

      // Crear objeto Execution
      const execution: Execution = {
        id: `exec-${Date.now()}`,
        taskId: conversationId,
        userId: "user",
        plan,
        currentStepIndex: 0,
        status: "running",
        startedAt: new Date().toISOString(),
        tokensUsed: 0,
        estimatedCost: plan.totalEstimatedTime * 0.005,
        actualCost: 0,
        variables: {},
        errors: [],
      };

      // Resetear uso acumulado del adaptador para esta ejecución
      this.adapter.resetUsage();

      // ========== INICIAR MONITOREO (Monitor) ==========
      // Modelo (economy/quality): mimo-v2.5 - monitorea en background
      this.monitor.startMonitoring(execution, (metrics, anomalies) => {
        callbacks.onMetricsUpdate?.(metrics, anomalies);
      });

      // ========== FASE 3: EJECUCIÓN — AGENT LOOP REAL ==========
      // Reemplazamos el for lineal con logs simulados por el AgentLoop real:
      // pensar → actuar → observar → evaluar → repetir
      let lastVerification: VerificationResult = {
        isValid: true,
        errors: [],
        analysis: { rootCause: "", canRetry: false, suggestedFix: "", likelihood: 1.0 },
        action: "continue",
        recommendation: "",
      };

      // Ejecutar el loop autónomo
      const loopResult = await executeAgentLoop({
        conversationId,
        userId: "user",
        objective: userObjective,
        maxIterations: mode === "quality" ? 50 : 30,
        mode,
        onIteration: (iteration: LoopIteration) => {
          // Convertir cada iteración del loop en un "step" visible para la UI
          if (iteration.toolName) {
            const step: ExecutionStep = {
              id: `loop-${iteration.iterationNumber}`,
              stepNumber: iteration.iterationNumber,
              description: iteration.thought.slice(0, 200),
              toolName: iteration.toolName,
              toolCategory: "Adicionales" as const,
              toolParams: iteration.toolParams,
              status: iteration.evaluation.isSuccessful ? "completed" : "failed",
              startedAt: new Date(Date.now() - iteration.duration).toISOString(),
              completedAt: new Date().toISOString(),
              duration: iteration.duration,
              result: iteration.observation.slice(0, 500),
              error: iteration.error,
              logs: [],
              produces: "output" as const,
              agent: "executor",
            };
            if (iteration.evaluation.isSuccessful) {
              callbacks.onStepStarted?.(step, "executing");
              callbacks.onStepProgress?.(step.id, iteration.thought);
              callbacks.onStepCompleted?.(step, iteration.observation.slice(0, 500), {
                type: "text",
                content: iteration.observation,
                title: `${iteration.toolName} - Output`,
              });
            } else {
              callbacks.onStepStarted?.(step, "executing");
              callbacks.onStepProgress?.(step.id, iteration.thought);
              callbacks.onStepFailed?.(step, iteration.error || "Error desconocido");
            }
          }
        },
        onThought: (thought: string) => {
          const planStep = plan.steps[0];
          if (planStep) {
            callbacks.onStepProgress?.(planStep.id, thought.slice(0, 300));
          }
        },
        onToolStart: (toolName: string, params: Record<string, unknown>) => {
          console.log(`[Orchestrator] Tool start: ${toolName}`, params);
        },
        onToolEnd: (toolName: string, result: ToolExecutionResult) => {
          console.log(`[Orchestrator] Tool end: ${toolName} → ${result.success ? "success" : "fail"}`);
        },
        onError: (error: string) => {
          console.error(`[Orchestrator] Loop error: ${error}`);
        },
        // Human-in-the-loop: cuando el agente pide input, mostrarlo en el chat
        onUserInputRequest: async (prompt: string): Promise<string> => {
          // En producción esto debería abrir un modal en la UI y esperar respuesta.
          // Por ahora, emitimos un evento y devolvemos un string vacío para que el agente continúe.
          console.log(`[Orchestrator] User input requested: ${prompt}`);
          // Emitir como progreso para que la UI lo muestre
          const planStep = plan.steps[0];
          if (planStep) {
            callbacks.onStepProgress?.(planStep.id, `⏸️ Esperando input del usuario: ${prompt}`);
          }
          // TODO: implementar modal real en la UI. Por ahora devolvemos vacío.
          return "";
        },
        // Todo.md: actualizar la UI cuando el agente actualice su lista de tareas
        onTodoUpdate: (todoMarkdown: string) => {
          console.log(`[Orchestrator] Todo updated (${todoMarkdown.length} chars)`);
          // Guardar en working memory para que la UI pueda leerlo
          useMemoryStore.getState().store("working", `todo:${conversationId}`, todoMarkdown, {
            conversationId,
            tags: ["todo", "progress", conversationId],
          });
        },
      });

      // Sincronizar tokens/costo reales acumulados por el adaptador
      const usage = this.adapter.getUsageStats();
      execution.tokensUsed = usage.totalTokens;
      execution.actualCost = usage.totalCost;

      // Detener monitoreo
      this.monitor.stopMonitoring();

      if (loopResult.success) {
        execution.status = "completed";
        execution.completedAt = new Date().toISOString();
      } else {
        execution.status = loopResult.errorMessage ? "failed" : "completed";
        execution.completedAt = new Date().toISOString();
        if (loopResult.errorMessage) {
          execution.errors.push(loopResult.errorMessage);
        }
      }

      // Guardar el output final del loop
      if (loopResult.finalOutput) {
        execution.finalOutput = {
          type: "text",
          content: loopResult.finalOutput,
          title: "Resultado del agente autónomo",
        };
      }

      // Finalizar el bucle de atención
      const todoFinal = this.todoManager.finalize(execution.status !== "failed");
      const todoProgress = this.todoManager.getProgress();
      if (todoFinal) {
        useMemoryStore.getState().store(
          "working",
          `todo:${conversationId}`,
          this.todoManager.toMarkdown(),
          { conversationId, tags: ["todo", "progress"] }
        );
      }

      // ========== FASE 5: OPTIMIZACIÓN (Optimizador) ==========
      const optimizations: OptimizationResult = {
        suggestions: [],
        savings: { timeReduction: "0s", costReduction: "$0.00" },
      };
      callbacks.onOptimizationSuggestions?.(optimizations);

      // ========== FASE 6: REPORTE (Reportero) ==========
      const report = await this.reporter.generateReport(execution, conversationId, category);
      callbacks.onReportGenerated?.(report);

      // ========== FASE 7: MONITOREO FINAL (Monitor) ==========
      const monitorReport = this.monitor.generateFinalReport(execution);

      // ========== APRENDER DE LA CONVERSACIÓN ==========
      const learnedPatterns = [
        `${category}: ${loopResult.toolsUsed.join(" → ")}`,
        `${loopResult.iterations.length} iteraciones en ${Math.round(loopResult.totalDuration / 1000)}s`,
      ];
      const summary = `${category}: ${objective.slice(0, 100)} (${loopResult.iterations.length} iteraciones)`;
      useMemoryStore.getState().learnFromConversation(conversationId, summary, learnedPatterns, loopResult.success);

      const result: OrchestratorResult = {
        success: loopResult.success,
        analysis,
        plan,
        execution,
        verification: lastVerification,
        optimizations,
        report,
        monitorReport,
        learnedPatterns,
      };

      callbacks.onComplete?.(result);
      return result;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Error desconocido";
      callbacks.onError?.(errorMsg);
      this.monitor.stopMonitoring();
      throw error;
    }
  }

  // Mapear el agente interno al estado que ve el usuario
  // El usuario SOLO VE "Trabajando..." pero internamente cambia el estado
  private getAgentStatusForStep(step: ExecutionStep): AgentStatus {
    const agentStatusMap: Record<string, AgentStatus> = {
      analyzer: "analyzing",
      planner: "planning",
      executor: "executing",
      verifier: "verifying",
      optimizer: "optimizing",
      reporter: "reporting",
      monitor: "monitoring",
    };

    // Si el paso produce browser, el usuario ve "browsing"
    if (step.produces === "browser") return "browsing";
    if (step.produces === "terminal") return "executing";
    if (step.produces === "files") return step.toolName.includes("Code") ? "coding" : "writing";
    if (step.produces === "data") return "analyzing";
    if (step.produces === "output") return "writing";

    return agentStatusMap[step.agent || "executor"] || "executing";
  }

  // Getters para info de agentes (para Settings/Docs)
  getAgentsInfo() {
    return {
      analyzer: this.analyzer,
      planner: this.planner,
      executor: this.executor,
      verifier: this.verifier,
      optimizer: this.optimizer,
      reporter: this.reporter,
      monitor: this.monitor,
    };
  }
}

// Singleton
let orchestratorInstance: AgentOrchestrator | null = null;
export function getOrchestrator(): AgentOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new AgentOrchestrator();
  }
  return orchestratorInstance;
}
