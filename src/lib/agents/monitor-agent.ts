"use client";

import { BaseAgent } from "./base-agent";
import type { Execution } from "../types";

// ==================== AGENTE 7: MONITOR ====================
// Modelo: MiMo-V2.5 (ultra rápido, tiempo real)
//
// Responsabilidad:
// - Monitorear ejecución en tiempo real
// - Verificar métricas cada segundo
// - Detectar anomalías (tiempo excesivo, costo alto, errores múltiples)
// - Generar alertas
// - Registrar logs
//
// Lee: Working Memory (estado actual)
// Escribe: Episodic Memory (anomalías detectadas)

export interface Anomaly {
  type: "slow_execution" | "high_cost" | "multiple_errors" | "high_memory";
  severity: "warning" | "critical";
  message: string;
  timestamp: string;
}

export interface MonitorMetrics {
  elapsedTime: number;
  estimatedTime: number;
  currentCost: number;
  estimatedCost: number;
  tokensUsed: number;
  errorCount: number;
  currentStep: number;
}

export class MonitorAgent extends BaseAgent {
  private intervalId: NodeJS.Timeout | null = null;
  private anomalies: Anomaly[] = [];

  constructor() {
    super("monitor");
  }

  // Iniciar monitoreo continuo (cada segundo)
  startMonitoring(execution: Execution, onUpdate: (metrics: MonitorMetrics, anomalies: Anomaly[]) => void): void {
    const startTime = Date.now();
    const estimatedTime = execution.plan.totalEstimatedTime * 1000;
    const estimatedCost = execution.estimatedCost;

    this.intervalId = setInterval(() => {
      const metrics: MonitorMetrics = {
        elapsedTime: Date.now() - startTime,
        estimatedTime,
        currentCost: execution.actualCost,
        estimatedCost,
        tokensUsed: execution.tokensUsed,
        errorCount: execution.errors.length,
        currentStep: execution.currentStepIndex + 1,
      };

      // Detectar anomalías
      const newAnomalies = this.detectAnomalies(metrics);
      if (newAnomalies.length > 0) {
        this.anomalies.push(...newAnomalies);
        // Guardar anomalías en memoria
        newAnomalies.forEach((a) => {
          this.storeInMemory("episodic", `anomaly:${execution.id}:${Date.now()}`, a.message, {
            conversationId: execution.id,
            tags: ["anomaly", a.severity, a.type],
          });
        });
        // Emitir alertas
        this.emit("alert", { executionId: execution.id, anomalies: newAnomalies });
      }

      // Emitir métricas actualizadas
      this.emit("metrics:updated", { executionId: execution.id, metrics, anomalies: this.anomalies });

      // Callback para UI
      onUpdate(metrics, this.anomalies);

      // Detener si la ejecución terminó
      if (execution.status !== "running") {
        this.stopMonitoring();
      }
    }, 1000);
  }

  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private detectAnomalies(metrics: MonitorMetrics): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const now = new Date().toISOString();

    // Detectar si tarda demasiado (> 1.5x estimado)
    if (metrics.elapsedTime > metrics.estimatedTime * 1.5) {
      anomalies.push({
        type: "slow_execution",
        severity: "warning",
        message: "La ejecución está tardando más de lo esperado",
        timestamp: now,
      });
    }

    // Detectar si el costo es demasiado alto (> 1.5x estimado)
    if (metrics.currentCost > metrics.estimatedCost * 1.5 && metrics.estimatedCost > 0) {
      anomalies.push({
        type: "high_cost",
        severity: "warning",
        message: "El costo está siendo mayor al estimado",
        timestamp: now,
      });
    }

    // Detectar múltiples errores
    if (metrics.errorCount > 3) {
      anomalies.push({
        type: "multiple_errors",
        severity: "critical",
        message: "Múltiples errores detectados en la ejecución",
        timestamp: now,
      });
    }

    return anomalies;
  }

  // Generar reporte final de monitoreo
  generateFinalReport(execution: Execution): {
    totalAnomalies: number;
    criticalAnomalies: number;
    warnings: number;
    recommendations: string[];
  } {
    const critical = this.anomalies.filter((a) => a.severity === "critical").length;
    const warnings = this.anomalies.filter((a) => a.severity === "warning").length;

    const recommendations: string[] = [];
    if (critical > 0) {
      recommendations.push("Revisar configuración de rate limits y timeouts");
    }
    if (warnings > 0) {
      recommendations.push("Considerar usar modelos más rápidos para tareas similares");
    }
    if (execution.errors.length > 0) {
      recommendations.push("Implementar retry automático con backoff exponencial");
    }

    return {
      totalAnomalies: this.anomalies.length,
      criticalAnomalies: critical,
      warnings,
      recommendations,
    };
  }

  getAnomalies(): Anomaly[] {
    return this.anomalies;
  }
}
