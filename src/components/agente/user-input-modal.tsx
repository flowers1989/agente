"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, X, Loader2 } from "lucide-react";
import { useUserInputStore } from "@/lib/user-input-store";

// ==================== USER INPUT MODAL ====================
// Modal que aparece cuando el agente pide input al usuario (human-in-the-loop).
// El agente se pausa hasta que el usuario responde.

export function UserInputModal() {
  const { activeRequest, isModalOpen, respondToRequest, cancelRequest } = useUserInputStore();
  const [response, setResponse] = useState("");

  // Reset response cuando cambia el request
  useEffect(() => {
    setResponse("");
  }, [activeRequest?.id]);

  const handleSubmit = () => {
    if (!response.trim()) return;
    respondToRequest(response.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      cancelRequest();
    }
  };

  return (
    <AnimatePresence>
      {isModalOpen && activeRequest && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={cancelRequest}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-3 mb-4">
              <div className="size-10 rounded-full bg-manus-primary/20 flex items-center justify-center shrink-0">
                <MessageSquare className="size-5 text-manus-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">
                  El agente necesita tu ayuda
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  El agente está pausado esperando tu respuesta
                </p>
              </div>
              <button
                onClick={cancelRequest}
                className="size-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title="Cancelar (Esc)"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Prompt del agente */}
            <div className="bg-muted/50 border border-border rounded-lg p-3 mb-4">
              <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {activeRequest.prompt}
              </p>
            </div>

            {/* Input del usuario */}
            <div className="space-y-3">
              <textarea
                autoFocus
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu respuesta aquí..."
                rows={3}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-manus-primary/50 placeholder:text-muted-foreground/50"
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] text-muted-foreground">
                  Enter para enviar · Shift+Enter para nueva línea · Esc para cancelar
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={cancelRequest}
                    className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!response.trim()}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-manus-primary/20 text-manus-primary hover:bg-manus-primary/30 border border-manus-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="size-3" />
                    Enviar
                  </button>
                </div>
              </div>
            </div>

            {/* Indicador de pausa */}
            <div className="mt-4 pt-3 border-t border-border flex items-center gap-2 text-[10px] text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              <span>Agente pausado · esperando tu respuesta para continuar</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
