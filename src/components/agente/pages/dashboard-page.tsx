"use client";

import { useAppStore } from "@/lib/store";
import { MainLayout } from "@/components/agente/main-layout";
import { StatCard } from "@/components/agente/stat-card";
import { TaskCard } from "@/components/agente/task-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  TrendingUp,
  Clock,
  Zap,
  Plus,
  Activity,
  DollarSign,
  Cpu,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  DASHBOARD_STATS,
  ACTIVITY_DATA,
  TOOL_USAGE,
  MODEL_USAGE,
  formatDuration,
  formatNumber,
  formatCost,
} from "@/lib/mock-data";
import { motion } from "framer-motion";

export function DashboardPage() {
  const navigate = useAppStore((s) => s.navigate);
  const tasks = useAppStore((s) => s.tasks);
  const user = useAppStore((s) => s.user);

  const recentTasks = tasks.slice(0, 6);

  return (
    <MainLayout title={`Hola, ${user?.name?.split(" ")[0] || "Usuario"}`} subtitle="Resumen de tu actividad reciente">
      <div className="space-y-6">
        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Tareas ejecutadas"
            value={DASHBOARD_STATS.totalTasks}
            icon={CheckCircle2}
            trend={12}
            trendLabel="vs mes anterior"
            color="emerald"
            delay={0}
          />
          <StatCard
            title="Tasa de éxito"
            value={`${DASHBOARD_STATS.successRate}%`}
            icon={TrendingUp}
            trend={5}
            color="primary"
            delay={0.1}
          />
          <StatCard
            title="Tiempo total"
            value={formatDuration(DASHBOARD_STATS.totalTime)}
            icon={Clock}
            color="amber"
            delay={0.2}
          />
          <StatCard
            title="Tokens usados"
            value={formatNumber(DASHBOARD_STATS.totalTokens)}
            icon={Zap}
            trend={23}
            color="violet"
            delay={0.3}
          />
        </div>

        {/* Quick actions */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-5 col-span-1 md:col-span-2 bg-gradient-to-br from-primary/5 via-transparent to-emerald-500/5 border-primary/20">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Badge variant="outline" className="mb-2 bg-primary/10">
                  <Sparkles className="size-3 mr-1 text-primary" />
                  Acción rápida
                </Badge>
                <h3 className="text-lg font-semibold mb-1">Crea una nueva tarea</h3>
                <p className="text-sm text-muted-foreground">
                  Describe tu objetivo y deja que el agente haga el resto
                </p>
              </div>
              <Button size="lg" onClick={() => navigate("tasks")}>
                <Plus className="size-4" />
                Nueva Tarea
              </Button>
            </div>
          </Card>

          <Card className="p-5 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Costo total</div>
              <div className="text-2xl font-bold">{formatCost(DASHBOARD_STATS.totalCost)}</div>
              <div className="text-xs text-muted-foreground mt-1">de $10/mes · {Math.round((DASHBOARD_STATS.totalCost / 10) * 100)}% usado</div>
            </div>
            <div className="size-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <DollarSign className="size-6 text-amber-500" />
            </div>
          </Card>
        </div>

        {/* Activity chart + Model usage */}
        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">Actividad</h3>
                <p className="text-xs text-muted-foreground">Tareas ejecutadas en los últimos 7 días</p>
              </div>
              <Badge variant="outline" className="gap-1">
                <Activity className="size-3" />
                Últimos 7 días
              </Badge>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={ACTIVITY_DATA}>
                <defs>
                  <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.72 0.17 165)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="oklch(0.72 0.17 165)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.78 0.17 70)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="oklch(0.78 0.17 70)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                />
                <Area type="monotone" dataKey="tasks" stroke="oklch(0.72 0.17 165)" fill="url(#colorTasks)" name="Tareas" strokeWidth={2} />
                <Area type="monotone" dataKey="tokens" stroke="oklch(0.78 0.17 70)" fill="url(#colorTokens)" name="Tokens" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold mb-1">Uso de modelos</h3>
            <p className="text-xs text-muted-foreground mb-4">Distribución por modelo</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={MODEL_USAGE}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={45}
                  paddingAngle={2}
                >
                  {MODEL_USAGE.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {MODEL_USAGE.slice(0, 4).map((m) => (
                <div key={m.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full" style={{ background: m.color }} />
                    <span>{m.name}</span>
                  </div>
                  <span className="font-mono text-muted-foreground">{m.value}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Recent tasks + Tool usage */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Tareas recientes</h3>
              <Button variant="ghost" size="sm" onClick={() => navigate("history")}>
                Ver todas
                <ArrowRight className="size-3" />
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {recentTasks.map((task, i) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Herramientas más usadas</h3>
            <Card className="p-4">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={TOOL_USAGE.slice(0, 6)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={10} />
                  <YAxis type="category" dataKey="tool" stroke="var(--muted-foreground)" fontSize={10} width={100} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "0.5rem",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" fill="oklch(0.72 0.17 165)" radius={[0, 4, 4, 0]} name="Usos" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </div>

        {/* Empty hint */}
        {tasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-12 text-center">
              <div className="size-16 rounded-2xl bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                <Cpu className="size-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Aún no tienes tareas</h3>
              <p className="text-sm text-muted-foreground mb-4">Crea tu primera tarea y deja que el agente trabaje por ti</p>
              <Button onClick={() => navigate("tasks")}>
                <Plus className="size-4" />
                Crear primera tarea
              </Button>
            </Card>
          </motion.div>
        )}
      </div>
    </MainLayout>
  );
}
