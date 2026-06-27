"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store-app";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogoMark } from "@/components/agente/logo";
import {
  ArrowLeft,
  Calendar,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle2,
  FileText,
  FileSpreadsheet,
  FileType,
  Download,
  Cpu,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Area,
  AreaChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  ACTIVITY_DATA,
  TOOL_USAGE,
  MODEL_USAGE,
  DASHBOARD_STATS,
  formatCost,
  formatNumber,
  formatDuration,
} from "@/lib/mock-data";
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
  const navigate = useAppStore((s) => s.navigate);
  const [range, setRange] = useState("7d");

  const handleExport = (format: string) => {
    toast.success(`Reporte exportado como ${format.toUpperCase()}`);
  };

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-6 py-8">
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
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight mb-1">Reportes</h1>
            <p className="text-sm text-muted-foreground">Analiza el rendimiento del agente</p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-muted-foreground" />
            <div className="flex bg-muted rounded-md p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded transition-colors",
                    range === r.value ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total tareas", value: DASHBOARD_STATS.totalTasks.toString(), trend: "+12%", icon: CheckCircle2, color: "text-emerald-500" },
            { label: "Tasa de éxito", value: `${DASHBOARD_STATS.successRate}%`, trend: "+5%", icon: TrendingUp, color: "text-foreground" },
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
                  <kpi.icon className={cn("size-4", kpi.color)} />
                  <span className={cn("text-[10px] font-medium", kpi.trend.startsWith("+") ? "text-emerald-500" : "text-destructive")}>
                    {kpi.trend}
                  </span>
                </div>
                <div className="text-xl font-bold">{kpi.value}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{kpi.label}</div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Activity chart */}
        <Card className="p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-medium text-sm">Tareas y tokens por día</h3>
              <p className="text-[10px] text-muted-foreground">Evolución del uso</p>
            </div>
            <Badge variant="outline" className="text-[10px]">
              <TrendingUp className="size-2.5 mr-1" />
              +18% vs período anterior
            </Badge>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={ACTIVITY_DATA}>
              <defs>
                <linearGradient id="rTasks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.7 0.12 250)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="oklch(0.7 0.12 250)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="rTokens" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.72 0.15 70)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="oklch(0.72 0.15 70)" stopOpacity={0} />
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
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Area type="monotone" dataKey="tasks" stroke="oklch(0.7 0.12 250)" fill="url(#rTasks)" name="Tareas" strokeWidth={2} />
              <Area type="monotone" dataKey="tokens" stroke="oklch(0.72 0.15 70)" fill="url(#rTokens)" name="Tokens" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Cost + Model usage */}
        <div className="grid lg:grid-cols-2 gap-3 mb-4">
          <Card className="p-5">
            <h3 className="font-medium text-sm mb-1">Costo acumulado</h3>
            <p className="text-[10px] text-muted-foreground mb-3">Gasto durante el período</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={COST_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={10} />
                <YAxis stroke="var(--muted-foreground)" fontSize={10} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                    fontSize: "11px",
                  }}
                  formatter={(v: number) => [`$${v.toFixed(2)}`, "Costo"]}
                />
                <Line type="monotone" dataKey="cumulative" stroke="oklch(0.72 0.15 70)" strokeWidth={2.5} dot={{ r: 3, fill: "oklch(0.72 0.15 70)" }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-3 p-2.5 rounded-md bg-muted/30 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-muted-foreground">Total acumulado</div>
                <div className="text-base font-bold">{formatCost(COST_DATA[COST_DATA.length - 1].cumulative)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground">Límite</div>
                <div className="text-xs font-medium">$10.00</div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-medium text-sm mb-1">Distribución por modelo</h3>
            <p className="text-[10px] text-muted-foreground mb-3">Cuál modelo se ha usado más</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={MODEL_USAGE} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={2} label={({ value }) => `${value}%`} labelLine={false}>
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
              {MODEL_USAGE.map((m) => (
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

        {/* Tool usage */}
        <Card className="p-5 mb-4">
          <h3 className="font-medium text-sm mb-1">Uso de herramientas</h3>
          <p className="text-[10px] text-muted-foreground mb-3">Top herramientas por número de usos</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={TOOL_USAGE} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" stroke="var(--muted-foreground)" fontSize={10} />
              <YAxis type="category" dataKey="tool" stroke="var(--muted-foreground)" fontSize={10} width={110} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                  fontSize: "11px",
                }}
              />
              <Bar dataKey="count" fill="oklch(0.7 0.12 250)" radius={[0, 4, 4, 0]} name="Usos" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Insights */}
        <Card className="p-5 bg-gradient-to-br from-foreground/5 to-transparent border-foreground/20">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-lg bg-foreground/10 flex items-center justify-center shrink-0">
              <Cpu className="size-4" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-sm mb-2">Insights del período</h3>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-foreground">●</span>
                  Tu modelo más rentable es <strong className="text-foreground">MiniMax M3</strong> con 95% de éxito a $0.10/M
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-foreground">●</span>
                  Las tareas de <strong className="text-foreground">scraping</strong> representan el 42% de tu uso
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-foreground">●</span>
                  Reduciste el costo por tarea en <strong className="text-emerald-500">8%</strong> vs mes anterior
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-foreground">●</span>
                  Tu tasa de éxito (<strong className="text-foreground">83%</strong>) supera la media (78%)
                </li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Export */}
        <div className="flex flex-wrap gap-2 justify-center mt-6">
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
      </motion.div>
    </div>
  );
}
