/**
 * Monitoring Service
 * Servicio de monitoreo en tiempo real para compilaciones y despliegues
 */

import { v4 as uuidv4 } from "uuid";

export interface MonitoringEvent {
  timestamp: string;
  type: "build" | "test" | "deploy" | "profiling" | "error" | "warning" | "info";
  jobId: string;
  status: "pending" | "running" | "completed" | "failed";
  message: string;
  metadata?: Record<string, any>;
}

export interface MonitoringDashboard {
  dashboardId: string;
  events: MonitoringEvent[];
  activeJobs: Map<string, any>;
  statistics: {
    totalBuilds: number;
    successfulBuilds: number;
    failedBuilds: number;
    averageBuildTime: number;
    totalTests: number;
    testPassRate: number;
    totalDeploys: number;
    successfulDeploys: number;
  };
}

/**
 * Servicio de Monitoreo
 */
export class MonitoringService {
  private dashboards: Map<string, MonitoringDashboard> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();

  /**
   * Crear dashboard de monitoreo
   */
  createDashboard(): MonitoringDashboard {
    const dashboardId = uuidv4();
    const dashboard: MonitoringDashboard = {
      dashboardId,
      events: [],
      activeJobs: new Map(),
      statistics: {
        totalBuilds: 0,
        successfulBuilds: 0,
        failedBuilds: 0,
        averageBuildTime: 0,
        totalTests: 0,
        testPassRate: 0,
        totalDeploys: 0,
        successfulDeploys: 0,
      },
    };

    this.dashboards.set(dashboardId, dashboard);
    console.log(`[MonitoringService] Dashboard creado: ${dashboardId}`);

    return dashboard;
  }

  /**
   * Registrar evento
   */
  registerEvent(dashboardId: string, event: Omit<MonitoringEvent, "timestamp">): void {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      console.warn(`[MonitoringService] Dashboard no encontrado: ${dashboardId}`);
      return;
    }

    const fullEvent: MonitoringEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    dashboard.events.push(fullEvent);

    // Actualizar estadísticas
    this.updateStatistics(dashboard, fullEvent);

    // Notificar listeners
    this.notifyListeners(dashboardId, fullEvent);

    console.log(
      `[MonitoringService] Evento registrado: ${event.type} - ${event.status} (${event.jobId})`
    );
  }

  /**
   * Actualizar estadísticas
   */
  private updateStatistics(dashboard: MonitoringDashboard, event: MonitoringEvent): void {
    const stats = dashboard.statistics;

    switch (event.type) {
      case "build":
        stats.totalBuilds++;
        if (event.status === "completed") {
          stats.successfulBuilds++;
        } else if (event.status === "failed") {
          stats.failedBuilds++;
        }
        break;

      case "test":
        stats.totalTests++;
        // Extraer información de pass rate del metadata
        if (event.metadata?.passRate) {
          stats.testPassRate = (
            (stats.testPassRate * (stats.totalTests - 1) + event.metadata.passRate) /
            stats.totalTests
          ).toFixed(2) as any;
        }
        break;

      case "deploy":
        stats.totalDeploys++;
        if (event.status === "completed") {
          stats.successfulDeploys++;
        }
        break;
    }
  }

  /**
   * Obtener dashboard
   */
  getDashboard(dashboardId: string): MonitoringDashboard | undefined {
    return this.dashboards.get(dashboardId);
  }

  /**
   * Obtener eventos recientes
   */
  getRecentEvents(dashboardId: string, limit: number = 50): MonitoringEvent[] {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return [];

    return dashboard.events.slice(-limit);
  }

  /**
   * Filtrar eventos
   */
  filterEvents(
    dashboardId: string,
    filter: { type?: string; status?: string; jobId?: string }
  ): MonitoringEvent[] {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return [];

    return dashboard.events.filter((event) => {
      if (filter.type && event.type !== filter.type) return false;
      if (filter.status && event.status !== filter.status) return false;
      if (filter.jobId && event.jobId !== filter.jobId) return false;
      return true;
    });
  }

  /**
   * Registrar listener para eventos
   */
  onEvent(dashboardId: string, callback: (event: MonitoringEvent) => void): void {
    if (!this.eventListeners.has(dashboardId)) {
      this.eventListeners.set(dashboardId, []);
    }
    this.eventListeners.get(dashboardId)!.push(callback);
  }

  /**
   * Notificar listeners
   */
  private notifyListeners(dashboardId: string, event: MonitoringEvent): void {
    const listeners = this.eventListeners.get(dashboardId);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          console.error("[MonitoringService] Error en listener:", error);
        }
      }
    }
  }

  /**
   * Generar reporte de monitoreo
   */
  generateMonitoringReport(dashboard: MonitoringDashboard): string {
    const stats = dashboard.statistics;

    let report = `# Reporte de Monitoreo\n\n`;
    report += `**Dashboard ID**: ${dashboard.dashboardId}\n`;
    report += `**Total de Eventos**: ${dashboard.events.length}\n\n`;

    report += `## Estadísticas\n\n`;
    report += `### Compilaciones\n`;
    report += `- **Total**: ${stats.totalBuilds}\n`;
    report += `- **Exitosas**: ${stats.successfulBuilds}\n`;
    report += `- **Fallidas**: ${stats.failedBuilds}\n`;
    report += `- **Tasa de Éxito**: ${stats.totalBuilds > 0 ? ((stats.successfulBuilds / stats.totalBuilds) * 100).toFixed(1) : 0}%\n\n`;

    report += `### Pruebas\n`;
    report += `- **Total**: ${stats.totalTests}\n`;
    report += `- **Tasa de Éxito**: ${stats.testPassRate.toFixed(1)}%\n\n`;

    report += `### Despliegues\n`;
    report += `- **Total**: ${stats.totalDeploys}\n`;
    report += `- **Exitosos**: ${stats.successfulDeploys}\n`;
    report += `- **Tasa de Éxito**: ${stats.totalDeploys > 0 ? ((stats.successfulDeploys / stats.totalDeploys) * 100).toFixed(1) : 0}%\n\n`;

    report += `## Eventos Recientes\n\n`;
    const recentEvents = this.getRecentEvents(dashboard.dashboardId, 10);
    for (const event of recentEvents.reverse()) {
      const statusIcon =
        event.status === "completed"
          ? "✅"
          : event.status === "failed"
            ? "❌"
            : event.status === "running"
              ? "🔄"
              : "⏳";
      report += `${statusIcon} [${event.timestamp}] ${event.type.toUpperCase()}: ${event.message}\n`;
    }

    return report;
  }

  /**
   * Obtener salud del sistema
   */
  getSystemHealth(dashboard: MonitoringDashboard): "healthy" | "warning" | "critical" {
    const stats = dashboard.statistics;

    // Calcular tasa de éxito general
    const buildSuccessRate =
      stats.totalBuilds > 0 ? stats.successfulBuilds / stats.totalBuilds : 1;
    const deploySuccessRate =
      stats.totalDeploys > 0 ? stats.successfulDeploys / stats.totalDeploys : 1;
    const testPassRate = stats.testPassRate / 100;

    const averageSuccessRate = (buildSuccessRate + deploySuccessRate + testPassRate) / 3;

    if (averageSuccessRate >= 0.95) {
      return "healthy";
    } else if (averageSuccessRate >= 0.8) {
      return "warning";
    } else {
      return "critical";
    }
  }
}

/**
 * Instancia global
 */
let monitoringServiceInstance: MonitoringService | null = null;

export function getMonitoringService(): MonitoringService {
  if (!monitoringServiceInstance) {
    monitoringServiceInstance = new MonitoringService();
  }
  return monitoringServiceInstance;
}

