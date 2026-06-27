"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Loader2,
  Circle,
  XCircle,
  ChevronRight,
} from "lucide-react";
import type { ExecutionPlan, ExecutionStep } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface PlanVisualizerProps {
  plan: ExecutionPlan;
  currentStepIndex: number;
  className?: string;
}

const STEP_ICONS = {
  completed: CheckCircle2,
  running: Loader2,
  pending: Circle,
  failed: XCircle,
};

const STEP_COLORS = {
  completed: "text-emerald-500 dark:text-emerald-400",
  running: "text-primary",
  pending: "text-muted-foreground",
  failed: "text-destructive",
};

export function PlanVisualizer({ plan, currentStepIndex, className }: PlanVisualizerProps) {
  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="p-2 space-y-1">
        {/* Risk factors */}
        {plan.riskFactors.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1.5">
              Factores de riesgo
            </p>
            <ul className="space-y-1">
              {plan.riskFactors.map((risk, i) => (
                <li key={i} className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                  <span className="text-amber-500">⚠</span>
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Steps timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-border" />

          {plan.steps.map((step, idx) => {
            const Icon = STEP_ICONS[step.status];
            const color = STEP_COLORS[step.status];
            const isCurrent = idx === currentStepIndex;
            const isPast = idx < currentStepIndex;

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="relative flex gap-3 pb-3 last:pb-0"
              >
                {/* Node */}
                <div
                  className={cn(
                    "relative z-10 size-8 rounded-full flex items-center justify-center bg-background border-2 transition-all shrink-0",
                    step.status === "completed" && "border-emerald-500/30 bg-emerald-500/5",
                    step.status === "running" && "border-primary/30 bg-primary/5 pulse-glow",
                    step.status === "pending" && "border-border",
                    step.status === "failed" && "border-destructive/30 bg-destructive/5"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4",
                      color,
                      step.status === "running" && "animate-spin"
                    )}
                  />
                </div>

                {/* Content */}
                <div
                  className={cn(
                    "flex-1 min-w-0 pb-2 -mt-0.5",
                    isCurrent && "bg-primary/5 -mx-2 px-2 py-1.5 rounded-lg"
                  )}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      #{String(step.stepNumber).padStart(2, "0")}
                    </span>
                    {isCurrent && (
                      <Badge variant="outline" className="text-[9px] py-0 h-4 border-primary/30 text-primary">
                        ACTUAL
                      </Badge>
                    )}
                  </div>
                  <p
                    className={cn(
                      "text-sm leading-tight",
                      isPast ? "text-muted-foreground" : "text-foreground",
                      isCurrent && "font-medium"
                    )}
                  >
                    {step.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[10px] py-0 h-4 font-mono">
                      {step.toolName}
                    </Badge>
                    {step.duration && (
                      <span className="text-[10px] text-muted-foreground">
                        {step.duration}s
                      </span>
                    )}
                  </div>

                  {/* Show step logs if completed or current */}
                  {(step.status === "running" || step.status === "completed") && step.logs.length > 0 && (
                    <div className="mt-2 pl-2 border-l-2 border-border space-y-0.5">
                      {step.logs.slice(-2).map((log) => (
                        <div key={log.id} className="text-[10px] text-muted-foreground font-mono flex items-start gap-1">
                          <ChevronRight className="size-2.5 mt-0.5 shrink-0" />
                          {log.message}
                        </div>
                      ))}
                    </div>
                  )}

                  {step.result && step.status === "completed" && (
                    <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 rounded px-2 py-1.5">
                      ✓ {step.result}
                    </div>
                  )}

                  {step.error && (
                    <div className="mt-2 text-xs text-destructive bg-destructive/5 border border-destructive/10 rounded px-2 py-1.5">
                      ✗ {step.error}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Total time */}
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>Tiempo estimado total</span>
          <span className="font-mono font-medium">{plan.totalEstimatedTime}s</span>
        </div>
      </div>
    </ScrollArea>
  );
}
