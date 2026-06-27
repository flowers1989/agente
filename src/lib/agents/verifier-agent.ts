"use client";

import { BaseAgent } from "./base-agent";
import type { ExecutionStep } from "../types";

// ==================== AGENTE 4: VERIFICADOR ====================
// Modelo: GLM-5.2 (análisis profundo, decisiones críticas)
//
// Responsabilidad:
// - Validar resultado de cada paso
// - Si hay error, analizar la causa raíz
// - Decidir acción: retry, skip, fail
// - Sugerir fixes
//
// Lee: Working Memory (resultado del paso)
// Escribe: Episodic Memory (errores encontrados, para no repetirlos)

export interface VerificationResult {
  isValid: boolean;
  errors: string[];
  analysis: {
    rootCause: string;
    canRetry: boolean;
    suggestedFix: string;
    likelihood: number; // 0.0 - 1.0
  };
  action: "retry" | "skip" | "fail" | "continue";
  recommendation: string;
}

export class VerifierAgent extends BaseAgent {
  constructor() {
    super("verifier");
  }

  async verifyStep(step: ExecutionStep, result: { success: boolean; result?: string; error?: string }, conversationId: string): Promise<VerificationResult> {
    // 1. Si el resultado fue exitoso, validar calidad
    if (result.success) {
      // En producción: const validation = await this.callLLM(prompt);
      const isValid = this.validateResultQuality(step, result.result);

      if (isValid) {
        this.emit("verification:passed", { conversationId, stepId: step.id });
        return {
          isValid: true,
          errors: [],
          analysis: { rootCause: "", canRetry: false, suggestedFix: "", likelihood: 1.0 },
          action: "continue",
          recommendation: "Resultado válido, continuar con el siguiente paso",
        };
      } else {
        // Resultado exitoso pero calidad baja
        return {
          isValid: false,
          errors: ["Resultado no cumple estándares de calidad"],
          analysis: {
            rootCause: "Output incompleto o malformado",
            canRetry: true,
            suggestedFix: "Reintentar con parámetros ajustados",
            likelihood: 0.7,
          },
          action: "retry",
          recommendation: "Reintentar paso con parámetros ajustados",
        };
      }
    }

    // 2. Si hubo error, analizar causa raíz
    // En producción: const analysis = await this.callLLM(prompt);
    const analysis = this.analyzeError(step, result.error || "");

    // 3. Guardar error en memoria episódica para aprender de él
    this.storeInMemory("episodic", `error:${conversationId}:${step.id}`, result.error || "", {
      conversationId,
      success: false,
      tags: ["error", analysis.canRetry ? "retryable" : "fatal", step.toolName],
    });

    // 4. Decidir acción
    const action = analysis.canRetry && analysis.likelihood > 0.6 ? "retry" :
                   analysis.canRetry ? "skip" : "fail";

    if (action === "fail") {
      this.emit("verification:failed", { conversationId, stepId: step.id, error: result.error });
    }

    return {
      isValid: false,
      errors: [result.error || "Unknown error"],
      analysis,
      action,
      recommendation: analysis.suggestedFix,
    };
  }

  async shouldRetry(step: ExecutionStep, result: { success: boolean; error?: string }, conversationId: string): Promise<boolean> {
    const verification = await this.verifyStep(step, { success: result.success, error: result.error }, conversationId);
    return verification.action === "retry";
  }

  private validateResultQuality(step: ExecutionStep, result?: string): boolean {
    if (!result) return false;
    // Validaciones básicas según el tipo de herramienta
    if (result.length < 5) return false;
    return true;
  }

  private analyzeError(step: ExecutionStep, error: string): VerificationResult["analysis"] {
    const lower = error.toLowerCase();

    // Errores conocidos con causas y soluciones
    if (lower.includes("rate limit")) {
      return {
        rootCause: "API rate limit exceeded",
        canRetry: true,
        suggestedFix: "Esperar 15 minutos y reintentar con paginación más lenta",
        likelihood: 0.85,
      };
    }

    if (lower.includes("timeout")) {
      return {
        rootCause: "Timeout en la conexión",
        canRetry: true,
        suggestedFix: "Aumentar timeout o dividir la tarea en lotes más pequeños",
        likelihood: 0.7,
      };
    }

    if (lower.includes("not found") || lower.includes("404")) {
      return {
        rootCause: "Recurso no encontrado",
        canRetry: false,
        suggestedFix: "Verificar la URL o path del recurso",
        likelihood: 0.2,
      };
    }

    if (lower.includes("unauthorized") || lower.includes("401") || lower.includes("403")) {
      return {
        rootCause: "Error de autenticación/autorización",
        canRetry: false,
        suggestedFix: "Verificar credenciales y permisos",
        likelihood: 0.1,
      };
    }

    // Error genérico
    return {
      rootCause: error || "Error desconocido",
      canRetry: true,
      suggestedFix: "Reintentar con configuración por defecto",
      likelihood: 0.5,
    };
  }
}
