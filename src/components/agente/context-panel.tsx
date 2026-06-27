"use client";

import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Database,
  Boxes,
  AlertCircle,
  Variable,
} from "lucide-react";
import type { Execution } from "@/lib/types";

interface ContextPanelProps {
  execution: Execution;
}

export function ContextPanel({ execution }: ContextPanelProps) {
  const workingMemory = execution.memory.filter((m) => m.type === "working");
  const episodicMemory = execution.memory.filter((m) => m.type === "episodic");
  const semanticMemory = execution.memory.filter((m) => m.type === "semantic");

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Boxes className="size-5 text-primary" />
          <h3 className="font-semibold">Contexto</h3>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Variables */}
          <div>
            <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Variable className="size-3.5" />
              Variables
            </div>
            <div className="space-y-1.5">
              {Object.entries(execution.variables).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono text-muted-foreground">{key}</span>
                  <span className="font-mono font-medium truncate">{value}</span>
                </div>
              ))}
              {Object.keys(execution.variables).length === 0 && (
                <p className="text-xs text-muted-foreground italic">Sin variables</p>
              )}
            </div>
          </div>

          {/* Working memory */}
          <div>
            <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Brain className="size-3.5" />
              Working Memory
            </div>
            <div className="space-y-1.5">
              {workingMemory.map((m, i) => (
                <div key={i} className="p-2 rounded bg-primary/5 border border-primary/10 text-xs">
                  <div className="font-mono text-[10px] text-primary mb-0.5">{m.key}</div>
                  <div className="text-foreground">{m.value}</div>
                </div>
              ))}
              {workingMemory.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Vacía</p>
              )}
            </div>
          </div>

          {/* Episodic memory */}
          <div>
            <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Database className="size-3.5" />
              Episodic Memory
            </div>
            <div className="space-y-1.5">
              {episodicMemory.map((m, i) => (
                <div key={i} className="p-2 rounded bg-muted/50 text-xs">
                  <div className="font-mono text-[10px] text-muted-foreground mb-0.5">{m.key}</div>
                  <div className="text-foreground">{m.value}</div>
                </div>
              ))}
              {episodicMemory.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Vacía</p>
              )}
            </div>
          </div>

          {/* Semantic memory */}
          <div>
            <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Boxes className="size-3.5" />
              Semantic Memory
            </div>
            <div className="space-y-1.5">
              {semanticMemory.map((m, i) => (
                <div key={i} className="p-2 rounded bg-amber-500/5 border border-amber-500/10 text-xs">
                  <div className="font-mono text-[10px] text-amber-600 dark:text-amber-400 mb-0.5">{m.key}</div>
                  <div className="text-foreground">{m.value}</div>
                </div>
              ))}
              {semanticMemory.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Vacía</p>
              )}
            </div>
          </div>

          {/* Errors */}
          {execution.errors.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold uppercase tracking-wider text-destructive">
                <AlertCircle className="size-3.5" />
                Errores ({execution.errors.length})
              </div>
              <div className="space-y-1.5">
                {execution.errors.map((err, i) => (
                  <div key={i} className="p-2 rounded bg-destructive/5 border border-destructive/10 text-xs text-destructive">
                    {err}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cost breakdown */}
          <div className="pt-3 border-t border-border">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Resumen
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tokens usados</span>
                <span className="font-mono">{execution.tokensUsed.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Costo estimado</span>
                <span className="font-mono">${execution.estimatedCost.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Costo actual</span>
                <span className="font-mono font-semibold text-primary">${execution.actualCost.toFixed(4)}</span>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </Card>
  );
}
