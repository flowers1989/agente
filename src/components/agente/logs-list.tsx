"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  CircleDot,
  Info,
  AlertTriangle,
  Bug,
  XCircle,
} from "lucide-react";
import type { LogEntry, LogLevel } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";

const LEVEL_CONFIG: Record<LogLevel, { icon: typeof Info; color: string; bg: string }> = {
  debug: { icon: Bug, color: "text-muted-foreground", bg: "bg-muted/30" },
  info: { icon: Info, color: "text-blue-500 dark:text-blue-400", bg: "bg-blue-500/5" },
  warn: { icon: AlertTriangle, color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-500/5" },
  error: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/5" },
};

interface LogsListProps {
  logs: LogEntry[];
  maxheight?: string;
  autoScroll?: boolean;
}

export function LogsList({ logs, maxheight = "400px", autoScroll = true }: LogsListProps) {
  return (
    <ScrollArea className={cn("w-full font-mono text-xs")} style={{ maxHeight: maxheight }}>
      <div className="space-y-0.5 p-1">
        <AnimatePresence initial={false}>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm font-sans">
              <CircleDot className="size-5 mx-auto mb-2 opacity-30" />
              Esperando logs...
            </div>
          ) : (
            logs.map((log, i) => {
              const config = LEVEL_CONFIG[log.level];
              const Icon = config.icon;
              const time = new Date(log.timestamp).toLocaleTimeString("es-ES", {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "flex items-start gap-2 px-2 py-1.5 rounded hover:bg-muted/50 transition-colors",
                    config.bg
                  )}
                  ref={autoScroll && i === logs.length - 1 ? (el) => el?.scrollIntoView({ behavior: "smooth", block: "end" }) : undefined}
                >
                  <span className="text-[10px] text-muted-foreground mt-0.5 shrink-0 tabular-nums">
                    {time}
                  </span>
                  <Icon className={cn("size-3.5 mt-0.5 shrink-0", config.color)} />
                  <span className="flex-1 break-words leading-relaxed">{log.message}</span>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </ScrollArea>
  );
}
