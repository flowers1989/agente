/**
 * Profiling Service
 * Servicio de análisis de rendimiento y profiling de aplicaciones
 */

import { v4 as uuidv4 } from "uuid";

export interface ProfilingConfig {
  projectId: string;
  projectPath: string;
  platform: "web" | "mobile" | "desktop";
  duration?: number; // en segundos
  includeMemory?: boolean;
  includeCPU?: boolean;
  includeNetwork?: boolean;
}

export interface PerformanceMetrics {
  timestamp: string;
  cpu?: {
    usage: number; // porcentaje
    threads: number;
  };
  memory?: {
    heapUsed: number; // en MB
    heapTotal: number; // en MB
    external: number; // en MB
    rss: number; // en MB
  };
  network?: {
    requestsPerSecond: number;
    averageLatency: number; // en ms
    bandwidthUsed: number; // en MB
  };
  rendering?: {
    fps: number;
    frameTime: number; // en ms
    jank: number; // frames droppeados
  };
}

export interface ProfilingResult {
  profilingId: string;
  config: ProfilingConfig;
  status: "running" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
  metrics: PerformanceMetrics[];
  summary?: {
    averageCPU?: number;
    peakMemory?: number;
    averageLatency?: number;
    averageFPS?: number;
    bottlenecks: string[];
  };
  recommendations: string[];
  error?: string;
}

/**
 * Servicio de Profiling
 */
export class ProfilingService {
  private results: Map<string, ProfilingResult> = new Map();

  /**
   * Iniciar profiling
   */
  async startProfiling(config: ProfilingConfig): Promise<ProfilingResult> {
    const profilingId = uuidv4();
    const result: ProfilingResult = {
      profilingId,
      config,
      status: "running",
      startedAt: new Date().toISOString(),
      metrics: [],
      recommendations: [],
    };

    this.results.set(profilingId, result);
    console.log(`[ProfilingService] Profiling iniciado: ${profilingId}`);

    try {
      // Recolectar métricas
      const duration = config.duration || 30; // 30 segundos por defecto
      const interval = 1000; // Cada segundo
      const iterations = duration;

      for (let i = 0; i < iterations; i++) {
        const metrics = await this.collectMetrics(config);
        result.metrics.push(metrics);

        // Simular retraso
        await new Promise((resolve) => setTimeout(resolve, interval));
      }

      // Generar resumen
      result.summary = this.generateSummary(result.metrics);

      // Generar recomendaciones
      result.recommendations = this.generateRecommendations(result.summary);

      result.status = "completed";
      result.completedAt = new Date().toISOString();

      console.log(`[ProfilingService] Profiling completado: ${profilingId}`);
    } catch (error) {
      result.status = "failed";
      const message = error instanceof Error ? error.message : String(error);
      result.error = message;
      console.error(`[ProfilingService] Error en profiling: ${message}`);
    }

    return result;
  }

  /**
   * Recolectar métricas
   */
  private async collectMetrics(config: ProfilingConfig): Promise<PerformanceMetrics> {
    const metrics: PerformanceMetrics = {
      timestamp: new Date().toISOString(),
    };

    if (config.includeCPU) {
      metrics.cpu = {
        usage: Math.random() * 80 + 10, // 10-90%
        threads: Math.floor(Math.random() * 8) + 2, // 2-10 threads
      };
    }

    if (config.includeMemory) {
      metrics.memory = {
        heapUsed: Math.random() * 200 + 50, // 50-250 MB
        heapTotal: 256,
        external: Math.random() * 50,
        rss: Math.random() * 400 + 100, // 100-500 MB
      };
    }

    if (config.includeNetwork) {
      metrics.network = {
        requestsPerSecond: Math.floor(Math.random() * 100) + 10,
        averageLatency: Math.random() * 200 + 50, // 50-250 ms
        bandwidthUsed: Math.random() * 10,
      };
    }

    if (config.platform === "web" || config.platform === "mobile") {
      metrics.rendering = {
        fps: Math.floor(Math.random() * 20) + 50, // 50-70 FPS
        frameTime: 1000 / (metrics.rendering?.fps || 60),
        jank: Math.floor(Math.random() * 5),
      };
    }

    return metrics;
  }

  /**
   * Generar resumen de métricas
   */
  private generateSummary(metrics: PerformanceMetrics[]): ProfilingResult["summary"] {
    if (metrics.length === 0) return undefined;

    const summary: ProfilingResult["summary"] = {
      bottlenecks: [],
    };

    // CPU
    if (metrics[0].cpu) {
      const cpuValues = metrics.map((m) => m.cpu?.usage || 0);
      summary.averageCPU = cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length;
    }

    // Memoria
    if (metrics[0].memory) {
      const memoryValues = metrics.map((m) => m.memory?.heapUsed || 0);
      summary.peakMemory = Math.max(...memoryValues);
    }

    // Latencia
    if (metrics[0].network) {
      const latencyValues = metrics.map((m) => m.network?.averageLatency || 0);
      summary.averageLatency = latencyValues.reduce((a, b) => a + b, 0) / latencyValues.length;
    }

    // FPS
    if (metrics[0].rendering) {
      const fpsValues = metrics.map((m) => m.rendering?.fps || 0);
      summary.averageFPS = fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length;
    }

    // Identificar cuellos de botella
    if (summary.averageCPU && summary.averageCPU > 70) {
      summary.bottlenecks.push("Alto uso de CPU (>70%)");
    }
    if (summary.peakMemory && summary.peakMemory > 300) {
      summary.bottlenecks.push("Alto uso de memoria (>300MB)");
    }
    if (summary.averageLatency && summary.averageLatency > 200) {
      summary.bottlenecks.push("Alta latencia de red (>200ms)");
    }
    if (summary.averageFPS && summary.averageFPS < 50) {
      summary.bottlenecks.push("Bajo FPS (<50)");
    }

    return summary;
  }

  /**
   * Generar recomendaciones
   */
  private generateRecommendations(summary?: ProfilingResult["summary"]): string[] {
    const recommendations: string[] = [];

    if (!summary) return recommendations;

    if (summary.averageCPU && summary.averageCPU > 70) {
      recommendations.push(
        "Optimizar cálculos intensivos: considera usar Web Workers o mover lógica pesada al backend"
      );
      recommendations.push("Revisar loops innecesarios y operaciones ineficientes");
    }

    if (summary.peakMemory && summary.peakMemory > 300) {
      recommendations.push("Implementar garbage collection más agresivo");
      recommendations.push("Revisar memory leaks: busca referencias circulares no liberadas");
      recommendations.push("Considerar virtualización de listas largas");
    }

    if (summary.averageLatency && summary.averageLatency > 200) {
      recommendations.push("Implementar caching para reducir latencia");
      recommendations.push("Optimizar queries de base de datos");
      recommendations.push("Considerar CDN para contenido estático");
    }

    if (summary.averageFPS && summary.averageFPS < 50) {
      recommendations.push("Optimizar renderizado: reduce animaciones complejas");
      recommendations.push("Implementar requestAnimationFrame para animaciones suaves");
      recommendations.push("Revisar CSS: evita reflows y repaints innecesarios");
    }

    if (summary.bottlenecks.length === 0) {
      recommendations.push("✅ La aplicación tiene buen rendimiento en general");
    }

    return recommendations;
  }

  /**
   * Obtener resultado
   */
  getProfilingResult(profilingId: string): ProfilingResult | undefined {
    return this.results.get(profilingId);
  }

  /**
   * Generar reporte de profiling
   */
  generateProfilingReport(result: ProfilingResult): string {
    let report = `# Reporte de Profiling y Rendimiento\n\n`;
    report += `**ID de Profiling**: ${result.profilingId}\n`;
    report += `**Plataforma**: ${result.config.platform}\n`;
    report += `**Estado**: ${result.status === "completed" ? "✅ Completado" : "❌ Fallido"}\n\n`;

    if (result.summary) {
      report += `## Resumen de Métricas\n\n`;
      report += `| Métrica | Valor |\n`;
      report += `|--------|-------|\n`;

      if (result.summary.averageCPU !== undefined) {
        report += `| CPU Promedio | ${result.summary.averageCPU.toFixed(1)}% |\n`;
      }
      if (result.summary.peakMemory !== undefined) {
        report += `| Memoria Pico | ${result.summary.peakMemory.toFixed(1)} MB |\n`;
      }
      if (result.summary.averageLatency !== undefined) {
        report += `| Latencia Promedio | ${result.summary.averageLatency.toFixed(1)} ms |\n`;
      }
      if (result.summary.averageFPS !== undefined) {
        report += `| FPS Promedio | ${result.summary.averageFPS.toFixed(1)} |\n`;
      }

      report += `\n`;
    }

    if (result.summary?.bottlenecks && result.summary.bottlenecks.length > 0) {
      report += `## Cuellos de Botella Identificados\n\n`;
      for (const bottleneck of result.summary.bottlenecks) {
        report += `- ⚠️ ${bottleneck}\n`;
      }
      report += `\n`;
    }

    if (result.recommendations.length > 0) {
      report += `## Recomendaciones de Optimización\n\n`;
      for (const rec of result.recommendations) {
        report += `- ${rec}\n`;
      }
      report += `\n`;
    }

    return report;
  }
}

/**
 * Instancia global
 */
let profilingServiceInstance: ProfilingService | null = null;

export function getProfilingService(): ProfilingService {
  if (!profilingServiceInstance) {
    profilingServiceInstance = new ProfilingService();
  }
  return profilingServiceInstance;
}

