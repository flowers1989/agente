"use client";

import { useAppStore } from "@/lib/store";
import { MainLayout } from "@/components/agente/main-layout";
import { PlanVisualizer } from "@/components/agente/plan-visualizer";
import { ExecutionPanel } from "@/components/agente/execution-panel";
import { ContextPanel } from "@/components/agente/context-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ArrowLeft, Sparkles, Brain, Workflow, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { useExecutionSimulation } from "@/hooks/use-execution-simulation";

export function TaskExecutionPage() {
  const execution = useAppStore((s) => s.execution);
  const tasks = useAppStore((s) => s.tasks);
  const logs = useAppStore((s) => s.logs);
  const routeParams = useAppStore((s) => s.routeParams);
  const navigate = useAppStore((s) => s.navigate);
  const pauseExecution = useAppStore((s) => s.pauseExecution);
  const cancelExecution = useAppStore((s) => s.cancelExecution);
  const retryStep = useAppStore((s) => s.retryStep);

  // Hook que simula el WebSocket de ejecución
  useExecutionSimulation();

  const task = tasks.find((t) => t.id === (execution?.taskId || routeParams.id));

  if (!execution || !task) {
    return (
      <MainLayout title="Ejecución">
        <Card className="p-12 text-center">
          <AlertCircle className="size-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-1">No hay ejecución activa</h3>
          <p className="text-sm text-muted-foreground mb-4">Crea una tarea para empezar a ejecutar</p>
          <Button onClick={() => navigate("tasks")}>
            <ArrowLeft className="size-4" />
            Ir a tareas
          </Button>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title={task.name}
      subtitle={`Modelo: ${task.modelUsed} · Estado: ${execution.status}`}
      showNewTask={false}
    >
      <div className="space-y-4">
        {/* Agentes indicador */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Brain, name: "Planificador", status: execution.currentStepIndex === 0 ? "active" : "done" },
            { icon: Workflow, name: "Ejecutor", status: execution.status === "running" ? "active" : execution.status === "completed" ? "done" : "pending" },
            { icon: ShieldCheck, name: "Verificador", status: execution.status === "completed" ? "active" : "pending" },
          ].map((agent, i) => (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className={`p-3 flex items-center gap-3 ${agent.status === "active" ? "border-primary bg-primary/5" : ""}`}>
                <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${
                  agent.status === "active" ? "bg-primary/20 text-primary pulse-glow" :
                  agent.status === "done" ? "bg-emerald-500/20 text-emerald-500" :
                  "bg-muted text-muted-foreground"
                }`}>
                  <agent.icon className="size-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Agente</div>
                  <div className="text-sm font-medium truncate">{agent.name}</div>
                </div>
                {agent.status === "active" && (
                  <Badge variant="outline" className="ml-auto text-[10px] border-primary text-primary animate-pulse">
                    ACTIVO
                  </Badge>
                )}
                {agent.status === "done" && (
                  <Badge variant="outline" className="ml-auto text-[10px] border-emerald-500 text-emerald-500">
                    ✓
                  </Badge>
                )}
              </Card>
            </motion.div>
          ))}
        </div>

        {/* 3-panel grid */}
        <div className="grid lg:grid-cols-12 gap-4 h-[calc(100vh-280px)] min-h-[600px]">
          {/* Left: Plan */}
          <div className="lg:col-span-3 min-h-0">
            <Card className="h-full flex flex-col overflow-hidden">
              <div className="p-4 border-b border-border flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                <h3 className="font-semibold">Plan de Ejecución</h3>
              </div>
              <div className="flex-1 min-h-0">
                <PlanVisualizer plan={execution.plan} currentStepIndex={execution.currentStepIndex} className="h-full" />
              </div>
            </Card>
          </div>

          {/* Center: Execution */}
          <div className="lg:col-span-6 min-h-0">
            <ExecutionPanel
              execution={execution}
              logs={logs}
              taskName={task.name}
              onPause={pauseExecution}
              onCancel={cancelExecution}
              onRetry={retryStep}
            />
          </div>

          {/* Right: Context */}
          <div className="lg:col-span-3 min-h-0 hidden lg:block">
            <ContextPanel execution={execution} />
          </div>
        </div>

        {/* Mobile context (below) */}
        <div className="lg:hidden">
          <ContextPanel execution={execution} />
        </div>
      </div>
    </MainLayout>
  );
}
