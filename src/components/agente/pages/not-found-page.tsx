"use client";

import { useAppStore } from "@/lib/store-app";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/agente/logo";
import { ArrowLeft, Home } from "lucide-react";
import { motion } from "framer-motion";

export function NotFoundPage() {
  const navigate = useAppStore((s) => s.navigate);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-sm"
      >
        <div className="flex justify-center mb-6">
          <LogoMark size={48} />
        </div>
        <div className="text-6xl font-semibold tracking-tight mb-3">404</div>
        <h1 className="text-lg font-medium mb-2">Página no encontrada</h1>
        <p className="text-sm text-muted-foreground mb-8">
          La página que buscas no existe o fue movida.
        </p>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={() => navigate(isAuthenticated ? "app" : "landing")}>
            <ArrowLeft className="size-4" />
            Volver
          </Button>
          <Button onClick={() => navigate(isAuthenticated ? "app" : "landing")}>
            <Home className="size-4" />
            Inicio
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
