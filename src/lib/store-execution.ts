"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { WorkspaceState, WorkspaceTabType, LogEntry, AgentType } from "../types";
import { useMemoryStore } from "./memory/memory-store";

// ==================== EXECUTION STORE ====================
// Maneja: workspace state, logs en vivo, execution state, agentes activos
// El orquestador actualiza esto vía callbacks
// El usuario SOLO VE "Trabajando..." - los 7 agentes son invisibles

interface ExecutionState {
  // Workspace (panel derecho tipo Manus)
  workspace: WorkspaceState;
  workspaceCollapsed: boolean;

  // Logs en vivo (acumulados de la ejecución actual)
  liveLogs: LogEntry[];

  // Estado del agente (interno - el usuario solo ve "Trabajando...")
  isWorking: boolean;

  // Qué agente está activo ahora (invisible al usuario, pero para stats)
  currentAgent: AgentType | null;

  // Métricas del monitor
  metrics: {
    elapsedTime: number;
    currentCost: number;
    tokensUsed: number;
    currentStep: number;
    totalSteps: number;
  } | null;

  // Anomalías detectadas
  anomalies: { type: string; severity: string; message: string }[];

  // Actions: Workspace
  setWorkspaceTab: (tab: WorkspaceTabType) => void;
  setWorkspace: (state: Partial<WorkspaceState>) => void;
  appendTerminalLine: (line: { type: "input" | "output" | "error"; text: string }) => void;
  toggleWorkspace: () => void;
  setWorkspaceCollapsed: (collapsed: boolean) => void;
  resetWorkspace: () => void;

  // Actions: Logs
  addLog: (log: LogEntry) => void;
  clearLogs: () => void;

  // Actions: Working state
  setWorking: (working: boolean) => void;
  setCurrentAgent: (agent: AgentType | null) => void;
  setMetrics: (metrics: ExecutionState["metrics"]) => void;
  addAnomaly: (anomaly: { type: string; severity: string; message: string }) => void;
  clearAnomalies: () => void;

  // Actions: Memory (delegadas al memory store)
  // Las acciones de memoria están en useMemoryStore
  // Pero exponemos un getter para acceder desde la UI
  getMemoryStats: () => {
    working: number;
    episodic: number;
    semantic: number;
  };
}

const INITIAL_WORKSPACE: WorkspaceState = {
  activeTab: "output",
  output: {
    type: "text",
    content: "Inicia una conversación para ver el progreso aquí.",
  },
};

export const useExecutionStore = create<ExecutionState>()((set, get) => ({
  workspace: INITIAL_WORKSPACE,
  workspaceCollapsed: false,
  liveLogs: [],
  isWorking: false,
  currentAgent: null,
  metrics: null,
  anomalies: [],

  setWorkspaceTab: (tab) => {
    set((state) => ({ workspace: { ...state.workspace, activeTab: tab } }));
  },

  setWorkspace: (newState) => {
    set((state) => ({ workspace: { ...state.workspace, ...newState } }));
  },

  appendTerminalLine: (line) => {
    set((state) => {
      const terminal = state.workspace.terminal || { lines: [] };
      return {
        workspace: {
          ...state.workspace,
          activeTab: "terminal",
          terminal: { ...terminal, lines: [...terminal.lines, line] },
        },
      };
    });
  },

  toggleWorkspace: () => set((state) => ({ workspaceCollapsed: !state.workspaceCollapsed })),
  setWorkspaceCollapsed: (collapsed) => set({ workspaceCollapsed: collapsed }),

  resetWorkspace: () => set({ workspace: INITIAL_WORKSPACE, liveLogs: [], anomalies: [], metrics: null }),

  addLog: (log) => set((state) => ({ liveLogs: [...state.liveLogs, log] })),
  clearLogs: () => set({ liveLogs: [] }),

  setWorking: (working) => set({ isWorking: working }),
  setCurrentAgent: (agent) => set({ currentAgent: agent }),
  setMetrics: (metrics) => set({ metrics }),
  addAnomaly: (anomaly) => set((state) => ({ anomalies: [...state.anomalies, anomaly] })),
  clearAnomalies: () => set({ anomalies: [] }),

  getMemoryStats: () => {
    const memory = useMemoryStore.getState();
    return {
      working: memory.working.length,
      episodic: memory.episodic.length,
      semantic: memory.semantic.length,
    };
  },
}));
