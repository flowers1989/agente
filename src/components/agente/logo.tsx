"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
  animated?: boolean;
}

export function Logo({ size = 32, className, animated = false }: LogoProps) {
  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="logo-grad" x1="0" y1="0" x2="40" y2="40">
            <stop offset="0%" stopColor="oklch(0.72 0.17 165)" />
            <stop offset="100%" stopColor="oklch(0.78 0.17 70)" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="10" fill="url(#logo-grad)" />
        <path
          d="M12 14L20 10L28 14V22C28 26 24.5 29 20 30.5C15.5 29 12 26 12 22V14Z"
          stroke="white"
          strokeWidth="2"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="20" cy="20" r="3" fill="white" />
        {animated && (
          <motion.circle
            cx="20"
            cy="20"
            r="3"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            style={{ transformOrigin: "20px 20px" }}
          />
        )}
      </svg>
    </div>
  );
}
