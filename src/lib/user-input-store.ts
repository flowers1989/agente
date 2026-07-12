"use client";

import { create } from "zustand";

// ==================== USER INPUT STORE ====================
// Maneja las solicitudes de input del agente al usuario (human-in-the-loop).
// Cuando el agente usa la herramienta ask_user, se abre un modal en la UI
// que pausa el agente hasta que el usuario responde.

export interface UserInputRequest {
  id: string;
  prompt: string;
  timestamp: number;
  // Resolver la promesa cuando el usuario responde
  resolve: (response: string) => void;
}

interface UserInputState {
  // Request activo (si hay uno, el agente está pausado esperando)
  activeRequest: UserInputRequest | null;
  // Historial de requests resueltos
  history: Array<{ id: string; prompt: string; response: string; timestamp: number }>;

  // Mostrar/ocultar modal
  isModalOpen: boolean;

  // Actions
  requestInput: (prompt: string) => Promise<string>;
  respondToRequest: (response: string) => void;
  cancelRequest: () => void;
  closeModal: () => void;
}

export const useUserInputStore = create<UserInputState>((set, get) => ({
  activeRequest: null,
  history: [],
  isModalOpen: false,

  requestInput: (prompt: string): Promise<string> => {
    return new Promise<string>((resolve) => {
      const request: UserInputRequest = {
        id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        prompt,
        timestamp: Date.now(),
        resolve,
      };
      set({ activeRequest: request, isModalOpen: true });
    });
  },

  respondToRequest: (response: string) => {
    const { activeRequest } = get();
    if (activeRequest) {
      activeRequest.resolve(response);
      set((state) => ({
        activeRequest: null,
        isModalOpen: false,
        history: [
          ...state.history,
          {
            id: activeRequest.id,
            prompt: activeRequest.prompt,
            response,
            timestamp: Date.now(),
          },
        ],
      }));
    }
  },

  cancelRequest: () => {
    const { activeRequest } = get();
    if (activeRequest) {
      activeRequest.resolve(""); // respuesta vacía = cancelado
      set({ activeRequest: null, isModalOpen: false });
    }
  },

  closeModal: () => set({ isModalOpen: false }),
}));
