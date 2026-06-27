"use client";

import { useExecutionStore } from "@/lib/store-execution";

// Hook que simula un WebSocket de tiempo real
// En producción, esto se conectaría a Socket.io
// Por ahora solo reporta el estado de "trabajando"
export function useWebSocket() {
  const isWorking = useExecutionStore((s) => s.isWorking);

  // En una app real, aquí conectaríamos con Socket.io
  // y escucharíamos eventos del backend.
  // Por ahora solo exponemos el estado de "trabajando".
  return {
    isConnected: true,
    isWorking,
  };
}
