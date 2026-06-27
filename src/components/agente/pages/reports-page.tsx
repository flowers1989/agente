"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { MainLayout } from "@/components/agente/main-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
  Legend,
} from "recharts";
import {
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  Cpu,
  Clock,
  CheckCircle2,
  FileText,
  FileSpreadsheet,
  FileType,
} from "lucide-react";
import { ACTIVITY_DATA, TOOL_USAGE, MODEL_USAGE, DASHBOARD_STATS, formatCost, formatNumber, formatDuration } from "@/lib/mock-data";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const RANGES = [
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "90d", label: "90 días" },
  { value: "1y", label: "1 año" },
];

const COST_DATA = ACTIVITY_DATA.map((d) => ({ ...d, cumulative: 0 }));
let acc = 0;
COST_DATA.forEach((d) => {
  acc += d.cost;
  d.cumulative = parseFloat(acc.toFixed(2));
});

export function ReportsPage() {
  const [range, setRange] = useState("7d");

  const handleExport = (format: string) => {
    toast.success(`Reporte exportado como ${format.toUpperCase()}`);
  };

  return (
    <MainLayout title="Reportes" subtitle="Analiza el rendimiento y uso del agente">
      <div className="space-y-6">
        {/* Header actions */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-muted-foreground" />
            <div className="flex bg-muted rounded-lg p-1">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded transition-colors",
                    range === r.value
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport("pdf")}>
              <FileText className="size-4" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport("xlsx")}>
              <FileSpreadsheet className="size-4" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
              <FileType className="size-4" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport("json")}>
              <Download className="size-4" />
              JSON
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total tareas", value: DASHBOARD_STATS.totalTasks.toString(), trend: "+12%", icon: CheckCircle2, color: "text-emerald-500" },
            { label: "Tasa de éxito", value: `${DASHBOARD_STATS.successRate}%`, trend: "+5%", icon: TrendingUp, color: "text-primary" },
            { label: "Costo total", value: formatCost(DASHBOARD_STATS.totalCost), trend: "+23%", icon: DollarSign, color: "text-amber-500" },
            { label: "Tiempo total", value: formatDuration(DASHBOARD_STATS.totalTime), trend: "-8%", icon: Clock, color: "text-violet-500" },
          ].map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <kpi.icon className={cn("size-5", kpi.color)} />
                  <span className={cn(
                    "text-xs font-medium",
                    kpi.trend.startsWith("+") ? "text-emerald-500" : "text-destructive"
                  )}>
                    {kpi.trend}
                  </span>
                </div>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{kpi.label}</div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Activity chart */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Tareas y tokens por día</h3>
              <p className="text-xs text-muted-foreground">Evolución del uso en el período seleccionado</p>
            </div>
            <Badge variant="outline">
              <TrendingUp className="size-3 mr-1" />
              +18% vs período anterior
            </Badge>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={ACTIVITY_DATA}>
              <defs>
                <linearGradient id="rTasks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.72 0.17 165)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="oklch(0.72 0.17 165)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="rTokens" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.78 0.17 70)" stopOpacity={0.4} />
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
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Area type="monotone" dataKey="tasks" stroke="oklch(0.72 0.17 165)" fill="url(#rTasks)" name="Tareas" strokeWidth={2} />
              <Area type="monotone" dataKey="tokens" stroke="oklch(0.78 0.17 70)" fill="url(#rTokens)" name="Tokens" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Cost cumulative + Model distribution */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <h3 className="font-semibold mb-1">Costo acumulado</h3>
            <p className="text-xs text-muted-foreground mb-4">Gasto en OpenCode Go durante el período</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={COST_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                  formatter={(v: number) => [`$${v.toFixed(2)}`, "Costo acumulado"]}
                />
                <Line type="monotone" dataKey="cumulative" stroke="oklch(0.78 0.17 70)" strokeWidth={3} dot={{ r: 4, fill: "oklch(0.78 0.17 70)" }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Total acumulado</div>
                <div className="text-xl font-bold">{formatCost(COST_DATA[COST_DATA.length - 1].cumulative)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Límite mensual</div>
                <div className="text-sm font-medium">$10.00</div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold mb-1">Distribución por modelo</h3>
            <p className="text-xs text-muted-foreground mb-4">Cuál modelo se ha usado más</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={MODEL_USAGE}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={50}
                  paddingAngle={2}
                  label={({ value }) => `${value}%`}
                  labelLine={false}
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
            <div className="space-y-1.5 mt-3">
              {MODEL_USAGE.map((m) => (
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

        {/* Tool usage bar */}
        <Card className="p-5">
          <h3 className="font-semibold mb-1">Uso de herramientas</h3>
          <p className="text-xs text-muted-foreground mb-4">Top herramientas por número de usos y tasa de éxito</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={TOOL_USAGE} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis type="category" dataKey="tool" stroke="var(--muted-foreground)" fontSize={10} width={120} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar dataKey="count" fill="oklch(0.72 0.17 165)" radius={[0, 4, 4, 0]} name="Usos" />
              <Bar dataKey="successRate" fill="oklch(0.78 0.17 70)" radius={[0, 4, 4, 0]} name="% Éxito" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Insights */}
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-emerald-500/5 border-primary/20">
          <div className="flex items-start gap-4">
            <div className="size-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Cpu className="size-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-2">Insights del período</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">●</span>
                  Tu modelo más rentable es <strong className="text-foreground">MiniMax M3</strong> con 95% de éxito a $0.10/M tokens
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">●</span>
                  Las tareas de <strong className="text-foreground">scraping</strong> representan el 42% de tu uso total
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">●</span>
                  Reduciste el costo por tarea en <strong className="text-emerald-500">8%</strong> vs mes anterior
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">●</span>
                  Tu tasa de éxito promedio (<strong className="text-foreground">83%</strong>) supera la media de usuarios (78%)
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
