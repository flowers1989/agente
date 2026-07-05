"use client";

import { useEffect, useRef } from "react";
import { useBrowserStore } from "@/lib/browser/store-browser";

// ==================== BROWSER AUTO START ====================
// Inicia automáticamente una sesión de Playwright cuando el usuario
// entra a la app, para que el navegador esté siempre listo para usar.

export function useBrowserAutoStart() {
  const store = useBrowserStore();
  const startingRef = useRef(false);

  useEffect(() => {
    if (store.sessionId || store.isActive || startingRef.current) return;

    startingRef.current = true;
    store.setLoading(true);
    store.setError(null);

    fetch("/api/browser/sessions", { method: "POST" })
      .then(async (res) => {
        const data = (await res.json()) as { session?: { id: string }; error?: string };
        if (!res.ok) throw new Error(data.error || "Error iniciando sesión de browser");
        if (!data.session?.id) throw new Error("Sesión no creada");

        store.setSessionId(data.session.id);
        store.setActive(true);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[BrowserAutoStart]", message);
        store.setError(message);
      })
      .finally(() => {
        store.setLoading(false);
        startingRef.current = false;
      });

    // No cerramos la sesión al desmontar para mantenerla activa mientras la app esté abierta.
  }, [store]);
}
