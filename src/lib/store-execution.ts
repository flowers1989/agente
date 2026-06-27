"use client";

import { create } from "zustand";
import type { WorkspaceState, WorkspaceTabType, LogEntry } from "./types";

// ==================== EXECUTION STORE ====================
// Maneja: workspace state, logs en vivo, execution state
// El agente (Planificador→Ejecutor→Verificador) actualiza esto internamente
// El usuario solo ve el resultado en el workspace

interface ExecutionState {
  // Workspace (panel derecho tipo Manus)
  workspace: WorkspaceState;
  workspaceCollapsed: boolean;

  // Logs en vivo (acumulados de la ejecución actual)
  liveLogs: LogEntry[];

  // Estado del agente (interno - el usuario solo ve "Trabajando...")
  isWorking: boolean;

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
}

const INITIAL_WORKSPACE: WorkspaceState = {
  activeTab: "output",
  output: {
    type: "text",
    content: "Inicia una conversación para ver el progreso aquí.",
  },
};

export const useExecutionStore = create<ExecutionState>()((set) => ({
  workspace: INITIAL_WORKSPACE,
  workspaceCollapsed: false,
  liveLogs: [],
  isWorking: false,

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
          terminal: {
            ...terminal,
            lines: [...terminal.lines, line],
          },
        },
      };
    });
  },

  toggleWorkspace: () => set((state) => ({ workspaceCollapsed: !state.workspaceCollapsed })),
  setWorkspaceCollapsed: (collapsed) => set({ workspaceCollapsed: collapsed }),

  resetWorkspace: () => set({ workspace: INITIAL_WORKSPACE, liveLogs: [] }),

  addLog: (log) => set((state) => ({ liveLogs: [...state.liveLogs, log] })),
  clearLogs: () => set({ liveLogs: [] }),

  setWorking: (working) => set({ isWorking: working }),
}));
