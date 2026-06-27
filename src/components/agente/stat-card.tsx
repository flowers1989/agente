"use client";

import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  color?: "primary" | "emerald" | "amber" | "destructive" | "violet";
  delay?: number;
}

const COLOR_MAP = {
  primary: "from-primary/20 to-primary/5 text-primary",
  emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
  amber: "from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400",
  destructive: "from-destructive/20 to-destructive/5 text-destructive",
  violet: "from-violet-500/20 to-violet-500/5 text-violet-600 dark:text-violet-400",
};

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  color = "primary",
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: "easeOut" }}
    >
      <Card className="p-5 hover:shadow-md transition-shadow relative overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {title}
            </p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {trend !== undefined && (
              <div className="flex items-center gap-1 mt-2 text-xs">
                <span
                  className={cn(
                    "flex items-center gap-0.5 font-medium",
                    trend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                  )}
                >
                  {trend >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                  {Math.abs(trend)}%
                </span>
                {trendLabel && <span className="text-muted-foreground">{trendLabel}</span>}
              </div>
            )}
          </div>
          <div className={cn("size-12 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0", COLOR_MAP[color])}>
            <Icon className="size-6" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
