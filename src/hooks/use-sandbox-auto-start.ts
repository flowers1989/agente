"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSandboxStore, ensureSandboxStarted, checkDockerAvailability } from "@/lib/sandbox/sandbox-store";
import { useTaskStore } from "@/lib/store-task";

// ==================== SANDBOX AUTO START ====================
// Auto-inicia el sandbox Docker cuando el usuario entra a la app.
// El sandbox SIEMPRE debe estar activo para que el agente pueda
// ejecutar código, crear archivos y servir proyectos web en cualquier momento.
//
// Si Docker no está disponible, reintenta cada 30 segundos.
// Si el sandbox se cae, lo reinicia automáticamente.

const RETRY_INTERVAL_MS = 30000; // 30 segundos
const MAX_RETRIES = 10;

export function useSandboxAutoStart() {
  const status = useSandboxStore((s) => s.status);
  const dockerAvailable = useSandboxStore((s) => s.dockerAvailable);
  const taskId = useSandboxStore((s) => s.taskId);
  const startingRef = useRef(false);
  const retryCount = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startSandbox = useCallback(async () => {
    if (startingRef.current) return;
    if (status === "active" && taskId) return;

    startingRef.current = true;

    // Primero verificar Docker si no se ha hecho
    if (status === "unknown" || status === "unavailable") {
      await checkDockerAvailability();
    }

    const state = useSandboxStore.getState();

    // Si Docker no está disponible, programar retry
    if (!state.dockerAvailable) {
      console.warn("[SandboxAutoStart] Docker no disponible, reintentando en 30s...");
      startingRef.current = false;
      retryCount.current += 1;
      if (retryCount.current < MAX_RETRIES) {
        retryTimerRef.current = setTimeout(() => startSandbox(), RETRY_INTERVAL_MS);
      }
      return;
    }

    // Docker disponible → iniciar sandbox
    const sid = useTaskStore.getState().currentConversationId || `sandbox-default-${Date.now()}`;
    try {
      await ensureSandboxStarted(sid);
      console.log("[SandboxAutoStart] Sandbox activo:", useSandboxStore.getState().taskId);
      retryCount.current = 0;
    } catch (error) {
      console.error("[SandboxAutoStart] Error iniciando sandbox:", error);
      // Reintentar
      retryCount.current += 1;
      if (retryCount.current < MAX_RETRIES) {
        retryTimerRef.current = setTimeout(() => startSandbox(), RETRY_INTERVAL_MS);
      }
    } finally {
      startingRef.current = false;
    }
  }, [status, taskId]);

  useEffect(() => {
    startSandbox();

    // Cleanup: cancelar retry pendiente al desmontar
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [startSandbox]);

  // Si el sandbox se cae (pasa de "active" a "available" o "unavailable"), reiniciarlo
  useEffect(() => {
    if (status === "unavailable" && !startingRef.current && retryCount.current < MAX_RETRIES) {
      retryTimerRef.current = setTimeout(() => startSandbox(), RETRY_INTERVAL_MS);
    }
  }, [status, startSandbox]);
}
