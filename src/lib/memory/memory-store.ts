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
// - Persiste entre sesiones (localStorage en cliente)
//
// SEMANTIC MEMORY (permanente)
// - Patrones aprendidos
// - Mejores prácticas descubiertas
// - Relaciones entre conceptos
// - Estrategias que funcionaron
// - Persiste entre sesiones (localStorage en cliente)
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

// Storage isomorfo: en el navegador usa localStorage; en el servidor
// (Route Handlers / SSR) usa un Map en memoria del proceso para no crashear.
// La persistencia entre sesiones solo aplica en el cliente; en el servidor
// la memoria vive durante el proceso (suficiente para una tarea de varios pasos).
const serverStore = new Map<string, string>();

const isomorphicStorage: StateStorage = {
  getItem: (name: string) => {
    if (typeof window !== "undefined") {
      try {
        return window.localStorage.getItem(name);
      } catch {
        return null;
      }
    }
    return serverStore.get(name) ?? null;
  },
  setItem: (name: string, value: string) => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(name, value);
      } catch {
        // Storage lleno o bloqueado: ignoramos silenciosamente
      }
      return;
    }
    serverStore.set(name, value);
  },
  removeItem: (name: string) => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(name);
      } catch {
        // Ignorar
      }
      return;
    }
    serverStore.delete(name);
  },
};

interface StateStorage {
  getItem: (name: string) => string | null;
  setItem: (name: string, value: string) => void;
  removeItem: (name: string) => void;
}

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

  // Exportar toda la memoria como JSON (para backup o debug)
  exportMemory: () => { episodic: MemoryEntry[]; semantic: MemoryEntry[]; exportedAt: string };

  // Estadísticas de uso de la memoria
  getStats: () => {
    totalEpisodic: number;
    totalSemantic: number;
    successRate: number;
    topPatterns: MemoryEntry[];
    recentTasks: MemoryEntry[];
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
        // Extraer palabras clave del objetivo (ignorar palabras cortas)
        const keywords = lower.split(/\s+/).filter((w) => w.length > 3);

        // Buscar tareas similares en episodic memory usando scoring por palabras clave
        const scoredTasks = get().episodic
          .filter((e) => e.tags?.includes("summary"))
          .map((e) => {
            const val = e.value.toLowerCase();
            const score = keywords.reduce((acc, kw) => acc + (val.includes(kw) ? 1 : 0), 0);
            return { entry: e, score };
          })
          .filter((x) => x.score > 0)
          .sort((a, b) => b.score - a.score);
        const similarTasks = scoredTasks.slice(0, 5).map((x) => x.entry);

        // Patrones aprendidos relevantes, ordenados por confianza
        const learnedPatterns = get().semantic
          .filter((e) => e.tags?.includes("pattern"))
          .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
          .slice(0, 10);

        // Errores conocidos recientes que podríamos evitar
        const knownErrors = get().episodic
          .filter((e) => e.tags?.includes("error"))
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 5);

        return { similarTasks, learnedPatterns, knownErrors };
      },

      exportMemory: () => ({
        episodic: get().episodic,
        semantic: get().semantic,
        exportedAt: new Date().toISOString(),
      }),

      getStats: () => {
        const episodic = get().episodic;
        const semantic = get().semantic;
        const summaries = episodic.filter((e) => e.tags?.includes("summary"));
        const successes = summaries.filter((e) => e.success === true).length;
        const successRate = summaries.length > 0 ? Math.round((successes / summaries.length) * 100) : 0;
        const topPatterns = semantic
          .filter((e) => e.tags?.includes("pattern"))
          .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
          .slice(0, 5);
        const recentTasks = summaries
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 10);
        return {
          totalEpisodic: episodic.length,
          totalSemantic: semantic.length,
          successRate,
          topPatterns,
          recentTasks,
        };
      },
    }),
    {
      name: "agente-ia-memory-v2",
      storage: createJSONStorage(() => isomorphicStorage),
      // Solo persistimos episodic y semantic (working es volátil)
      partialize: (state) => ({
        episodic: state.episodic,
        semantic: state.semantic,
      }),
    }
  )
);
