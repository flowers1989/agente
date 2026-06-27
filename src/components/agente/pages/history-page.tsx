"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store-app";
import { useTaskStore } from "@/lib/store-task";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LogoMark } from "@/components/agente/logo";
import {
  ArrowLeft,
  Search,
  Trash2,
  MessageSquare,
  Download,
  Clock,
  TrendingUp,
  DollarSign,
  Zap,
} from "lucide-react";
import { timeAgo, formatNumber, formatCost } from "@/lib/mock-data";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTask } from "@/hooks/use-task";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "Activa", color: "text-foreground" },
  completed: { label: "Completada", color: "text-muted-foreground" },
  failed: { label: "Fallida", color: "text-destructive" },
  archived: { label: "Archivada", color: "text-muted-foreground/60" },
};

const CATEGORY_LABELS: Record<string, string> = {
  research: "Investigación",
  code: "Código",
  data: "Datos",
  automation: "Automatización",
  content: "Contenido",
  general: "General",
};

export function HistoryPage() {
  const conversations = useTaskStore((s) => s.conversations);
  const navigate = useAppStore((s) => s.navigate);
  const { selectConversation, deleteConversation } = useTask();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = conversations.filter((c) => {
    const matchSearch =
      !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.preview.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalTokens = conversations.reduce((acc, c) => acc + c.tokensUsed, 0);
  const totalCost = conversations.reduce((acc, c) => acc + c.cost, 0);
  const successRate =
    conversations.length > 0
      ? Math.round((conversations.filter((c) => c.status === "completed").length / conversations.length) * 100)
      : 0;

  const handleExport = () => {
    const data = conversations.map((c) => ({
      title: c.title,
      status: c.status,
      created: c.createdAt,
      updated: c.updatedAt,
      model: c.modelUsed,
      tokens: c.tokensUsed,
      cost: c.cost,
      category: c.category,
      preview: c.preview,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historial-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Historial exportado");
  };

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate("app")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Volver
        </button>
        <div className="flex items-center gap-2">
          <LogoMark size={22} />
          <span className="text-sm font-medium">Agente</span>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Historial</h1>
        <p className="text-sm text-muted-foreground mb-8">Todas tus conversaciones con el agente.</p>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          {[
            { label: "Conversaciones", value: conversations.length.toString(), icon: MessageSquare },
            { label: "Tokens totales", value: formatNumber(totalTokens), icon: Zap },
            { label: "Costo total", value: formatCost(totalCost), icon: DollarSign },
            { label: "Tasa de éxito", value: `${successRate}%`, icon: TrendingUp },
          ].map((stat) => (
            <Card key={stat.label} className="p-3">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                <stat.icon className="size-2.5" />
                {stat.label}
              </div>
              <div className="text-base font-semibold">{stat.value}</div>
            </Card>
          ))}
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversaciones..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1">
            {[
              { value: "all", label: "Todas" },
              { value: "active", label: "Activas" },
              { value: "completed", label: "Completadas" },
              { value: "failed", label: "Fallidas" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                  statusFilter === f.value
                    ? "bg-foreground text-background border-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={handleExport} disabled={conversations.length === 0}>
            <Download className="size-4" />
            Exportar
          </Button>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <MessageSquare className="size-8 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {search || statusFilter !== "all" ? "Sin resultados" : "Sin conversaciones aún"}
            </p>
          </Card>
        ) : (
          <div className="space-y-1">
            {filtered.map((conv) => {
              const status = STATUS_LABELS[conv.status];
              return (
                <motion.div
                  key={conv.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="group flex items-center gap-3 p-3 rounded-lg border border-border hover:border-foreground/20 transition-colors cursor-pointer"
                  onClick={() => selectConversation(conv.id)}
                >
                  <div className="size-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <MessageSquare className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{conv.title}</span>
                      <span className={cn("text-[10px] shrink-0", status.color)}>{status.label}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                      {conv.category && <span>{CATEGORY_LABELS[conv.category]}</span>}
                      <span className="flex items-center gap-0.5">
                        <Clock className="size-2.5" />
                        {timeAgo(conv.updatedAt)}
                      </span>
                      <span className="font-mono">{conv.modelUsed}</span>
                      <span>{formatNumber(conv.tokensUsed)} tokens</span>
                      <span>{formatCost(conv.cost)}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    className="size-7 rounded-md hover:bg-destructive/10 hover:text-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground shrink-0"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
