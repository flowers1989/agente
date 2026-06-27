"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { MemoryEntry, MemoryType } from "../types";

// ==================== SISTEMA DE MEMORIA PERSISTENTE ====================
// 3 tipos de memoria según AGENTES.DEL.SISTEMA.md:
//
// WORKING MEMORY (volátil)
// - Información actual de ejecución
// - Variables locales del paso actual
// - Contexto de la conversación activa
// - Se limpia entre conversaciones
//
// EPISODIC MEMORY (permanente)
// - Historial de tareas ejecutadas
// - Resultados de pasos anteriores
// - Errores y soluciones aplicadas
// - Resúmenes de conversaciones completadas
// - Persiste entre sesiones (localStorage)
//
// SEMANTIC MEMORY (permanente)
// - Patrones aprendidos
// - Mejores prácticas descubiertas
// - Relaciones entre conceptos
// - Estrategias que funcionaron
// - Persiste entre sesiones (localStorage)
//
// Los 7 agentes pueden leer y escribir en esta memoria.
// Por ejemplo:
// - El Analizador lee semantic memory para patrones conocidos
// - El Planificador lee episodic memory para tareas similares
// - El Ejecutor escribe en working memory el contexto actual
// - El Verificador escribe en episodic memory los errores encontrados
// - El Optimizador lee episodic + semantic para sugerir mejoras
// - El Reportero lee working memory para generar el reporte
// - El Monitor lee todo para detectar anomalías

interface MemoryState {
  // Las 3 memorias
  working: MemoryEntry[];     // Volátil
  episodic: MemoryEntry[];    // Persistente (historial)
  semantic: MemoryEntry[];    // Persistente (patrones)

  // Acciones básicas CRUD
  store: (type: MemoryType, key: string, value: string, options?: {
    conversationId?: string;
    success?: boolean;
    confidence?: number;
    tags?: string[];
  }) => void;

  retrieve: (type: MemoryType, key: string) => MemoryEntry | undefined;
  search: (type: MemoryType, query: string) => MemoryEntry[];
  getAll: (type: MemoryType) => MemoryEntry[];

  delete: (type: MemoryType, key: string) => void;
  clearWorking: () => void;  // Limpia solo working memory
  clearAll: () => void;      // Limpia todo (peligroso)

  // Acciones específicas de agentes
  // El Analizador guarda el análisis
  storeAnalysis: (conversationId: string, analysis: string) => void;
  // El Planificador guarda el plan
  storePlan: (conversationId: string, plan: string) => void;
  // El Ejecutor guarda el resultado de un paso
  storeStepResult: (conversationId: string, stepId: string, result: string) => void;
  // El Verificador guarda errores encontrados
  storeError: (conversationId: string, stepId: string, error: string, canRetry: boolean) => void;
  // El Optimizador guarda sugerencias
  storeOptimization: (suggestion: string, savings: string) => void;
  // El Reportero guarda el reporte final
  storeReport: (conversationId: string, report: string) => void;
  // El Monitor guarda anomalías detectadas
  storeAnomaly: (conversationId: string, anomaly: string, severity: string) => void;

  // Aprender de una conversación completada (llamado al final)
  learnFromConversation: (conversationId: string, summary: string, patterns: string[], success: boolean) => void;

  // Recuperar contexto relevante para una nueva tarea
  // Esto lo usa el Analizador y el Planificador
  getRelevantContext: (objective: string) => {
    similarTasks: MemoryEntry[];
    learnedPatterns: MemoryEntry[];
    knownErrors: MemoryEntry[];
  };
}

export const useMemoryStore = create<MemoryState>()(
  persist(
    (set, get) => ({
      working: [],
      episodic: [],
      semantic: [],

      store: (type, key, value, options = {}) => {
        const entry: MemoryEntry = {
          id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type,
          key,
          value,
          conversationId: options.conversationId,
          success: options.success,
          confidence: options.confidence ?? 1.0,
          tags: options.tags,
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          [type]: [entry, ...state[type]].slice(0, 1000), // Máximo 1000 entries por tipo
        }));
      },

      retrieve: (type, key) => {
        return get()[type].find((e) => e.key === key);
      },

      search: (type, query) => {
        const lower = query.toLowerCase();
        return get()[type].filter(
          (e) =>
            e.key.toLowerCase().includes(lower) ||
            e.value.toLowerCase().includes(lower) ||
            e.tags?.some((t) => t.toLowerCase().includes(lower))
        );
      },

      getAll: (type) => get()[type],

      delete: (type, key) => {
        set((state) => ({
          [type]: state[type].filter((e) => e.key !== key),
        }));
      },

      clearWorking: () => set({ working: [] }),

      clearAll: () => set({ working: [], episodic: [], semantic: [] }),

      // === Acciones específicas de agentes ===

      storeAnalysis: (conversationId, analysis) => {
        get().store("working", `analysis:${conversationId}`, analysis, {
          conversationId,
          tags: ["analysis", conversationId],
        });
      },

      storePlan: (conversationId, plan) => {
        get().store("working", `plan:${conversationId}`, plan, {
          conversationId,
          tags: ["plan", conversationId],
        });
      },

      storeStepResult: (conversationId, stepId, result) => {
        get().store("working", `step:${conversationId}:${stepId}`, result, {
          conversationId,
          tags: ["step-result", stepId],
        });
      },

      storeError: (conversationId, stepId, error, canRetry) => {
        // Los errores van a episodic memory para no repetirlos
        get().store("episodic", `error:${conversationId}:${stepId}`, error, {
          conversationId,
          success: false,
          tags: ["error", canRetry ? "retryable" : "fatal", stepId],
        });
      },

      storeOptimization: (suggestion, savings) => {
        get().store("semantic", `optimization:${Date.now()}`, `${suggestion} (Ahorros: ${savings})`, {
          confidence: 0.8,
          tags: ["optimization", "suggestion"],
        });
      },

      storeReport: (conversationId, report) => {
        get().store("episodic", `report:${conversationId}`, report, {
          conversationId,
          success: true,
          tags: ["report"],
        });
      },

      storeAnomaly: (conversationId, anomaly, severity) => {
        get().store("episodic", `anomaly:${conversationId}:${Date.now()}`, anomaly, {
          conversationId,
          tags: ["anomaly", severity],
        });
      },

      learnFromConversation: (conversationId, summary, patterns, success) => {
        // 1. Guardar resumen en episodic memory
        get().store("episodic", `summary:${conversationId}`, summary, {
          conversationId,
          success,
          tags: ["summary", success ? "success" : "failed"],
        });

        // 2. Guardar patrones aprendidos en semantic memory
        patterns.forEach((pattern) => {
          // Si ya existe un patrón similar, incrementar confianza
          const existing = get().semantic.find((e) => e.value === pattern);
          if (existing) {
            set((state) => ({
              semantic: state.semantic.map((e) =>
                e.id === existing.id
                  ? { ...e, confidence: Math.min(1, (e.confidence || 0.5) + 0.1) }
                  : e
              ),
            }));
          } else {
            get().store("semantic", `pattern:${Date.now()}:${Math.random().toString(36).slice(2, 6)}`, pattern, {
              confidence: 0.6,
              tags: ["pattern", "learned"],
            });
          }
        });
      },

      getRelevantContext: (objective) => {
        const lower = objective.toLowerCase();

        // Buscar tareas similares en episodic memory
        const similarTasks = get().episodic.filter(
          (e) =>
            e.tags?.includes("summary") &&
            (e.value.toLowerCase().includes(lower.slice(0, 20)) ||
              lower.includes(e.value.toLowerCase().slice(0, 20)))
        ).slice(0, 5);

        // Patrones aprendidos relevantes
        const learnedPatterns = get().semantic
          .filter((e) => e.tags?.includes("pattern"))
          .slice(0, 10);

        // Errores conocidos que podríamos evitar
        const knownErrors = get().episodic
          .filter((e) => e.tags?.includes("error"))
          .slice(0, 5);

        return { similarTasks, learnedPatterns, knownErrors };
      },
    }),
    {
      name: "agente-ia-memory-v2",
      storage: createJSONStorage(() => localStorage),
      // Solo persistimos episodic y semantic (working es volátil)
      partialize: (state) => ({
        episodic: state.episodic,
        semantic: state.semantic,
      }),
    }
  )
);
