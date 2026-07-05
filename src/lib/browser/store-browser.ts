"use client";

import { create } from "zustand";

export interface BrowserActionLog {
  id: string;
  action: string;
  params: Record<string, unknown>;
  result: "success" | "error";
  message?: string;
  timestamp: Date;
}

export interface BrowserElement {
  id: number;
  tag: string;
  role?: string;
  name?: string;
  placeholder?: string;
  type?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  href?: string;
  interactive: boolean;
}

interface BrowserState {
  sessionId: string | null;
  url: string;
  title: string;
  screenshot: string | null;
  isLoading: boolean;
  isActive: boolean;
  logs: BrowserActionLog[];
  elements: BrowserElement[];
  showElements: boolean;
  error: string | null;

  // Actions
  setSessionId: (id: string | null) => void;
  setUrl: (url: string) => void;
  setTitle: (title: string) => void;
  setScreenshot: (screenshot: string | null) => void;
  setLoading: (loading: boolean) => void;
  setActive: (active: boolean) => void;
  addLog: (log: Omit<BrowserActionLog, "id" | "timestamp">) => void;
  clearLogs: () => void;
  setElements: (elements: BrowserElement[]) => void;
  toggleShowElements: () => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  sessionId: null,
  url: "",
  title: "",
  screenshot: null,
  isLoading: false,
  isActive: false,
  logs: [],
  elements: [],
  showElements: false,
  error: null,
};

export const useBrowserStore = create<BrowserState>()((set) => ({
  ...INITIAL_STATE,

  setSessionId: (id) => set({ sessionId: id }),
  setUrl: (url) => set({ url }),
  setTitle: (title) => set({ title }),
  setScreenshot: (screenshot) => set({ screenshot }),
  setLoading: (isLoading) => set({ isLoading }),
  setActive: (isActive) => set({ isActive }),
  addLog: (log) =>
    set((state) => ({
      logs: [
        ...state.logs,
        {
          ...log,
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date(),
        },
      ].slice(-200),
    })),
  clearLogs: () => set({ logs: [] }),
  setElements: (elements) => set({ elements }),
  toggleShowElements: () => set((state) => ({ showElements: !state.showElements })),
  setError: (error) => set({ error }),
  reset: () => set(INITIAL_STATE),
}));
