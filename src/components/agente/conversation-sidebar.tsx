"use client";

import { useAppStore } from "@/lib/store-app";
import { useExecutionStore } from "@/lib/store-execution";
import { LogoMark } from "@/components/agente/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Trash2,
  Settings as SettingsIcon,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  Sun,
  Moon,
  History as HistoryIcon,
  LayoutDashboard,
  BookOpen,
  MoreHorizontal,
  BarChart3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { timeAgo } from "@/lib/mock-data";
import { useTaskStore } from "@/lib/store-task";
import { useTask } from "@/hooks/use-task";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CATEGORY_LABELS: Record<string, string> = {
  research: "Investigación",
  code: "Código",
  data: "Datos",
  automation: "Automatización",
  content: "Contenido",
  general: "General",
};

const STATUS_DOT: Record<string, string> = {
  active: "bg-foreground",
  completed: "bg-muted-foreground/50",
  failed: "bg-destructive/60",
  archived: "bg-muted-foreground/30",
};

export function ConversationSidebar() {
  const conversations = useTaskStore((s) => s.conversations);
  const currentConversationId = useTaskStore((s) => s.currentConversationId);
  const { selectConversation, deleteConversation } = useTask();
  const navigate = useAppStore((s) => s.navigate);
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const user = useAppStore((s) => s.user);
  const logout = useAppStore((s) => s.logout);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const setCurrentConversation = useTaskStore((s) => s.setCurrentConversation);
  const [search, setSearch] = useState("");

  const filtered = conversations.filter(
    (c) =>
      !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.preview.toLowerCase().includes(search.toLowerCase())
  );

  const handleNewChat = () => {
    setCurrentConversation(null);
    navigate("app");
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 0 : 280 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="hidden md:flex flex-col border-r border-border bg-sidebar overflow-hidden shrink-0"
    >
      <div className="w-[280px] flex flex-col h-full">
        {/* Header */}
        <div className="h-12 px-3 flex items-center justify-between border-b border-sidebar-border">
          <button
            onClick={() => navigate("app")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <LogoMark size={22} />
            <span className="font-medium text-sm">Agente</span>
          </button>
          <button
            onClick={toggleSidebar}
            className="size-7 rounded-md hover:bg-sidebar-accent flex items-center justify-center text-muted-foreground hover:text-sidebar-foreground transition-colors"
          >
            <PanelLeftClose className="size-3.5" />
          </button>
        </div>

        {/* New chat */}
        <div className="p-2">
          <Button
            onClick={handleNewChat}
            variant="default"
            className="w-full justify-start"
            size="sm"
          >
            <Plus className="size-4" />
            Nueva conversación
          </Button>
        </div>

        {/* Search */}
        <div className="px-2 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-sidebar-accent/50 border-sidebar-border"
            />
          </div>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto px-1.5 pb-2">
          {filtered.length === 0 ? (
            <div className="text-center py-8 px-3">
              <p className="text-xs text-muted-foreground">
                {search ? "Sin resultados" : "Sin conversaciones aún"}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              <AnimatePresence initial={false}>
                {filtered.map((conv) => {
                  const isActive = currentConversationId === conv.id;
                  return (
                    <motion.div
                      key={conv.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="group relative"
                    >
                      <button
                        onClick={() => selectConversation(conv.id)}
                        className={cn(
                          "w-full text-left px-2.5 py-2 rounded-md transition-colors",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-foreground"
                            : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <div className={cn("size-1.5 rounded-full mt-1.5 shrink-0", STATUS_DOT[conv.status])} />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium truncate">{conv.title}</div>
                            <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                              {conv.preview}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {conv.category && (
                                <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70">
                                  {CATEGORY_LABELS[conv.category]}
                                </span>
                              )}
                              <span className="text-[9px] text-muted-foreground/70">
                                {timeAgo(conv.updatedAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conv.id);
                        }}
                        className="absolute right-1.5 top-1.5 size-6 rounded hover:bg-destructive/10 hover:text-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-1.5 space-y-0.5">
          <button
            onClick={() => navigate("dashboard")}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <LayoutDashboard className="size-3.5" />
            Dashboard
          </button>
          <button
            onClick={() => navigate("history")}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <HistoryIcon className="size-3.5" />
            Historial
          </button>
          <button
            onClick={() => navigate("reports")}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <BarChart3 className="size-3.5" />
            Reportes
          </button>
          <button
            onClick={() => navigate("documentation")}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <BookOpen className="size-3.5" />
            Documentación
          </button>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
            {theme === "dark" ? "Modo claro" : "Modo oscuro"}
          </button>
          <button
            onClick={() => navigate("settings")}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <SettingsIcon className="size-3.5" />
            Configuración
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs hover:bg-sidebar-accent transition-colors">
                <div className="size-5 rounded-full bg-foreground text-background flex items-center justify-center text-[10px] font-semibold shrink-0">
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </div>
                <span className="truncate text-sidebar-foreground">{user?.name}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-48 mb-2">
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                {user?.email}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("settings")}>
                <SettingsIcon className="size-3.5 mr-2" />
                Configuración
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout} className="text-destructive">
                <LogOut className="size-3.5 mr-2" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.aside>
  );
}

export function SidebarReopenButton() {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggle = useAppStore((s) => s.toggleSidebar);

  if (!collapsed) return null;

  return (
    <button
      onClick={toggle}
      className="fixed top-3 left-3 size-8 rounded-md border border-border bg-background flex items-center justify-center hover:bg-muted transition-colors z-30"
    >
      <PanelLeft className="size-3.5" />
    </button>
  );
}

export function MobileSidebarTrigger() {
  const navigate = useAppStore((s) => s.navigate);
  const user = useAppStore((s) => s.user);
  const logout = useAppStore((s) => s.logout);
  const setCurrentConversation = useTaskStore((s) => s.setCurrentConversation);

  const handleNewChat = () => {
    setCurrentConversation(null);
    navigate("app");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="md:hidden size-8 rounded-md hover:bg-muted flex items-center justify-center">
          <MoreHorizontal className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          {user?.email}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleNewChat}>
          <Plus className="size-3.5 mr-2" />
          Nueva conversación
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("dashboard")}>
          <LayoutDashboard className="size-3.5 mr-2" />
          Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("history")}>
          <HistoryIcon className="size-3.5 mr-2" />
          Historial
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("settings")}>
          <SettingsIcon className="size-3.5 mr-2" />
          Configuración
        </DropdownMenuItem>
        <DropdownMenuItem onClick={logout} className="text-destructive">
          <LogOut className="size-3.5 mr-2" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
