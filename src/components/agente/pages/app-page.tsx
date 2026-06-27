"use client";

import { ConversationSidebar, SidebarReopenButton } from "@/components/agente/conversation-sidebar";
import { ChatPanel } from "@/components/agente/chat-panel";
import { WorkspacePanel } from "@/components/agente/workspace-panel";
import { useExecution } from "@/hooks/use-execution";
import { useExecutionStore } from "@/lib/store-execution";
import { useTaskStore } from "@/lib/store-task";
import { useEffect } from "react";

export function AppPage() {
  // El hook de simulación - internamente activa los 3 agentes (invisible al usuario)
  useExecution();

  const currentConversationId = useTaskStore((s) => s.currentConversationId);
  const resetWorkspace = useExecutionStore((s) => s.resetWorkspace);

  useEffect(() => {
    if (!currentConversationId) {
      resetWorkspace();
    }
  }, [currentConversationId, resetWorkspace]);

  return (
    <div className="h-screen w-screen flex bg-background overflow-hidden">
      <ConversationSidebar />
      <div className="flex-1 flex min-w-0">
        <div className="flex-1 flex flex-col min-w-0">
          <SidebarReopenButton />
          <ChatPanel />
        </div>
        <WorkspacePanel />
      </div>
    </div>
  );
}
