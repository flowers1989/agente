"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MoreVertical,
  Play,
  Trash2,
  Repeat2,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Pause,
  AlertCircle,
} from "lucide-react";
import type { Task } from "@/lib/types";
import { timeAgo, formatDuration } from "@/lib/mock-data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/lib/store";
import { motion } from "framer-motion";
import { useState } from "react";
import { TaskDetailModal } from "./task-detail-modal";

const STATUS_CONFIG = {
  pending: { label: "Pendiente", color: "bg-muted text-muted-foreground", icon: Clock },
  running: { label: "Ejecutando", color: "bg-primary/10 text-primary", icon: Loader2 },
  completed: { label: "Completada", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", icon: CheckCircle2 },
  failed: { label: "Fallida", color: "bg-destructive/10 text-destructive", icon: XCircle },
  paused: { label: "Pausada", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400", icon: Pause },
  cancelled: { label: "Cancelada", color: "bg-muted text-muted-foreground", icon: AlertCircle },
};

interface TaskCardProps {
  task: Task;
  compact?: boolean;
}

export function TaskCard({ task, compact = false }: TaskCardProps) {
  const navigate = useAppStore((s) => s.navigate);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const startExecution = useAppStore((s) => s.startExecution);
  const setCurrentTask = useAppStore((s) => s.setCurrentTask);
  const [showDetail, setShowDetail] = useState(false);

  const config = STATUS_CONFIG[task.status];
  const StatusIcon = config.icon;
  const isRunning = task.status === "running";

  const handleClick = () => {
    setCurrentTask(task.id);
    if (task.status === "running") {
      navigate("task-execution", { id: task.id });
    } else if (task.status === "completed") {
      navigate("task-result", { id: task.id });
    } else {
      setShowDetail(true);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
      >
        <Card
          className="p-4 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group relative overflow-hidden"
          onClick={handleClick}
        >
          {/* Top accent */}
          <div className={`absolute top-0 left-0 right-0 h-0.5 ${config.color.split(" ")[0]}`} />

          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm truncate">{task.name}</h3>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                {task.status !== "running" && (
                  <DropdownMenuItem onClick={() => startExecution(task.id)}>
                    <Play className="size-4 mr-2" />
                    Ejecutar
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setShowDetail(true)}>
                  <Repeat2 className="size-4 mr-2" />
                  Ver detalles
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => startExecution(task.id)}
                  disabled={isRunning}
                >
                  <Repeat2 className="size-4 mr-2" />
                  Repetir
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => deleteTask(task.id)}
                  className="text-destructive"
                >
                  <Trash2 className="size-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Badge variant="secondary" className={`gap-1 ${config.color}`}>
              <StatusIcon className={`size-3 ${isRunning ? "animate-spin" : ""}`} />
              {config.label}
            </Badge>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {timeAgo(task.createdAt)}
              </span>
              {task.tags && task.tags.length > 0 && !compact && (
                <div className="flex items-center gap-1">
                  {task.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {!compact && task.selectedTools && task.selectedTools.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex flex-wrap gap-1">
                {task.selectedTools.slice(0, 3).map((tool) => (
                  <span
                    key={tool}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-primary/5 text-primary border border-primary/10"
                  >
                    {tool}
                  </span>
                ))}
                {task.selectedTools.length > 3 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    +{task.selectedTools.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}
        </Card>
      </motion.div>

      <TaskDetailModal task={task} open={showDetail} onOpenChange={setShowDetail} />
    </>
  );
}
