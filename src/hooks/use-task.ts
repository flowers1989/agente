"use client";

import { useTaskStore } from "@/lib/store-task";
import { useAppStore } from "@/lib/store-app";
import { toast } from "sonner";
import { detectCategory } from "@/lib/mock-data";

// Hook de tareas/conversaciones
export function useTask() {
  const conversations = useTaskStore((s) => s.conversations);
  const currentConversationId = useTaskStore((s) => s.currentConversationId);
  const createConversation = useTaskStore((s) => s.createConversation);
  const setCurrentConversation = useTaskStore((s) => s.setCurrentConversation);
  const deleteConversation = useTaskStore((s) => s.deleteConversation);
  const updateConversation = useTaskStore((s) => s.updateConversation);
  const addMessage = useTaskStore((s) => s.addMessage);
  const updateMessage = useTaskStore((s) => s.updateMessage);
  const updateStep = useTaskStore((s) => s.updateStep);

  const currentConversation = conversations.find((c) => c.id === currentConversationId);

  const handleCreate = (objective: string) => {
    if (!objective.trim()) {
      toast.error("Describe tu objetivo");
      return null;
    }
    const id = createConversation(objective);
    useAppStore.getState().navigate("app");
    return id;
  };

  const handleSelect = (id: string) => {
    setCurrentConversation(id);
    useAppStore.getState().navigate("app");
  };

  const handleDelete = (id: string) => {
    deleteConversation(id);
    toast.success("Conversación eliminada");
  };

  const handleSendMessage = (conversationId: string, content: string) => {
    if (!content.trim()) return;
    addMessage(conversationId, {
      id: `m-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    });
  };

  return {
    conversations,
    currentConversation,
    currentConversationId,
    createConversation: handleCreate,
    selectConversation: handleSelect,
    deleteConversation: handleDelete,
    sendMessage: handleSendMessage,
    updateConversation,
    updateMessage,
    updateStep,
    detectCategory,
  };
}
