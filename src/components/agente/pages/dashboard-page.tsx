"use client";

import { useAppStore } from "@/lib/store-app";
import { useTaskStore } from "@/lib/store-task";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogoMark } from "@/components/agente/logo";
import {
  ArrowLeft,
  Plus,
  TrendingUp,
  Clock,
  Zap,
  DollarSign,
  CheckCircle2,
  ArrowRight,
  Activity,
} from "lucide-react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  DASHBOARD_STATS,
  ACTIVITY_DATA,
  MODEL_USAGE,
  formatDuration,
  formatNumber,
  formatCost,
  timeAgo,
} from "@/lib/mock-data";
import { motion } from "framer-motion";
import { useState } from "react";
import { useTask } from "@/hooks/use-task";

const CATEGORY_LABELS: Record<string, string> = {
  research: "Investigación",
  code: "Código",
  data: "Datos",
  automation: "Automatización",
  content: "Contenido",
  general: "General",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "Activa", color: "text-foreground" },
  completed: { label: "Completada", color: "text-muted-foreground" },
  failed: { label: "Fallida", color: "text-destructive" },
  archived: { label: "Archivada", color: "text-muted-foreground/60" },
};

export function DashboardPage() {
  const navigate = useAppStore((s) => s.navigate);
  const user = useAppStore((s) => s.user);
  const conversations = useTaskStore((s) => s.conversations);
  const { selectConversation } = useTask();

  const recentConversations = conversations.slice(0, 5);

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate("app")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Volver a la app
        </button>
        <div className="flex items-center gap-2">
          <LogoMark size={22} />
          <span className="text-sm font-medium">Agente</span>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-semibold tracking-tight mb-1">
          Hola{user?.name ? `, ${user.name.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Aquí está el resumen de tu actividad reciente.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Tareas totales", value: DASHBOARD_STATS.totalTasks.toString(), icon: CheckCircle2, trend: "+12%" },
            { label: "Tasa de éxito", value: `${DASHBOARD_STATS.successRate}%`, icon: TrendingUp, trend: "+5%" },
            { label: "Tokens usados", value: formatNumber(DASHBOARD_STATS.totalTokens), icon: Zap, trend: "+23%" },
            { label: "Costo total", value: formatCost(DASHBOARD_STATS.totalCost), icon: DollarSign, trend: "+8%" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="p-4 border-border hover:border-manus-primary/40 hover:shadow-glow-violet transition-all">
                <div className="flex items-start justify-between mb-2">
                  <stat.icon className="size-4 text-manus-primary" />
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-manus-success/20 text-manus-success">{stat.trend}</span>
                </div>
                <div className="text-xl font-semibold text-gradient-manus">{stat.value}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-3 gap-3 mb-8">
          <Card className="p-5 lg:col-span-2 border-border hover:border-manus-secondary/40 hover:shadow-glow-blue transition-all">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium text-sm text-gradient-manus-to-right">Actividad</h3>
                <p className="text-[10px] text-muted-foreground">Tareas y tokens por día</p>
              </div>
              <Badge variant="outline" className="text-[10px] bg-manus-secondary/10 border-manus-secondary/30 text-manus-secondary">
                <Activity className="size-2.5 mr-1" />
                Últimos 7 días
              </Badge>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={ACTIVITY_DATA}>
                <defs>
                  <linearGradient id="dTasks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.7 0.12 250)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.7 0.12 250)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={10} />
                <YAxis stroke="var(--muted-foreground)" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                    fontSize: "11px",
                  }}
                />
                <Area type="monotone" dataKey="tasks" stroke="oklch(0.7 0.12 250)" fill="url(#dTasks)" name="Tareas" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-5 border-border hover:border-manus-primary/40 hover:shadow-glow-violet transition-all">
            <h3 className="font-medium text-sm mb-1 text-gradient-manus">Uso de modelos</h3>
            <p className="text-[10px] text-muted-foreground mb-4">Distribución</p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={MODEL_USAGE} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={40} paddingAngle={2}>
                  {MODEL_USAGE.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                    fontSize: "11px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-2">
              {MODEL_USAGE.slice(0, 3).map((m) => (
                <div key={m.name} className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <div className="size-1.5 rounded-full" style={{ background: m.color }} />
                    <span>{m.name}</span>
                  </div>
                  <span className="font-mono text-muted-foreground">{m.value}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Recent conversations */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-sm">Conversaciones recientes</h3>
          <Button variant="ghost" size="sm" onClick={() => navigate("history")}>
            Ver todas
            <ArrowRight className="size-3" />
          </Button>
        </div>

        {recentConversations.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">Sin conversaciones aún</p>
            <Button onClick={() => navigate("app")}>
              <Plus className="size-4" />
              Crear primera conversación
            </Button>
          </Card>
        ) : (
          <div className="space-y-1">
            {recentConversations.map((conv, i) => {
              const status = STATUS_LABELS[conv.status];
              return (
                <motion.div
                  key={conv.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card
                    className="p-3 hover:border-foreground/20 transition-colors cursor-pointer flex items-center gap-3"
                    onClick={() => selectConversation(conv.id)}
                  >
                    <div className="size-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {conv.category ? CATEGORY_LABELS[conv.category]?.[0] : "G"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{conv.title}</span>
                        <span className={`text-[10px] shrink-0 ${status.color}`}>{status.label}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                        {conv.category && <span>{CATEGORY_LABELS[conv.category]}</span>}
                        <span className="flex items-center gap-0.5">
                          <Clock className="size-2.5" />
                          {timeAgo(conv.updatedAt)}
                        </span>
                        <span>{formatNumber(conv.tokensUsed)} tokens</span>
                        <span>{formatCost(conv.cost)}</span>
                      </div>
                    </div>
                    <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
