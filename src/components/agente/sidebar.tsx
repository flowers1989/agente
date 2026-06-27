"use client";

import { useAppStore } from "@/lib/store";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ListTodo,
  History,
  BarChart3,
  Settings,
  BookOpen,
  Wrench,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { OPENCODE_MODELS } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  id: Parameters<ReturnType<typeof useAppStore.getState>["navigate"]>[0];
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "tasks", label: "Tareas", icon: ListTodo },
  { id: "history", label: "Historial", icon: History },
  { id: "reports", label: "Reportes", icon: BarChart3 },
  { id: "tools", label: "Herramientas", icon: Wrench },
  { id: "settings", label: "Configuración", icon: Settings },
  { id: "documentation", label: "Documentación", icon: BookOpen },
];

export function Sidebar() {
  const route = useAppStore((s) => s.route);
  const navigate = useAppStore((s) => s.navigate);
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggle = useAppStore((s) => s.toggleSidebar);
  const logout = useAppStore((s) => s.logout);
  const user = useAppStore((s) => s.user);
  const apiConfig = useAppStore((s) => s.apiConfig);

  const currentModel = OPENCODE_MODELS.find((m) => m.id === apiConfig?.selectedModel);

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="hidden md:flex flex-col border-r border-sidebar-border bg-sidebar sticky top-0 h-screen z-30"
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-sidebar-border">
        <Logo size={32} animated={route === "dashboard"} />
        {!collapsed && (
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold tracking-tight">Agente IA</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">OpenCode Go</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = route === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative group",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="size-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {isActive && !collapsed && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Model indicator */}
      {!collapsed && currentModel && (
        <div className="mx-3 mb-3 p-3 rounded-lg bg-sidebar-accent/50 border border-sidebar-border">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
            <Sparkles className="size-3" />
            Modelo activo
          </div>
          <div className="text-sm font-semibold">{currentModel.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{currentModel.specialty}</div>
        </div>
      )}

      {/* User */}
      <div className="border-t border-sidebar-border p-2">
        <div className={cn("flex items-center gap-2.5 p-2 rounded-lg hover:bg-sidebar-accent transition-colors", collapsed && "justify-center")}>
          <div className="size-8 rounded-full bg-gradient-to-br from-primary to-accent-foreground flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.name}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 mt-1">
          {!collapsed && (
            <button
              onClick={logout}
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
            >
              <LogOut className="size-4" />
              Cerrar sesión
            </button>
          )}
          {collapsed && (
            <button
              onClick={logout}
              className="w-full flex items-center justify-center px-3 py-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggle}
        className="absolute -right-3 top-20 size-6 rounded-full bg-background border border-border shadow-sm flex items-center justify-center hover:scale-110 transition-transform z-10"
      >
        {collapsed ? <ChevronRight className="size-3" /> : <ChevronLeft className="size-3" />}
      </button>
    </motion.aside>
  );
}

export function MobileNav() {
  const route = useAppStore((s) => s.route);
  const navigate = useAppStore((s) => s.navigate);

  const items = NAV_ITEMS.filter((i) => ["dashboard", "tasks", "history", "settings"].includes(i.id));

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border">
      <div className="grid grid-cols-4 h-16">
        {items.map((item) => {
          const isActive = route === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="size-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
