"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/agente/logo";
import { Home, ArrowLeft, Compass } from "lucide-react";
import { motion } from "framer-motion";

export function NotFoundPage() {
  const navigate = useAppStore((s) => s.navigate);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden">
      {/* Animated grid */}
      <div className="absolute inset-0 grid-pattern opacity-20" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center max-w-md"
      >
        <div className="flex justify-center mb-6">
          <Logo size={56} animated />
        </div>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="text-8xl font-bold bg-gradient-to-br from-primary via-emerald-500 to-amber-500 bg-clip-text text-transparent mb-2"
        >
          404
        </motion.div>

        <div className="flex items-center justify-center gap-2 mb-3">
          <Compass className="size-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Página no encontrada</h1>
        </div>

        <p className="text-muted-foreground mb-8 leading-relaxed">
          La página que buscas no existe o fue movida.
          Verifica la URL o vuelve al inicio.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button variant="outline" onClick={() => navigate(isAuthenticated ? "dashboard" : "landing")}>
            <ArrowLeft className="size-4" />
            Volver
          </Button>
          <Button onClick={() => navigate(isAuthenticated ? "dashboard" : "landing")}>
            <Home className="size-4" />
            Ir al inicio
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
