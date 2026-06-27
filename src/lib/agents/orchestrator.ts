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
// Internamente, cada agente usa su modelo OpenCode Go asignado.

export interface OrchestratorCallbacks {
  onAnalysisComplete?: (analysis: Analysis) => void;
  onPlanCreated?: (plan: ExecutionPlan, category: TaskCategory) => void;
  onStepStarted?: (step: ExecutionStep, agentStatus: AgentStatus) => void;
  onStepProgress?: (stepId: string, log: string) => void;
  onStepCompleted?: (step: ExecutionStep, result: string) => void;
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

  constructor() {
    this.analyzer = new AnalyzerAgent();
    this.planner = new PlannerAgent();
    this.executor = new ExecutorAgent();
    this.verifier = new VerifierAgent();
    this.optimizer = new OptimizerAgent();
    this.reporter = new ReporterAgent();
    this.monitor = new MonitorAgent();
  }

  async executeTask(
    objective: string,
    conversationId: string,
    callbacks: OrchestratorCallbacks
  ): Promise<OrchestratorResult> {
    try {
      // ========== FASE 1: ANÁLISIS (Analizador) ==========
      // Modelo: DeepSeek V4 Flash
      const analysis = await this.analyzer.analyze(objective, conversationId);
      callbacks.onAnalysisComplete?.(analysis);

      // ========== FASE 2: PLANIFICACIÓN (Planificador) ==========
      // Modelo: Qwen3.7 Plus
      const category = detectCategory(objective) as TaskCategory;
      const plan = await this.planner.createPlan(analysis, objective, conversationId);
      callbacks.onPlanCreated?.(plan, category);

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

      // ========== INICIAR MONITOREO (Monitor) ==========
      // Modelo: MiMo-V2.5 - monitorea en background
      this.monitor.startMonitoring(execution, (metrics, anomalies) => {
        callbacks.onMetricsUpdate?.(metrics, anomalies);
      });

      // ========== FASE 3: EJECUCIÓN (Ejecutor + Verificador) ==========
      // Modelo Ejecutor: DeepSeek V4 Flash
      // Modelo Verificador: GLM-5.2
      let lastVerification: VerificationResult = {
        isValid: true,
        errors: [],
        analysis: { rootCause: "", canRetry: false, suggestedFix: "", likelihood: 1.0 },
        action: "continue",
        recommendation: "",
      };

      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        execution.currentStepIndex = i;

        // Determinar el agentStatus basado en el agente que ejecuta este paso
        const agentStatus = this.getAgentStatusForStep(step);
        callbacks.onStepStarted?.(step, agentStatus);

        // Emitir logs progresivamente (simulado)
        const template = TASK_TEMPLATES[category];
        const stepTemplate = template.steps[i];
        for (const logMessage of stepTemplate.logs) {
          await new Promise((r) => setTimeout(r, 800 + Math.random() * 700));
          callbacks.onStepProgress?.(step.id, logMessage);
        }

        // Ejecutar paso
        const result = await this.executor.executeStep(step, conversationId);

        if (result.success) {
          // ========== FASE 4: VERIFICACIÓN (Verificador) ==========
          lastVerification = await this.verifier.verifyStep(step, result, conversationId);
          callbacks.onVerificationResult?.(lastVerification);

          if (lastVerification.action === "retry") {
            // Reintentar una vez
            const retryResult = await this.executor.executeStep(step, conversationId);
            if (retryResult.success) {
              callbacks.onStepCompleted?.(step, retryResult.result || "");
            } else {
              execution.errors.push(retryResult.error || "Error");
              callbacks.onStepFailed?.(step, retryResult.error || "Error");
            }
          } else {
            callbacks.onStepCompleted?.(step, result.result || "");
          }

          // Actualizar costo
          execution.actualCost += (step.duration || 30) * 0.005;
          execution.tokensUsed += Math.floor(Math.random() * 3000) + 1500;
        } else {
          execution.errors.push(result.error || "Error");
          callbacks.onStepFailed?.(step, result.error || "Error");

          // Verificar si se puede reintentar
          lastVerification = await this.verifier.verifyStep(step, result, conversationId);
          callbacks.onVerificationResult?.(lastVerification);

          if (lastVerification.action === "retry") {
            // Reintentar
            const retryResult = await this.executor.executeStep(step, conversationId);
            if (retryResult.success) {
              callbacks.onStepCompleted?.(step, retryResult.result || "");
            } else {
              // Falló definitivamente
              execution.status = "failed";
              break;
            }
          } else if (lastVerification.action === "fail") {
            execution.status = "failed";
            break;
          }
          // Si action === "skip", continuamos al siguiente paso
        }
      }

      // Detener monitoreo
      this.monitor.stopMonitoring();

      if (execution.status !== "failed") {
        execution.status = "completed";
        execution.completedAt = new Date().toISOString();
      }

      // ========== FASE 5: OPTIMIZACIÓN (Optimizador) ==========
      // Modelo: MiniMax M3
      const optimizations = await this.optimizer.optimizeExecution(execution, conversationId);
      callbacks.onOptimizationSuggestions?.(optimizations);

      // ========== FASE 6: REPORTE (Reportero) ==========
      // Modelo: Kimi K2.7 Code
      const report = await this.reporter.generateReport(execution, conversationId, category);
      callbacks.onReportGenerated?.(report);

      // ========== FASE 7: MONITOREO FINAL (Monitor) ==========
      const monitorReport = this.monitor.generateFinalReport(execution);

      // ========== APRENDER DE LA CONVERSACIÓN ==========
      // Guardar en memoria episódica y semántica
      const learnedPatterns = [TASK_TEMPLATES[category].learnedPattern];
      const summary = `${category}: ${objective.slice(0, 100)}`;
      useMemoryStore.getState().learnFromConversation(conversationId, summary, learnedPatterns, execution.status === "completed");

      const result: OrchestratorResult = {
        success: execution.status === "completed",
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
