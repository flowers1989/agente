"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Repeat2, Calendar, Clock, Cpu, Wrench, AlertCircle } from "lucide-react";
import type { Task } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { OPENCODE_MODELS } from "@/lib/mock-data";
import { timeAgo } from "@/lib/mock-data";

interface TaskDetailModalProps {
  task?: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailModal({ task, open, onOpenChange }: TaskDetailModalProps) {
  const startExecution = useAppStore((s) => s.startExecution);
  const navigate = useAppStore((s) => s.navigate);

  // Render the dialog shell even if no task, but content only when task exists
  const model = task ? OPENCODE_MODELS.find((m) => m.id === task.modelUsed) : undefined;

  const handleExecute = () => {
    if (!task) return;
    onOpenChange(false);
    startExecution(task.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        {!task ? (
          <div className="py-8 text-center text-muted-foreground">Cargando...</div>
        ) : (
          <>
        <DialogHeader>
          <DialogTitle className="text-xl">{task.name}</DialogTitle>
          <DialogDescription className="text-base">{task.description}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-5">
            {/* Objective */}
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="size-4 text-primary" />
                Objetivo
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed bg-muted/50 p-3 rounded-lg">
                {task.objective}
              </p>
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                  <Calendar className="size-3" />
                  Creada
                </div>
                <div className="text-sm font-medium">{timeAgo(task.createdAt)}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                  <Cpu className="size-3" />
                  Modelo
                </div>
                <div className="text-sm font-medium">{model?.name || task.modelUsed}</div>
              </div>
            </div>

            {/* Constraints */}
            {task.constraints && task.constraints.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Restricciones</h4>
                <ul className="space-y-1.5">
                  {task.constraints.map((c, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tools */}
            {task.selectedTools && task.selectedTools.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Wrench className="size-4" />
                  Herramientas ({task.selectedTools.length})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {task.selectedTools.map((tool) => (
                    <Badge key={tool} variant="outline" className="font-mono text-xs">
                      {tool}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Tags</h4>
                <div className="flex flex-wrap gap-1.5">
                  {task.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Result or Error */}
            {task.result && (
              <div>
                <h4 className="text-sm font-semibold mb-2 text-emerald-600 dark:text-emerald-400">Resultado</h4>
                <p className="text-sm text-muted-foreground leading-relaxed bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-lg">
                  {task.result}
                </p>
              </div>
            )}

            {task.error && (
              <div>
                <h4 className="text-sm font-semibold mb-2 text-destructive">Error</h4>
                <p className="text-sm text-muted-foreground leading-relaxed bg-destructive/5 border border-destructive/20 p-3 rounded-lg">
                  {task.error}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-2 border-t">
          <Button onClick={handleExecute} className="flex-1">
            <Play className="size-4" />
            {task.status === "completed" ? "Repetir ejecución" : "Ejecutar ahora"}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
