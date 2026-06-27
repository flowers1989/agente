"use client";

import { useAppStore } from "@/lib/store";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  Menu,
  Moon,
  Sun,
  User,
  Settings as SettingsIcon,
  LogOut,
  Plus,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { OPENCODE_MODELS } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  ListTodo,
  History,
  BarChart3,
  Settings,
  BookOpen,
  Wrench,
} from "lucide-react";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showNewTask?: boolean;
}

export function Header({ title, subtitle, showNewTask = true }: HeaderProps) {
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const user = useAppStore((s) => s.user);
  const logout = useAppStore((s) => s.logout);
  const navigate = useAppStore((s) => s.navigate);
  const apiConfig = useAppStore((s) => s.apiConfig);
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentModel = OPENCODE_MODELS.find((m) => m.id === apiConfig?.selectedModel);

  const mobileNavItems = [
    { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
    { id: "tasks" as const, label: "Tareas", icon: ListTodo },
    { id: "history" as const, label: "Historial", icon: History },
    { id: "reports" as const, label: "Reportes", icon: BarChart3 },
    { id: "tools" as const, label: "Herramientas", icon: Wrench },
    { id: "settings" as const, label: "Configuración", icon: Settings },
    { id: "documentation" as const, label: "Docs", icon: BookOpen },
  ];

  return (
    <header className="sticky top-0 z-20 h-16 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="h-full px-4 md:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <div className="flex items-center gap-2.5 h-16 px-4 border-b border-border">
                <Logo size={32} />
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-bold">Agente IA</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">OpenCode Go</span>
                </div>
              </div>
              <nav className="p-3 space-y-1">
                {mobileNavItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      navigate(item.id);
                      setMobileOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-accent transition-colors"
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </button>
                ))}
                <div className="border-t border-border my-2" />
                <button
                  onClick={() => {
                    logout();
                    setMobileOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
                >
                  <LogOut className="size-4" />
                  Cerrar sesión
                </button>
              </nav>
            </SheetContent>
          </Sheet>

          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight truncate">{title}</h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate hidden sm:block">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Model badge */}
          {currentModel && (
            <Badge variant="outline" className="hidden lg:flex items-center gap-1.5 py-1.5">
              <Zap className="size-3 text-primary" />
              {currentModel.name}
            </Badge>
          )}

          {/* New task button */}
          {showNewTask && (
            <Button
              onClick={() => navigate("tasks")}
              size="sm"
              className="hidden sm:flex"
            >
              <Plus className="size-4" />
              Nueva Tarea
            </Button>
          )}

          {/* Theme toggle */}
          <Button variant="ghost" size="icon" onClick={toggleTheme} title="Cambiar tema">
            <AnimatePresence mode="wait" initial={false}>
              {theme === "dark" ? (
                <motion.div
                  key="sun"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Sun className="size-5" />
                </motion.div>
              ) : (
                <motion.div
                  key="moon"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Moon className="size-5" />
                </motion.div>
              )}
            </AnimatePresence>
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative" title="Notificaciones">
            <Bell className="size-5" />
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary pulse-glow" />
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="size-9 rounded-full bg-gradient-to-br from-primary to-accent-foreground flex items-center justify-center text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{user?.name}</span>
                  <span className="text-xs text-muted-foreground font-normal">{user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("settings")}>
                <User className="size-4 mr-2" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("settings")}>
                <SettingsIcon className="size-4 mr-2" />
                Configuración
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive">
                <LogOut className="size-4 mr-2" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
