"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Conversation, ChatMessage, ExecutionStep, Attachment } from "./types";
import { SAMPLE_CONVERSATIONS, detectCategory } from "./mock-data";
import { useAppStore } from "./store-app";

// ==================== TASK STORE ====================
// Maneja: conversaciones, mensajes, ejecución asociada

interface TaskState {
  conversations: Conversation[];
  currentConversationId: string | null;

  // Actions
  createConversation: (objective: string, attachments?: Attachment[]) => string;
  setCurrentConversation: (id: string | null) => void;
  deleteConversation: (id: string) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  addMessage: (conversationId: string, message: ChatMessage) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<ChatMessage>) => void;
  updateStep: (conversationId: string, messageId: string, stepId: string, updates: Partial<ExecutionStep>) => void;
  clearConversations: () => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      conversations: SAMPLE_CONVERSATIONS,
      currentConversationId: null,

      createConversation: (objective, attachments) => {
        const id = `conv-${Date.now()}`;
        const category = detectCategory(objective);
        const title = objective.length > 50 ? objective.slice(0, 50) + "..." : objective;
        const firstMessageAttachments = attachments && attachments.length > 0 ? attachments : undefined;
        const newConversation: Conversation = {
          id,
          title,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [
            {
              id: `m-${Date.now()}`,
              role: "user",
              content: objective,
              timestamp: new Date().toISOString(),
              attachments: firstMessageAttachments,
            },
          ],
          status: "active",
          modelUsed: useAppStore.getState().apiConfig?.selectedModel || "kimi-k2.7-code",
          tokensUsed: 0,
          cost: 0,
          category,
          preview: objective.slice(0, 100),
        };
        set({
          conversations: [newConversation, ...get().conversations],
          currentConversationId: id,
        });
        return id;
      },

      setCurrentConversation: (id) => {
        set({ currentConversationId: id || null });
      },

      deleteConversation: (id) => {
        set({
          conversations: get().conversations.filter((c) => c.id !== id),
          currentConversationId: get().currentConversationId === id ? null : get().currentConversationId,
        });
      },

      updateConversation: (id, updates) => {
        set({
          conversations: get().conversations.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
          ),
        });
      },

      addMessage: (conversationId, message) => {
        set({
          conversations: get().conversations.map((c) =>
            c.id === conversationId
              ? { ...c, messages: [...c.messages, message], updatedAt: new Date().toISOString() }
              : c
          ),
        });
      },

      updateMessage: (conversationId, messageId, updates) => {
        set({
          conversations: get().conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === messageId ? { ...m, ...updates } : m
                  ),
                }
              : c
          ),
        });
      },

      updateStep: (conversationId, messageId, stepId, updates) => {
        set({
          conversations: get().conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === messageId
                      ? {
                          ...m,
                          steps: m.steps?.map((s) =>
                            s.id === stepId ? { ...s, ...updates } : s
                          ),
                        }
                      : m
                  ),
                }
              : c
          ),
        });
      },

      clearConversations: () => set({ conversations: [], currentConversationId: null }),
    }),
    {
      name: "agente-ia-tasks-v2",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        conversations: state.conversations,
        currentConversationId: state.currentConversationId,
      }),
    }
  )
);
