/**
 * Verifier Agent con Loop
 * Valida resultados y puede solicitar correcciones iterativas
 */

import { BaseAgent } from "./base-agent";
import { getAdapter } from "./opencode-adapter";
import { useMemoryStore } from "../memory/memory-store";

export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-1
  issues: string[];
  suggestions: string[];
  requiresCorrection: boolean;
  correctionAttempts: number;
}

export interface VerificationLoop {
  originalResult: unknown;
  validationHistory: ValidationResult[];
  finalResult: unknown;
  isApproved: boolean;
  totalAttempts: number;
}

/**
 * Agente verificador con capacidad de loop de validación
 */
export class VerifierAgentLoop extends BaseAgent {
  constructor() {
    super("verifier");
  }

  /**
   * Validar un resultado con loop de corrección
   */
  async validateWithLoop(
    result: unknown,
    criteria: string,
    conversationId: string,
    maxAttempts: number = 3
  ): Promise<VerificationLoop> {
    console.log(`[VerifierAgentLoop] Iniciando validación con loop para: ${criteria}`);

    const verificationLoop: VerificationLoop = {
      originalResult: result,
      validationHistory: [],
      finalResult: result,
      isApproved: false,
      totalAttempts: 0,
    };

    let currentResult = result;
    let attempt = 0;

    while (attempt < maxAttempts) {
      attempt++;
      verificationLoop.totalAttempts = attempt;

      try {
        // Validar resultado actual
        const validation = await this.validateResult(currentResult, criteria);
        verificationLoop.validationHistory.push(validation);

        console.log(`[VerifierAgentLoop] Validación intento ${attempt}: Score ${(validation.score * 100).toFixed(1)}%`);

        if (validation.isValid && validation.score >= 0.8) {
          // Resultado válido, aprobar
          verificationLoop.isApproved = true;
          verificationLoop.finalResult = currentResult;
          console.log(`[VerifierAgentLoop] ✓ Resultado aprobado`);
          break;
        }

        if (!validation.requiresCorrection || attempt >= maxAttempts) {
          // No se puede corregir o se alcanzó máximo de intentos
          verificationLoop.finalResult = currentResult;
          break;
        }

        // Intentar corrección
        console.log(`[VerifierAgentLoop] Solicitando corrección: ${validation.suggestions.join(", ")}`);
        currentResult = await this.requestCorrection(currentResult, validation.suggestions);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[VerifierAgentLoop] Error en validación intento ${attempt}: ${message}`);
      }
    }

    // Guardar en memoria
    useMemoryStore.getState().store(
      "semantic",
      `verification:loop:${conversationId}`,
      JSON.stringify(verificationLoop),
      {
        conversationId,
        tags: ["verification", "loop"],
        confidence: verificationLoop.isApproved ? 1.0 : 0.5,
      }
    );

    return verificationLoop;
  }

  /**
   * Validar un resultado contra criterios
   */
  private async validateResult(result: unknown, criteria: string): Promise<ValidationResult> {
    const prompt = `Valida este resultado contra los criterios especificados.

Resultado:
${JSON.stringify(result, null, 2).slice(0, 500)}

Criterios de validación:
${criteria}

Responde en JSON con esta estructura:
{
  "isValid": boolean,
  "score": number (0-1),
  "issues": ["issue1", "issue2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "requiresCorrection": boolean
}`;

    try {
      const adapter = getAdapter();
      const response = await adapter.chat([{ role: "user", content: prompt }], {
        model: "deepseek-v4-flash",
        maxTokens: 512,
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error("[VerifierAgentLoop] Error en validación:", error);
    }

    return {
      isValid: false,
      score: 0.5,
      issues: ["Error al validar"],
      suggestions: ["Revisar resultado"],
      requiresCorrection: true,
      correctionAttempts: 0,
    };
  }

  /**
   * Solicitar corrección de un resultado
   */
  private async requestCorrection(result: unknown, suggestions: string[]): Promise<unknown> {
    const prompt = `Corrige este resultado basándote en las sugerencias.

Resultado actual:
${JSON.stringify(result, null, 2).slice(0, 500)}

Sugerencias de corrección:
${suggestions.join("\n")}

Proporciona el resultado corregido en JSON.`;

    try {
      const adapter = getAdapter();
      const response = await adapter.chat([{ role: "user", content: prompt }], {
        model: "deepseek-v4-flash",
        maxTokens: 1024,
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return result;
    } catch (error) {
      console.error("[VerifierAgentLoop] Error en corrección:", error);
      return result;
    }
  }

  /**
   * Validar múltiples resultados
   */
  async validateMultiple(
    results: unknown[],
    criteria: string,
    conversationId: string
  ): Promise<VerificationLoop[]> {
    console.log(`[VerifierAgentLoop] Validando ${results.length} resultados`);

    const verifications: VerificationLoop[] = [];

    for (let i = 0; i < results.length; i++) {
      const verification = await this.validateWithLoop(results[i], criteria, conversationId);
      verifications.push(verification);
    }

    return verifications;
  }

  /**
   * Validar consistencia entre resultados
   */
  async validateConsistency(results: unknown[], conversationId: string): Promise<{ isConsistent: boolean; score: number; issues: string[] }> {
    const prompt = `Valida la consistencia entre estos resultados.

Resultados:
${results.map((r, i) => `${i + 1}. ${JSON.stringify(r, null, 2).slice(0, 200)}`).join("\n\n")}

¿Son consistentes? Responde en JSON:
{
  "isConsistent": boolean,
  "score": number (0-1),
  "issues": ["issue1", "issue2"]
}`;

    try {
      const adapter = getAdapter();
      const response = await adapter.chat([{ role: "user", content: prompt }], {
        model: "deepseek-v4-flash",
        maxTokens: 256,
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error("[VerifierAgentLoop] Error validando consistencia:", error);
    }

    return {
      isConsistent: false,
      score: 0.5,
      issues: ["Error al validar consistencia"],
    };
  }

  /**
   * Generar reporte de verificación
   */
  generateVerificationReport(verificationLoop: VerificationLoop): string {
    const approvalStatus = verificationLoop.isApproved ? "✅ APROBADO" : "❌ RECHAZADO";
    const validationSummary = verificationLoop.validationHistory
      .map(
        (v, i) =>
          `- Intento ${i + 1}: Score ${(v.score * 100).toFixed(1)}% | Issues: ${v.issues.length} | Válido: ${v.isValid ? "Sí" : "No"}`
      )
      .join("\n");

    return `
## Reporte de Verificación

**Estado:** ${approvalStatus}

**Total de Intentos:** ${verificationLoop.totalAttempts}

**Resultado Final:**
\`\`\`json
${JSON.stringify(verificationLoop.finalResult, null, 2).slice(0, 500)}
\`\`\`

### Historial de Validaciones

${validationSummary}

### Resultado Original

\`\`\`json
${JSON.stringify(verificationLoop.originalResult, null, 2).slice(0, 300)}
\`\`\`
`;
  }
}

/**
 * Instancia global del VerifierAgent con Loop
 */
let verifierAgentLoopInstance: VerifierAgentLoop | null = null;

export function getVerifierAgentLoop(): VerifierAgentLoop {
  if (!verifierAgentLoopInstance) {
    verifierAgentLoopInstance = new VerifierAgentLoop();
  }
  return verifierAgentLoopInstance;
}
