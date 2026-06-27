"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import type { LogEntry, LogLevel } from "@/lib/types";

// Mensajes de logs realistas por herramienta
const TOOL_LOG_MESSAGES: Record<string, string[]> = {
  "File Read": [
    "Abriendo archivo: {path}",
    "Leyendo contenido...",
    "Archivo cargado: {lines} líneas, {size}",
    "Detectado encoding UTF-8",
  ],
  "Code Generation": [
    "Analizando requerimientos...",
    "Generando código con {model}...",
    "Aplicando patrones de diseño...",
    "Validando sintaxis...",
    "Código generado: {lines} LOC",
  ],
  "Web Search": [
    "Construyendo query de búsqueda...",
    "Ejecutando búsqueda en Google...",
    "Procesando {n} resultados...",
    "Filtrando por relevancia...",
    "Top 10 resultados obtenidos",
  ],
  "Web Extraction": [
    "Navegando a {url}...",
    "Esperando selector: {selector}",
    "Extrayendo datos del DOM...",
    "Parser aplicado, {n} elementos encontrados",
  ],
  "Python Execution": [
    "Inicializando entorno Python 3.12...",
    "Instalando dependencias: {libs}",
    "Ejecutando script...",
    "Output: {output}",
    "Script completado en {ms}ms",
  ],
  "Testing": [
    "Configurando Jest...",
    "Ejecutando {n} tests...",
    "Tests pasados: {passed}/{n}",
    "Cobertura: {coverage}%",
  ],
  "Git": [
    "Verificando repositorio...",
    "Staging archivos modificados...",
    "Creando commit: {msg}",
    "Push a origin/main exitoso",
  ],
  "Browser Navigation": [
    "Navegando a {url}...",
    "Esperando carga del DOM...",
    "Página cargada: status 200",
    "HTML extraído: {lines} líneas",
  ],
  "Screenshot": [
    "Preparando captura...",
    "Configurando viewport 1920x1080",
    "Captura tomada en {ms}ms",
  ],
  "HTTP Client": [
    "Construyendo request HTTP...",
    "Enviando request a {url}",
    "Respuesta recibida: {n} bytes",
    "Status: 200 OK",
  ],
  "Data Analysis": [
    "Cargando dataset...",
    "Aplicando análisis estadístico...",
    "Detectados {n} outliers",
    "Análisis completado",
  ],
  "Document Generation": [
    "Inicializando plantilla...",
    "Renderizando contenido...",
    "Aplicando estilos...",
    "Documento generado: {size}",
  ],
  "Visualization": [
    "Procesando datos...",
    "Configurando chart...",
    "Renderizando visualización...",
    "Chart generado",
  ],
  "Email": [
    "Conectando con SMTP...",
    "Compilando mensaje...",
    "Email enviado a {n} destinatarios",
  ],
  "default": [
    `Ejecutando herramienta...`,
    "Procesando parámetros...",
    "Operación completada",
  ],
};

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function interpolate(msg: string): string {
  return msg
    .replace("{path}", `/workspace/project/src/file-${Math.floor(Math.random() * 100)}.ts`)
    .replace("{lines}", String(Math.floor(Math.random() * 500) + 50))
    .replace("{size}", `${(Math.random() * 20 + 2).toFixed(1)}KB`)
    .replace("{model}", "kimi-k2.7-code")
    .replace("{n}", String(Math.floor(Math.random() * 50) + 5))
    .replace("{selector}", ".product-card")
    .replace("{url}", "https://example.com/page")
    .replace("{libs}", "pandas, numpy, scikit-learn")
    .replace("{output}", "OK")
    .replace("{ms}", String(Math.floor(Math.random() * 800) + 100))
    .replace("{passed}", String(Math.floor(Math.random() * 20) + 18))
    .replace("{coverage}", String(Math.floor(Math.random() * 20) + 75))
    .replace("{msg}", `'refactor: ${randomFrom(["update module", "fix bug", "add tests"])}'`);
}

const LOG_LEVELS: LogLevel[] = ["info", "info", "info", "debug", "warn"];

export function useExecutionSimulation() {
  const execution = useAppStore((s) => s.execution);
  const setExecution = useAppStore((s) => s.setExecution);
  const addLog = useAppStore((s) => s.addLog);
  const updateTask = useAppStore((s) => s.updateTask);
  const navigate = useAppStore((s) => s.navigate);

  // Track what step we've already started processing
  const processingStepRef = useRef<string | null>(null);
  // Track what message index we're at for the current step
  const messageIndexRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!execution || execution.status !== "running") {
      processingStepRef.current = null;
      messageIndexRef.current = 0;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const currentStep = execution.plan.steps[execution.currentStepIndex];

    // No more steps -> completed
    if (!currentStep) {
      if (processingStepRef.current !== "__completed__") {
        processingStepRef.current = "__completed__";
        const completed = {
          ...execution,
          status: "completed" as const,
          completedAt: new Date().toISOString(),
        };
        setExecution(completed);
        updateTask(execution.taskId, {
          status: "completed",
          completedAt: new Date().toISOString(),
          result: "Tarea ejecutada exitosamente. Todos los pasos completados sin errores.",
        });
        const finalLog: LogEntry = {
          id: `log-${Date.now()}-final`,
          timestamp: new Date().toISOString(),
          level: "info",
          message: "✓ Ejecución completada exitosamente",
        };
        addLog(finalLog);
      }
      return;
    }

    // If we just entered a new step, mark it as started and emit start log
    if (processingStepRef.current !== currentStep.id) {
      processingStepRef.current = currentStep.id;
      messageIndexRef.current = 0;

      // Mark step as running if pending
      if (currentStep.status === "pending") {
        const updatedExec = {
          ...execution,
          plan: {
            ...execution.plan,
            steps: execution.plan.steps.map((s, i) =>
              i === execution.currentStepIndex
                ? { ...s, status: "running" as const, startedAt: new Date().toISOString() }
                : s
            ),
          },
        };
        setExecution(updatedExec);

        const startLog: LogEntry = {
          id: `log-${Date.now()}-start-${currentStep.id}`,
          timestamp: new Date().toISOString(),
          level: "info",
          message: `▶ Iniciando paso ${currentStep.stepNumber}: ${currentStep.description}`,
          stepId: currentStep.id,
        };
        addLog(startLog);
      }

      // Schedule first log
      timerRef.current = setTimeout(() => emitNextLog(), 800);
      return;
    }

    // If we're already processing this step, do nothing (the timer chain handles it)
    return;

    function emitNextLog() {
      // Always read fresh state from store
      const currentExec = useAppStore.getState().execution;
      if (!currentExec || currentExec.status !== "running") return;

      const step = currentExec.plan.steps[currentExec.currentStepIndex];
      if (!step) return;

      const messages = TOOL_LOG_MESSAGES[step.toolName] || TOOL_LOG_MESSAGES.default;
      const msgIdx = messageIndexRef.current;

      if (msgIdx < messages.length) {
        // Emit a log message
        const level = randomFrom(LOG_LEVELS);
        const log: LogEntry = {
          id: `log-${Date.now()}-${msgIdx}`,
          timestamp: new Date().toISOString(),
          level,
          message: interpolate(messages[msgIdx]),
          stepId: step.id,
        };
        addLog(log);
        messageIndexRef.current = msgIdx + 1;

        // Schedule next log
        timerRef.current = setTimeout(() => emitNextLog(), 900 + Math.random() * 800);
      } else {
        // Complete this step and advance
        const duration = Math.floor(Math.random() * 60) + 20;
        const tokensForStep = Math.floor(Math.random() * 3000) + 1500;
        const costForStep = (tokensForStep / 1000) * 0.95;

        const updatedExec = {
          ...currentExec,
          plan: {
            ...currentExec.plan,
            steps: currentExec.plan.steps.map((s, i) =>
              i === currentExec.currentStepIndex
                ? {
                    ...s,
                    status: "completed" as const,
                    completedAt: new Date().toISOString(),
                    duration,
                    result: `Paso completado en ${duration}s. ${tokensForStep} tokens usados.`,
                  }
                : s
            ),
          },
          currentStepIndex: currentExec.currentStepIndex + 1,
          tokensUsed: currentExec.tokensUsed + tokensForStep,
          actualCost: currentExec.actualCost + costForStep,
        };
        setExecution(updatedExec);
        // Reset so the new step will be processed by the next effect cycle
        processingStepRef.current = null;
        messageIndexRef.current = 0;
      }
    }
  }, [execution, setExecution, addLog, updateTask, navigate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Cuando la ejecución se completa, esperar y navegar a resultados
  useEffect(() => {
    if (execution?.status === "completed") {
      const t = setTimeout(() => {
        navigate("task-result", { id: execution.taskId });
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [execution?.status, execution?.taskId, navigate]);
}
