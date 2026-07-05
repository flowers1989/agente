"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
  withText?: boolean;
}

// Logo minimalista - solo un cuadrado con un punto
export function Logo({ size = 28, className, withText = false }: LogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} />
      {withText && <span className="font-semibold tracking-tight text-base">Agente</span>}
    </div>
  );
}

export function LogoMark({ size = 28, animated = false }: { size?: number; animated?: boolean }) {
  return (
    <motion.div
      className="relative inline-flex items-center justify-center rounded-md bg-foreground"
      style={{ width: size, height: size }}
      animate={animated ? { scale: [1, 1.05, 1] } : {}}
      transition={animated ? { duration: 2, repeat: Infinity } : {}}
    >
      <svg viewBox="0 0 24 24" fill="none" className="w-2/3 h-2/3">
        <path
          d="M12 2L2 7v10l10 5 10-5V7L12 2z"
          stroke="var(--background)"
          strokeWidth="1.8"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="12" cy="12" r="3" fill="var(--background)" />
      </svg>
    </motion.div>
  );
}
