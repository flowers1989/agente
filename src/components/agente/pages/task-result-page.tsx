"use client";

import { useAppStore } from "@/lib/store";
import { MainLayout } from "@/components/agente/main-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Download,
  Share2,
  Repeat2,
  Clock,
  Cpu,
  Coins,
  FileText,
  AlertCircle,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { OPENCODE_MODELS, formatDuration, formatNumber, formatCost, timeAgo } from "@/lib/mock-data";
import { motion } from "framer-motion";
import { toast } from "sonner";

export function TaskResultPage() {
  const routeParams = useAppStore((s) => s.routeParams);
  const tasks = useAppStore((s) => s.tasks);
  const navigate = useAppStore((s) => s.navigate);
  const startExecution = useAppStore((s) => s.startExecution);
  const execution = useAppStore((s) => s.execution);

  const task = tasks.find((t) => t.id === routeParams.id);

  if (!task) {
    return (
      <MainLayout title="Resultado">
        <Card className="p-12 text-center">
          <AlertCircle className="size-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-1">Tarea no encontrada</h3>
          <Button onClick={() => navigate("tasks")}>Ver tareas</Button>
        </Card>
      </MainLayout>
    );
  }

  const model = OPENCODE_MODELS.find((m) => m.id === task.modelUsed);
  const isCompleted = task.status === "completed";
  const isFailed = task.status === "failed";
  const exec = execution?.taskId === task.id ? execution : null;

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success("Enlace copiado al portapapeles");
  };

  const handleDownload = () => {
    const content = `# ${task.name}\n\n## Objetivo\n${task.objective}\n\n## Resultado\n${task.result || task.error}\n\n## Metadata\n- Modelo: ${model?.name}\n- Creada: ${task.createdAt}\n- Completada: ${task.completedAt}\n`;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${task.name.replace(/\s/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Resultado descargado");
  };

  return (
    <MainLayout title="Resultado" subtitle={task.name} showNewTask={false}>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => navigate("tasks")}>
          <ArrowLeft className="size-4" />
          Volver a tareas
        </Button>

        {/* Status hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className={`p-8 relative overflow-hidden ${
            isCompleted ? "border-emerald-500/30" : isFailed ? "border-destructive/30" : ""
          }`}>
            <div className={`absolute inset-0 ${
              isCompleted ? "bg-gradient-to-br from-emerald-500/10 to-transparent" :
              isFailed ? "bg-gradient-to-br from-destructive/10 to-transparent" : ""
            }`} />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className={`size-16 rounded-2xl flex items-center justify-center shrink-0 ${
                  isCompleted ? "bg-emerald-500/20" : isFailed ? "bg-destructive/20" : "bg-muted"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="size-9 text-emerald-500" />
                ) : (
                  <AlertCircle className="size-9 text-destructive" />
                )}
              </motion.div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={isCompleted ? "default" : "destructive"} className={isCompleted ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : ""}>
                    {isCompleted ? "Completada" : "Fallida"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{timeAgo(task.completedAt || task.createdAt)}</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight mb-1">{task.name}</h1>
                <p className="text-sm text-muted-foreground">{task.description}</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleShare}>
                  <Share2 className="size-4" />
                  Compartir
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="size-4" />
                  Descargar
                </Button>
                <Button size="sm" onClick={() => startExecution(task.id)}>
                  <Repeat2 className="size-4" />
                  Repetir
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Metrics */}
        {exec && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Tiempo total", value: formatDuration(Math.floor((new Date(exec.completedAt || Date.now()).getTime() - new Date(exec.startedAt).getTime()) / 1000)), icon: Clock },
              { label: "Tokens usados", value: formatNumber(exec.tokensUsed), icon: Cpu },
              { label: "Costo real", value: formatCost(exec.actualCost), icon: Coins },
              { label: "Pasos completados", value: `${exec.plan.steps.filter(s => s.status === "completed").length}/${exec.plan.steps.length}`, icon: FileText },
            ].map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                <Card className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
                    <m.icon className="size-3.5" />
                    <span className="text-[10px] uppercase tracking-wider font-medium">{m.label}</span>
                  </div>
                  <div className="text-lg font-bold">{m.value}</div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Result content */}
        <Card className="p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            {isCompleted ? "Resultado de la ejecución" : "Detalle del error"}
          </h3>
          <div className={`prose prose-sm dark:prose-invert max-w-none p-4 rounded-lg ${
            isCompleted ? "bg-emerald-500/5 border border-emerald-500/20" : "bg-destructive/5 border border-destructive/20"
          }`}>
            <p className="text-sm leading-relaxed m-0">
              {isCompleted ? task.result : task.error}
            </p>
          </div>
        </Card>

        {/* Objective & metadata */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-3">Objetivo original</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{task.objective}</p>
          </Card>

          <Card className="p-6 space-y-3">
            <h3 className="font-semibold">Metadata</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Modelo</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {model?.name || task.modelUsed}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Creada</span>
                <span className="font-mono text-xs">{new Date(task.createdAt).toLocaleString("es-ES")}</span>
              </div>
              {task.completedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Completada</span>
                  <span className="font-mono text-xs">{new Date(task.completedAt).toLocaleString("es-ES")}</span>
                </div>
              )}
              {task.selectedTools && task.selectedTools.length > 0 && (
                <div>
                  <div className="text-muted-foreground mb-1.5">Herramientas ({task.selectedTools.length})</div>
                  <div className="flex flex-wrap gap-1">
                    {task.selectedTools.map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px] font-mono">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {task.tags && task.tags.length > 0 && (
                <div>
                  <div className="text-muted-foreground mb-1.5">Tags</div>
                  <div className="flex flex-wrap gap-1">
                    {task.tags.map((t) => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Steps recap */}
        {exec && (
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Pasos ejecutados</h3>
            <div className="space-y-2">
              {exec.plan.steps.map((step, i) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                >
                  <div className={`size-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    step.status === "completed" ? "bg-emerald-500/20 text-emerald-500" :
                    step.status === "failed" ? "bg-destructive/20 text-destructive" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {step.status === "completed" ? "✓" : step.stepNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{step.description}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] font-mono py-0">
                        {step.toolName}
                      </Badge>
                      {step.duration && (
                        <span className="text-[10px] text-muted-foreground">{step.duration}s</span>
                      )}
                    </div>
                    {step.result && (
                      <p className="text-xs text-muted-foreground mt-1.5">{step.result}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 justify-center pt-2">
          <Button variant="outline" onClick={() => navigate("history")}>
            Ver historial
          </Button>
          <Button variant="outline" onClick={() => navigate("reports")}>
            <ExternalLink className="size-4" />
            Ver en reportes
          </Button>
          <Button onClick={() => startExecution(task.id)}>
            <Repeat2 className="size-4" />
            Repetir ejecución
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
