"use client";

import { BaseAgent } from "./base-agent";
import type { ExecutionStep, ExecutionPlan } from "../types";
import { useMemoryStore } from "../memory/memory-store";

// ==================== AGENTE 3: EJECUTOR ====================
// Modelo: DeepSeek V4 Flash (velocidad extrema, bajo costo)
//
// Responsabilidad:
// - Ejecutar cada paso del plan
// - Preparar parámetros para cada herramienta
// - Ejecutar la herramienta
// - Manejar errores
// - Guardar resultado en memoria
//
// Lee: Working Memory (plan y contexto)
// Escribe: Working Memory (resultados de pasos)

export class ExecutorAgent extends BaseAgent {
  constructor() {
    super("executor");
  }

  async executeStep(step: ExecutionStep, conversationId: string): Promise<{
    success: boolean;
    result?: string;
    error?: string;
    duration: number;
  }> {
    // 1. Obtener contexto de memoria
    const plan = this.retrieveFromMemory("working", `plan:${conversationId}`);

    // 2. Preparar parámetros
    // En producción: const params = await this.prepareParameters(step, context);
    const params = step.toolParams;

    // 3. Ejecutar la herramienta
    // En producción: const result = await this.toolRegistry.get(step.toolName).execute(params);
    // Por ahora: simulamos éxito (90% de las veces)
    const startTime = Date.now();
    const willSucceed = Math.random() > 0.1; // 90% success rate

    // Simular duración según la herramienta
    const duration = step.duration || Math.floor(Math.random() * 30) + 10;

    if (!willSucceed) {
      // Simular error
      const errors = [
        "Rate limit excedido",
        "Timeout en la conexión",
        "Formato de datos inválido",
        "Recurso no encontrado",
      ];
      const error = errors[Math.floor(Math.random() * errors.length)];

      // Guardar error en memoria episódica
      this.storeInMemory("episodic", `error:${conversationId}:${step.id}`, error, {
        conversationId,
        success: false,
        tags: ["error", "retryable", step.id],
      });

      this.emit("step:failed", { conversationId, stepId: step.id, error });

      return { success: false, error, duration };
    }

    // 4. Generar resultado simulado según la herramienta
    const result = this.generateSimulatedResult(step);

    // 5. Guardar resultado en working memory
    this.storeInMemory("working", `step:${conversationId}:${step.id}`, result, {
      conversationId,
      tags: ["step-result", step.id],
    });

    // 6. Emitir evento
    this.emit("step:completed", { conversationId, stepId: step.id, result, duration });

    return { success: true, result, duration };
  }

  private generateSimulatedResult(step: ExecutionStep): string {
    switch (step.toolName) {
      case "Web Search":
        return "10 resultados encontrados, top 5 seleccionados por relevancia";
      case "Web Extraction":
        return "Datos extraídos de 5 fuentes, 247 elementos totales";
      case "Code Generation":
        return "Código generado: 247 LOC, sintaxis validada";
      case "File Read":
        return "Archivo leído: 8,000 líneas, encoding UTF-8";
      case "Python Execution":
        return "Script ejecutado en 2.3s, output: 142 líneas";
      case "Data Analysis":
        return "Análisis completado, 12 métricas calculadas";
      case "Visualization":
        return "Chart generado: gráfico de barras con 7 categorías";
      case "Testing":
        return "18/18 tests pasados, cobertura 87%";
      case "Email":
        return "Email enviado a 1240 destinatarios, 0 fallos";
      case "Document Generation":
        return "PDF generado: 24 páginas, 2.4MB";
      default:
        return `Operación completada: ${step.description}`;
    }
  }
}
