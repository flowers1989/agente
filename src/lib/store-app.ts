"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  User,
  APIConfig,
  ModelParameters,
  UserPreferences,
  Route,
} from "./types";
import { AI_MODELS } from "./mock-data";
import { getAdapter } from "./agents/opencode-adapter";

// ==================== APP STORE ====================
// Maneja: auth, config, theme, routing, sidebar

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  onboarded: boolean;

  // Config
  apiConfig: APIConfig | null;
  modelParameters: ModelParameters;
  preferences: UserPreferences;

  // UI
  theme: "dark" | "light";
  route: Route;
  routeParams: Record<string, string>;
  sidebarCollapsed: boolean;
  agentMode: "economy" | "quality";

  // Actions: Auth
  login: (email: string, name: string) => void;
  logout: () => void;
  register: (email: string, name: string) => void;

  // Actions: Config
  setAPIKey: (key: string) => void;
  setSelectedModel: (modelId: string) => void;
  testConnection: () => Promise<{ success: boolean; message: string }>;
  setModelParameters: (params: Partial<ModelParameters>) => void;
  setPreferences: (prefs: Partial<UserPreferences>) => void;
  completeOnboarding: () => void;

  // Actions: UI
  toggleTheme: () => void;
  setTheme: (theme: "dark" | "light") => void;
  toggleSidebar: () => void;
  toggleAgentMode: () => void;
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

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "dark",
  notifications: true,
  autoSaveTasks: true,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial
      user: null,
      isAuthenticated: false,
      onboarded: false,
      apiConfig: null,
      modelParameters: DEFAULT_PARAMETERS,
      preferences: DEFAULT_PREFERENCES,
      theme: "dark",
      route: "landing",
      routeParams: {},
      sidebarCollapsed: false,
      agentMode: "economy" as const,

      // Auth
      login: (email, name) => {
        const user: User = {
          id: `user-${Date.now()}`,
          email,
          name: name || email.split("@")[0],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set({ user, isAuthenticated: true });
        if (get().onboarded) {
          set({ route: "app" });
        } else {
          set({ route: "onboarding" });
        }
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          route: "landing",
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
        if (config.apiKey.length < 10) {
          set({
            apiConfig: {
              ...config,
              lastTestedAt: new Date().toISOString(),
              testResult: "failed",
              isActive: false,
            },
          });
          return { success: false, message: "API key inválida (muy corta)" };
        }

        // Verificación real contra el proxy backend /api/chat/completions.
        const adapter = getAdapter();
        adapter.initialize(config.apiKey);
        adapter.selectModel(config.selectedModel || "kimi-k2.7-code");

        try {
          const isConnected = await adapter.testConnection();
          if (!isConnected) {
            set({
              apiConfig: {
                ...config,
                lastTestedAt: new Date().toISOString(),
                testResult: "failed",
                isActive: false,
              },
            });
            return {
              success: false,
              message: "No se pudo conectar con OpenCode Go. Verifica la API key y tu conexión.",
            };
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
            message: `Conexión exitosa con OpenCode Go.`,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Error desconocido";
          set({
            apiConfig: {
              ...config,
              lastTestedAt: new Date().toISOString(),
              testResult: "failed",
              isActive: false,
            },
          });
          return {
            success: false,
            message: `Error de conexión: ${message}`,
          };
        }
      },

      setModelParameters: (params) => {
        set({ modelParameters: { ...get().modelParameters, ...params } });
      },

      setPreferences: (prefs) => {
        set({ preferences: { ...get().preferences, ...prefs } });
      },

      completeOnboarding: () => {
        set({ onboarded: true, route: "app" });
      },

      // UI
      toggleTheme: () => {
        const next = get().theme === "dark" ? "light" : "dark";
        set({ theme: next, preferences: { ...get().preferences, theme: next } });
        if (typeof document !== "undefined") {
          document.documentElement.classList.toggle("dark", next === "dark");
          document.documentElement.classList.toggle("light", next === "light");
        }
      },

      setTheme: (theme) => {
        set({ theme, preferences: { ...get().preferences, theme } });
        if (typeof document !== "undefined") {
          document.documentElement.classList.toggle("dark", theme === "dark");
          document.documentElement.classList.toggle("light", theme === "light");
        }
      },

      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      toggleAgentMode: () => set({ agentMode: get().agentMode === "economy" ? "quality" : "economy" }),

      navigate: (route, params = {}) => {
        const isAuth = get().isAuthenticated || !!get().user || get().onboarded;
        const protectedRoutes: Route[] = [
          "app", "dashboard", "history", "reports", "settings", "documentation", "onboarding",
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
      name: "agente-ia-storage-v2",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        apiConfig: state.apiConfig,
        modelParameters: state.modelParameters,
        preferences: state.preferences,
        onboarded: state.onboarded,
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        agentMode: state.agentMode,
      }),
    }
  )
);
