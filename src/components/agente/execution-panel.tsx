"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LogsList } from "./logs-list";
import {
  Pause,
  Play,
  Square,
  RefreshCw,
  Download,
  Terminal,
  Cpu,
  Coins,
  Clock,
  CheckCircle2,
} from "lucide-react";
import type { Execution, LogEntry } from "@/lib/types";
import { formatDuration, formatNumber, formatCost } from "@/lib/mock-data";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

interface ExecutionPanelProps {
  execution: Execution;
  logs: LogEntry[];
  taskName: string;
  onPause: () => void;
  onCancel: () => void;
  onRetry: () => void;
}

export function ExecutionPanel({
  execution,
  logs,
  taskName,
  onPause,
  onCancel,
  onRetry,
}: ExecutionPanelProps) {
  const [showLogs, setShowLogs] = useState(true);
  const isRunning = execution.status === "running";
  const isPaused = execution.status === "paused";
  const isCompleted = execution.status === "completed";
  const isFailed = execution.status === "failed" || execution.status === "cancelled";

  const currentStep = execution.plan.steps[execution.currentStepIndex];
  const progress = execution.plan.steps.length > 0
    ? (execution.plan.steps.filter((s) => s.status === "completed").length / execution.plan.steps.length) * 100
    : 0;

  const elapsed = Math.floor(
    (Date.now() - new Date(execution.startedAt).getTime()) / 1000
  );

  const handleDownloadLogs = () => {
    const text = logs
      .map((l) => `[${new Date(l.timestamp).toISOString()}] ${l.level.toUpperCase()}: ${l.message}`)
      .join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs-${taskName.replace(/\s/g, "-")}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Logs descargados correctamente");
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="size-5 text-primary" />
            <h3 className="font-semibold">Ejecución en Vivo</h3>
          </div>
          <Badge
            variant={isRunning ? "default" : "secondary"}
            className={isRunning ? "bg-primary/10 text-primary" : ""}
          >
            {isRunning && <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="size-1.5 rounded-full bg-primary mr-1.5" />}
            {execution.status.toUpperCase()}
          </Badge>
        </div>

        {/* Current step */}
        {currentStep && !isCompleted && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono text-muted-foreground">
                PASO {currentStep.stepNumber}/{execution.plan.steps.length}
              </span>
              <Badge variant="outline" className="text-[10px] font-mono">
                {currentStep.toolName}
              </Badge>
            </div>
            <p className="text-sm font-medium leading-tight">{currentStep.description}</p>
          </div>
        )}

        {isCompleted && (
          <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-500" />
            <div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Ejecución completada</p>
              <p className="text-xs text-muted-foreground">Todos los pasos finalizados correctamente</p>
            </div>
          </div>
        )}
      </div>

      {/* Progress + metrics */}
      <div className="p-4 border-b border-border space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Progreso</span>
            <span className="font-mono font-medium">
              {execution.plan.steps.filter((s) => s.status === "completed").length}/{execution.plan.steps.length} pasos
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 rounded-lg bg-muted/50 text-center">
            <Clock className="size-3.5 text-muted-foreground mx-auto mb-1" />
            <div className="text-xs font-mono font-semibold">{formatDuration(elapsed)}</div>
            <div className="text-[10px] text-muted-foreground">Transcurrido</div>
          </div>
          <div className="p-2 rounded-lg bg-muted/50 text-center">
            <Cpu className="size-3.5 text-muted-foreground mx-auto mb-1" />
            <div className="text-xs font-mono font-semibold">{formatNumber(execution.tokensUsed)}</div>
            <div className="text-[10px] text-muted-foreground">Tokens</div>
          </div>
          <div className="p-2 rounded-lg bg-muted/50 text-center">
            <Coins className="size-3.5 text-muted-foreground mx-auto mb-1" />
            <div className="text-xs font-mono font-semibold">{formatCost(execution.actualCost)}</div>
            <div className="text-[10px] text-muted-foreground">Costo</div>
          </div>
        </div>
      </div>

      {/* Logs */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="px-4 py-2 border-b border-border flex items-center justify-between">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Logs en tiempo real ({logs.length})
          </button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleDownloadLogs}
            disabled={logs.length === 0}
          >
            <Download className="size-3 mr-1" />
            Descargar
          </Button>
        </div>
        {showLogs && (
          <div className="flex-1 min-h-0 p-2">
            <LogsList logs={logs} maxheight="100%" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-3 border-t border-border flex gap-2 flex-wrap">
        {isRunning && (
          <Button variant="outline" size="sm" onClick={onPause} className="flex-1">
            <Pause className="size-3.5" />
            Pausar
          </Button>
        )}
        {isPaused && (
          <Button variant="default" size="sm" onClick={onRetry} className="flex-1">
            <Play className="size-3.5" />
            Reanudar
          </Button>
        )}
        {(isRunning || isPaused) && (
          <Button variant="destructive" size="sm" onClick={onCancel} className="flex-1">
            <Square className="size-3.5" />
            Cancelar
          </Button>
        )}
        {isFailed && (
          <Button variant="default" size="sm" onClick={onRetry} className="flex-1">
            <RefreshCw className="size-3.5" />
            Reintentar
          </Button>
        )}
      </div>
    </Card>
  );
}
