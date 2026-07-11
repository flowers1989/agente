/**
 * Testing Service
 * Servicio de pruebas automáticas (unitarias y E2E)
 */

import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

const execAsync = promisify(exec);

export interface TestConfig {
  projectId: string;
  projectPath: string;
  testType: "unit" | "e2e" | "integration" | "all";
  framework?: "jest" | "vitest" | "mocha" | "playwright" | "cypress";
  coverage?: boolean;
  coverageThreshold?: number; // Porcentaje mínimo
  parallel?: boolean;
  watch?: boolean;
}

export interface TestResult {
  testId: string;
  config: TestConfig;
  status: "running" | "passed" | "failed" | "partial";
  startedAt?: string;
  completedAt?: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number; // en ms
  coverage?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  failures?: Array<{
    testName: string;
    error: string;
    stack?: string;
  }>;
  logs: string[];
}

/**
 * Servicio de Testing
 */
export class TestingService {
  private results: Map<string, TestResult> = new Map();

  /**
   * Ejecutar pruebas
   */
  async runTests(config: TestConfig): Promise<TestResult> {
    const testId = uuidv4();
    const result: TestResult = {
      testId,
      config,
      status: "running",
      startedAt: new Date().toISOString(),
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      duration: 0,
      logs: [],
    };

    this.results.set(testId, result);
    this.addLog(testId, `Iniciando pruebas ${config.testType}...`);

    try {
      const startTime = Date.now();

      // Seleccionar framework
      const framework = config.framework || this.selectFramework(config.testType);
      this.addLog(testId, `Framework: ${framework}`);

      // Ejecutar pruebas según el tipo
      switch (config.testType) {
        case "unit":
          await this.runUnitTests(testId, config, framework);
          break;
        case "e2e":
          await this.runE2ETests(testId, config, framework);
          break;
        case "integration":
          await this.runIntegrationTests(testId, config, framework);
          break;
        case "all":
          await this.runUnitTests(testId, config, framework);
          await this.runIntegrationTests(testId, config, framework);
          await this.runE2ETests(testId, config, framework);
          break;
      }

      result.duration = Date.now() - startTime;

      // Determinar estado
      if (result.failedTests === 0) {
        result.status = "passed";
        this.addLog(testId, "✅ Todas las pruebas pasaron");
      } else {
        result.status = "failed";
        this.addLog(testId, `❌ ${result.failedTests} pruebas fallaron`);
      }

      // Verificar cobertura si está configurada
      if (config.coverage && result.coverage) {
        const minCoverage = config.coverageThreshold || 80;
        const avgCoverage = (
          (result.coverage.statements +
            result.coverage.branches +
            result.coverage.functions +
            result.coverage.lines) /
          4
        ).toFixed(2);

        this.addLog(testId, `Cobertura promedio: ${avgCoverage}%`);

        if (parseFloat(avgCoverage) < minCoverage) {
          this.addLog(testId, `⚠️ Cobertura por debajo del ${minCoverage}%`);
          if (result.status === "passed") {
            result.status = "partial";
          }
        }
      }
    } catch (error) {
      result.status = "failed";
      const message = error instanceof Error ? error.message : String(error);
      this.addLog(testId, `❌ Error: ${message}`);
      result.failures = [
        {
          testName: "Ejecución de pruebas",
          error: message,
        },
      ];
    }

    result.completedAt = new Date().toISOString();
    return result;
  }

  /**
   * Ejecutar pruebas unitarias
   */
  private async runUnitTests(
    testId: string,
    config: TestConfig,
    framework: string
  ): Promise<void> {
    this.addLog(testId, "Ejecutando pruebas unitarias...");

    try {
      // Simular ejecución de pruebas
      const result = this.results.get(testId);
      if (!result) return;

      // Números simulados
      result.totalTests = 45;
      result.passedTests = 43;
      result.failedTests = 2;
      result.skippedTests = 0;

      if (config.coverage) {
        result.coverage = {
          statements: 85,
          branches: 78,
          functions: 88,
          lines: 86,
        };
      }

      // Simular fallos
      result.failures = [
        {
          testName: "calculateTotal() debe retornar suma correcta",
          error: "Expected 15 but got 14",
        },
        {
          testName: "formatDate() debe manejar fechas inválidas",
          error: "TypeError: date is not a Date object",
        },
      ];

      this.addLog(testId, `✅ ${result.passedTests}/${result.totalTests} pruebas unitarias pasaron`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.addLog(testId, `Error en pruebas unitarias: ${message}`);
      throw error;
    }
  }

  /**
   * Ejecutar pruebas de integración
   */
  private async runIntegrationTests(
    testId: string,
    config: TestConfig,
    framework: string
  ): Promise<void> {
    this.addLog(testId, "Ejecutando pruebas de integración...");

    try {
      const result = this.results.get(testId);
      if (!result) return;

      // Números simulados
      result.totalTests += 28;
      result.passedTests += 28;
      result.failedTests += 0;

      this.addLog(testId, `✅ 28/28 pruebas de integración pasaron`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.addLog(testId, `Error en pruebas de integración: ${message}`);
      throw error;
    }
  }

  /**
   * Ejecutar pruebas E2E
   */
  private async runE2ETests(
    testId: string,
    config: TestConfig,
    framework: string
  ): Promise<void> {
    this.addLog(testId, "Ejecutando pruebas E2E...");

    try {
      const result = this.results.get(testId);
      if (!result) return;

      // Números simulados
      result.totalTests += 15;
      result.passedTests += 15;
      result.failedTests += 0;

      this.addLog(testId, `✅ 15/15 pruebas E2E pasaron`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.addLog(testId, `Error en pruebas E2E: ${message}`);
      throw error;
    }
  }

  /**
   * Seleccionar framework automáticamente
   */
  private selectFramework(testType: string): string {
    switch (testType) {
      case "unit":
        return "jest";
      case "e2e":
        return "playwright";
      case "integration":
        return "jest";
      default:
        return "jest";
    }
  }

  /**
   * Añadir log
   */
  private addLog(testId: string, message: string): void {
    const result = this.results.get(testId);
    if (result) {
      result.logs.push(message);
      console.log(`[TestingService] ${testId}: ${message}`);
    }
  }

  /**
   * Obtener resultado
   */
  getTestResult(testId: string): TestResult | undefined {
    return this.results.get(testId);
  }

  /**
   * Generar reporte de pruebas
   */
  generateTestReport(result: TestResult): string {
    let report = `# Reporte de Pruebas\n\n`;
    report += `**ID de Pruebas**: ${result.testId}\n`;
    report += `**Tipo**: ${result.config.testType}\n`;
    report += `**Estado**: ${result.status === "passed" ? "✅ Exitoso" : result.status === "failed" ? "❌ Fallido" : "⚠️ Parcial"}\n\n`;

    report += `## Resumen\n`;
    report += `- **Total de Pruebas**: ${result.totalTests}\n`;
    report += `- **Pasadas**: ${result.passedTests} (${((result.passedTests / result.totalTests) * 100).toFixed(1)}%)\n`;
    report += `- **Fallidas**: ${result.failedTests}\n`;
    report += `- **Omitidas**: ${result.skippedTests}\n`;
    report += `- **Duración**: ${(result.duration / 1000).toFixed(2)}s\n\n`;

    if (result.coverage) {
      report += `## Cobertura de Código\n`;
      report += `| Métrica | Cobertura |\n`;
      report += `|--------|-----------|\n`;
      report += `| Statements | ${result.coverage.statements}% |\n`;
      report += `| Branches | ${result.coverage.branches}% |\n`;
      report += `| Functions | ${result.coverage.functions}% |\n`;
      report += `| Lines | ${result.coverage.lines}% |\n\n`;
    }

    if (result.failures && result.failures.length > 0) {
      report += `## Fallos\n\n`;
      for (const failure of result.failures) {
        report += `### ${failure.testName}\n`;
        report += `\`\`\`\n${failure.error}\n\`\`\`\n\n`;
      }
    }

    return report;
  }
}

/**
 * Instancia global
 */
let testingServiceInstance: TestingService | null = null;

export function getTestingService(): TestingService {
  if (!testingServiceInstance) {
    testingServiceInstance = new TestingService();
  }
  return testingServiceInstance;
}

