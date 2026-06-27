"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  User,
  APIConfig,
  ModelParameters,
  Task,
  Route,
  Execution,
  LogEntry,
} from "./types";
import { SAMPLE_TASKS, SAMPLE_EXECUTION, OPENCODE_MODELS } from "./mock-data";

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;

  // Config
  apiConfig: APIConfig | null;
  modelParameters: ModelParameters;
  onboarded: boolean;

  // Tasks
  tasks: Task[];
  currentTaskId: string | null;
  execution: Execution | null;
  logs: LogEntry[];

  // UI
  theme: "light" | "dark";
  sidebarCollapsed: boolean;
  route: Route;
  routeParams: Record<string, string>;

  // Actions - Auth
  login: (email: string, name: string) => void;
  logout: () => void;
  register: (email: string, name: string, password: string) => void;

  // Actions - Config
  setAPIKey: (key: string) => void;
  setSelectedModel: (modelId: string) => void;
  testConnection: () => Promise<{ success: boolean; message: string }>;
  setModelParameters: (params: Partial<ModelParameters>) => void;
  completeOnboarding: () => void;

  // Actions - Tasks
  addTask: (task: Omit<Task, "id" | "userId" | "createdAt" | "status">) => string;
  deleteTask: (id: string) => void;
  setCurrentTask: (id: string) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;

  // Actions - Execution
  setExecution: (execution: Execution) => void;
  startExecution: (taskId: string) => void;
  addLog: (log: LogEntry) => void;
  clearLogs: () => void;
  pauseExecution: () => void;
  cancelExecution: () => void;
  retryStep: () => void;

  // Actions - UI
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark") => void;
  toggleSidebar: () => void;
  navigate: (route: Route, params?: Record<string, string>) => void;
}

const DEFAULT_PARAMETERS: ModelParameters = {
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1.0,
  frequencyPenalty: 0.0,
  presencePenalty: 0.0,
  stopSequences: [],
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      apiConfig: null,
      modelParameters: DEFAULT_PARAMETERS,
      onboarded: false,
      tasks: SAMPLE_TASKS,
      currentTaskId: null,
      execution: null,
      logs: [],
      theme: "dark",
      sidebarCollapsed: false,
      route: "landing",
      routeParams: {},

      // Auth
      login: (email, name) => {
        const user: User = {
          id: `user-${Date.now()}`,
          email,
          name: name || email.split("@")[0],
          createdAt: new Date().toISOString(),
        };
        set({ user, isAuthenticated: true });
        if (get().onboarded) {
          set({ route: "dashboard" });
        } else {
          set({ route: "onboarding" });
        }
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          route: "landing",
          execution: null,
          logs: [],
          currentTaskId: null,
        });
      },

      register: (email, name) => {
        get().login(email, name);
      },

      // Config
      setAPIKey: (key) => {
        const existing = get().apiConfig;
        set({
          apiConfig: {
            apiKey: key,
            selectedModel: existing?.selectedModel || "kimi-k2.7-code",
            isActive: false,
            lastTestedAt: null,
            testResult: null,
          },
        });
      },

      setSelectedModel: (modelId) => {
        const existing = get().apiConfig;
        if (existing) {
          set({ apiConfig: { ...existing, selectedModel: modelId } });
        } else {
          set({
            apiConfig: {
              apiKey: "",
              selectedModel: modelId,
              isActive: false,
              lastTestedAt: null,
              testResult: null,
            },
          });
        }
      },

      testConnection: async () => {
        const config = get().apiConfig;
        if (!config || !config.apiKey) {
          return { success: false, message: "No hay API key configurada" };
        }
        // Simulación de validación
        await new Promise((r) => setTimeout(r, 1500));
        if (config.apiKey.length < 10) {
          set({
            apiConfig: {
              ...config,
              lastTestedAt: new Date().toISOString(),
              testResult: "failed",
              isActive: false,
            },
          });
          return { success: false, message: "API key inválida o expirada" };
        }
        set({
          apiConfig: {
            ...config,
            lastTestedAt: new Date().toISOString(),
            testResult: "success",
            isActive: true,
          },
        });
        return {
          success: true,
          message: `Conexión exitosa. ${OPENCODE_MODELS.length} modelos disponibles.`,
        };
      },

      setModelParameters: (params) => {
        set({ modelParameters: { ...get().modelParameters, ...params } });
      },

      completeOnboarding: () => {
        set({ onboarded: true, route: "dashboard" });
      },

      // Tasks
      addTask: (task) => {
        const id = `task-${Date.now()}`;
        const newTask: Task = {
          ...task,
          id,
          userId: get().user?.id || "user-1",
          createdAt: new Date().toISOString(),
          status: "pending",
        };
        set({ tasks: [newTask, ...get().tasks] });
        return id;
      },

      deleteTask: (id) => {
        set({ tasks: get().tasks.filter((t) => t.id !== id) });
      },

      setCurrentTask: (id) => {
        set({ currentTaskId: id });
      },

      updateTask: (id, updates) => {
        set({
          tasks: get().tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        });
      },

      // Execution
      setExecution: (execution) => set({ execution }),

      startExecution: (taskId) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) return;
        // Crear ejecución simulada basada en SAMPLE_EXECUTION pero con la task actual
        const exec: Execution = {
          ...SAMPLE_EXECUTION,
          id: `exec-${Date.now()}`,
          taskId,
          currentStepIndex: 0,
          status: "running",
          startedAt: new Date().toISOString(),
          tokensUsed: 0,
          actualCost: 0,
          logs: [],
          variables: {},
          memory: [],
          errors: [],
          plan: {
            ...SAMPLE_EXECUTION.plan,
            steps: SAMPLE_EXECUTION.plan.steps.map((s) => ({
              ...s,
              status: "pending" as const,
              logs: [],
              startedAt: undefined,
              completedAt: undefined,
              result: undefined,
            })),
          },
        };
        set({ execution: exec, currentTaskId: taskId, logs: [], route: "task-execution" });
      },

      addLog: (log) => set({ logs: [...get().logs, log] }),

      clearLogs: () => set({ logs: [] }),

      pauseExecution: () => {
        const exec = get().execution;
        if (exec) {
          set({ execution: { ...exec, status: "paused" } });
        }
      },

      cancelExecution: () => {
        const exec = get().execution;
        if (exec) {
          set({ execution: { ...exec, status: "cancelled" } });
        }
      },

      retryStep: () => {
        const exec = get().execution;
        if (exec) {
          set({
            execution: {
              ...exec,
              status: "running",
              plan: {
                ...exec.plan,
                steps: exec.plan.steps.map((s, i) =>
                  i === exec.currentStepIndex
                    ? { ...s, status: "running", error: undefined }
                    : s
                ),
              },
            },
          });
        }
      },

      // UI
      toggleTheme: () => {
        const next = get().theme === "dark" ? "light" : "dark";
        set({ theme: next });
        if (typeof document !== "undefined") {
          document.documentElement.classList.toggle("dark", next === "dark");
        }
      },

      setTheme: (theme) => {
        set({ theme });
        if (typeof document !== "undefined") {
          document.documentElement.classList.toggle("dark", theme === "dark");
        }
      },

      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),

      navigate: (route, params = {}) => {
        // Si requiere auth y no está logueado, ir a landing.
        // Consideramos "autenticado" si hay user O si ya completó onboarding
        // (mayor robustez ante reloads que pierden user pero mantienen onboarded)
        const isAuth = get().isAuthenticated || !!get().user || get().onboarded;
        const protectedRoutes: Route[] = [
          "dashboard",
          "tasks",
          "task-execution",
          "task-result",
          "history",
          "reports",
          "settings",
          "documentation",
          "tools",
          "onboarding",
        ];
        if (protectedRoutes.includes(route) && !isAuth) {
          set({ route: "login", routeParams: {} });
          return;
        }
        set({ route, routeParams: params });
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      },
    }),
    {
      name: "agente-ia-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        apiConfig: state.apiConfig,
        modelParameters: state.modelParameters,
        onboarded: state.onboarded,
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        tasks: state.tasks,
      }),
    }
  )
);
