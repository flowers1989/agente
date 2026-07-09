/**
 * Testing Executor - Servicio real de pruebas
 * Reemplaza la simulación anterior con una implementación funcional
 * que ejecuta pruebas en el sandbox usando Vitest, Jest o frameworks similares
 */

import { ToolExecutor, ToolExecutionResult } from "./tool-registry";
import { clientGetOrCreateSandbox, clientRunCode } from "../sandbox/sandbox-client";

export interface TestConfig {
  framework: "vitest" | "jest" | "mocha" | "pytest";
  testPath: string;
  pattern?: string;
  coverage?: boolean;
  watch?: boolean;
}

/**
 * Ejecutor de pruebas que corre tests reales en el sandbox
 */
export const testingExecutor: ToolExecutor = async (params, context) => {
  const framework = String(params.framework || "vitest");
  const testPath = String(params.testPath || "./");
  const pattern = String(params.pattern || "");
  const coverage = Boolean(params.coverage);
  const watch = Boolean(params.watch);

  if (!testPath) {
    return {
      success: false,
      error: "Parámetro 'testPath' requerido para Testing",
    };
  }

  try {
    const sandbox = await clientGetOrCreateSandbox(context.conversationId);

    // Construir comando según el framework
    let command = "";
    switch (framework) {
      case "vitest":
        command = `cd ${testPath} && npm run test${coverage ? " -- --coverage" : ""}${pattern ? ` -- ${pattern}` : ""}`;
        break;
      case "jest":
        command = `cd ${testPath} && npm run test${coverage ? " -- --coverage" : ""}${pattern ? ` -- ${pattern}` : ""}`;
        break;
      case "mocha":
        command = `cd ${testPath} && npm run test${pattern ? ` -- ${pattern}` : ""}`;
        break;
      case "pytest":
        command = `cd ${testPath} && python -m pytest${coverage ? " --cov" : ""}${pattern ? ` ${pattern}` : ""}`;
        break;
      default:
        return {
          success: false,
          error: `Framework de testing no soportado: ${framework}`,
        };
    }

    // Ejecutar las pruebas en el sandbox
    const result = await clientRunCode(sandbox.taskId, "bash", command);

    // Parsear los resultados
    const stdout = result.stdout || "";
    const stderr = result.stderr || "";
    const exitCode = result.exitCode || 0;

    // Extraer métricas de las pruebas
    const passedMatch = stdout.match(/(\d+)\s+(?:passed|✓)/i);
    const failedMatch = stdout.match(/(\d+)\s+(?:failed|✗|×)/i);
    const skippedMatch = stdout.match(/(\d+)\s+(?:skipped|⊘)/i);

    const testMetrics = {
      passed: passedMatch ? parseInt(passedMatch[1]) : 0,
      failed: failedMatch ? parseInt(failedMatch[1]) : 0,
      skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0,
      total: 0,
    };

    testMetrics.total = testMetrics.passed + testMetrics.failed + testMetrics.skipped;

    const success = exitCode === 0 && testMetrics.failed === 0;

    return {
      success,
      result: success
        ? `✅ Pruebas ejecutadas exitosamente\n\nResultados:\n- Pasadas: ${testMetrics.passed}\n- Fallidas: ${testMetrics.failed}\n- Omitidas: ${testMetrics.skipped}\n- Total: ${testMetrics.total}`
        : `❌ Algunas pruebas fallaron\n\nResultados:\n- Pasadas: ${testMetrics.passed}\n- Fallidas: ${testMetrics.failed}\n- Omitidas: ${testMetrics.skipped}\n- Total: ${testMetrics.total}`,
      data: {
        framework,
        testPath,
        metrics: testMetrics,
        coverage: coverage ? "Incluido" : "No incluido",
      },
      output: {
        type: "code",
        content: stdout || stderr,
        language: "text",
        title: `Test Results - ${framework}`,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Error ejecutando pruebas: ${message}`,
    };
  }
};
