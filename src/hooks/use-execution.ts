"use client";

import { useEffect, useRef, useCallback } from "react";
import { useTaskStore } from "@/lib/store-task";
import { useExecutionStore } from "@/lib/store-execution";
import { useMemoryStore } from "@/lib/memory/memory-store";
import type { ChatMessage, ExecutionStep } from "@/lib/types";
import { getOrchestrator } from "@/lib/agents/orchestrator";

// ==================== HOOK DE EJECUCIÓN ====================
// Este hook conecta el frontend con el orquestador de los 7 agentes.
//
// Flujo:
// 1. Usuario envía mensaje
// 2. Hook detecta conversación sin respuesta del assistant
// 3. Llama al orquestador.executeTask()
// 4. El orquestador ejecuta los 7 agentes en orden:
//    Analizador → Planificador → Ejecutor → Verificador → Optimizador → Reportero → Monitor
// 5. Los callbacks actualizan el store en tiempo real
// 6. El usuario SOLO VE "Trabajando..." - los agentes son invisibles

export function useExecution() {
  const conversations = useTaskStore((s) => s.conversations);
  const currentConversationId = useTaskStore((s) => s.currentConversationId);
  const addMessage = useTaskStore((s) => s.addMessage);
  const updateMessage = useTaskStore((s) => s.updateMessage);
  const updateStep = useTaskStore((s) => s.updateStep);
  const updateConversation = useTaskStore((s) => s.updateConversation);
  const setWorkspace = useExecutionStore((s) => s.setWorkspace);
  const appendTerminalLine = useExecutionStore((s) => s.appendTerminalLine);
  const setWorking = useExecutionStore((s) => s.setWorking);
  const setCurrentAgent = useExecutionStore((s) => s.setCurrentAgent);
  const setMetrics = useExecutionStore((s) => s.setMetrics);
  const addAnomaly = useExecutionStore((s) => s.addAnomaly);
  const clearAnomalies = useExecutionStore((s) => s.clearAnomalies);
  const clearWorkingMemory = useMemoryStore((s) => s.clearWorking);

  const simulatingRef = useRef<string | null>(null);

  const updateWorkspaceForStep = useCallback((step: ExecutionStep) => {
    if (step.produces === "browser") {
      setWorkspace({
        activeTab: "browser",
        browser: { url: "https://example.com/search", title: step.description, loading: true },
      });
      setTimeout(() => {
        setWorkspace({
          browser: { url: "https://example.com/results", title: step.description, loading: false },
        });
      }, 1500);
    } else if (step.produces === "terminal") {
      const ws = useExecutionStore.getState().workspace;
      if (!ws.terminal || ws.terminal.lines.length === 0) {
        setWorkspace({
          activeTab: "terminal",
          terminal: {
            lines: [{ type: "input", text: `$ ${step.description.toLowerCase().replace(/\s/g, "-")}` }],
            cwd: "/workspace",
          },
        });
      } else {
        setWorkspace({ activeTab: "terminal" });
      }
    } else if (step.produces === "files") {
      setWorkspace({
        activeTab: "files",
        files: [
          { name: "src", path: "/src", type: "dir", modified: new Date().toISOString() },
          { name: "package.json", path: "/package.json", type: "file", size: 1840, modified: new Date().toISOString() },
          { name: "README.md", path: "/README.md", type: "file", size: 4200, modified: new Date().toISOString() },
          { name: "index.ts", path: "/src/index.ts", type: "file", size: 580, modified: new Date().toISOString() },
          { name: "solution.ts", path: "/src/solution.ts", type: "file", size: 2470, modified: new Date().toISOString() },
        ],
        activeFile: { name: "solution.ts", language: "typescript", content: `// ${step.description}\n// Generando...\n` },
      });
    } else if (step.produces === "data") {
      setWorkspace({
        activeTab: "data",
        output: {
          type: "text",
          title: step.description,
          content: `Procesando datos para: ${step.description}\n\nFilas analizadas: ${Math.floor(Math.random() * 8000) + 1000}\nCampos detectados: ${Math.floor(Math.random() * 20) + 5}\nOutliers: ${Math.floor(Math.random() * 50)}`,
        },
      });
    } else {
      setWorkspace({
        activeTab: "output",
        output: { type: "text", title: step.description, content: `Trabajando en: ${step.description}...` },
      });
    }
  }, [setWorkspace]);

  useEffect(() => {
    if (!currentConversationId) return;
    const conversation = conversations.find((c) => c.id === currentConversationId);
    if (!conversation) return;

    // Encontrar el último mensaje de usuario sin respuesta del asistente
    const lastUserIdx = [...conversation.messages].reverse().findIndex((m) => m.role === "user");
    if (lastUserIdx === -1) return;
    const userIdx = conversation.messages.length - 1 - lastUserIdx;
    const userMsg = conversation.messages[userIdx];
    const nextMsg = conversation.messages[userIdx + 1];

    // Si ya hay respuesta del asistente
    if (nextMsg && nextMsg.role === "assistant") {
      // Si está en progreso, no hacer nada (ya se está simulando)
      if (nextMsg.agentStatus && nextMsg.agentStatus !== "completed" && nextMsg.agentStatus !== "failed") {
        return;
      }
      return;
    }

    // Crear respuesta del asistente y empezar simulación con orquestador
    const simKey = `${conversation.id}:${userMsg.id}`;
    if (simulatingRef.current === simKey) return;
    simulatingRef.current = simKey;

    // Limpiar working memory de la conversación anterior
    clearWorkingMemory();
    clearAnomalies();

    // Inicializar estado de trabajo
    setWorking(true);
    setWorkspace({
      activeTab: "output",
      output: { type: "text", content: "Trabajando en tu tarea..." },
      terminal: { lines: [] },
      browser: undefined,
      files: undefined,
      activeFile: undefined,
    });

    // Crear mensaje inicial del asistente (se actualizará conforme avanza el orquestador)
    const assistantMsgId = `m-${Date.now()}-assistant`;
    const initialAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "Voy a trabajar en esto.",
      timestamp: new Date().toISOString(),
      agentStatus: "thinking",
      steps: [],
    };
    addMessage(conversation.id, initialAssistantMsg);

    // Obtener el modelo por defecto del usuario
    const userConfig = useTaskStore.getState();
    const defaultModel = "kimi-k2.7-code"; // Modelo por defecto

    // ========== EJECUTAR ORQUESTADOR ==========
    const orchestrator = getOrchestrator();

    // Crear plan inicial vacío (se actualizará cuando el Planificador termine)
    let currentSteps: ExecutionStep[] = [];

    orchestrator.executeTask(userMsg.content, conversation.id, {
      // FASE 1: Análisis completado
      onAnalysisComplete: (analysis) => {
        setCurrentAgent("analyzer");
        updateMessage(conversation.id, assistantMsgId, {
          content: `Voy a trabajar en esto. He analizado tu objetivo: ${analysis.context}. Complejidad: ${analysis.complexity}.`,
        });
      },

      // FASE 2: Plan creado
      onPlanCreated: (plan, category) => {
        setCurrentAgent("planner");
        currentSteps = plan.steps;

        // Actualizar el mensaje con los pasos
        updateMessage(conversation.id, assistantMsgId, {
          content: getInitialMessageForCategory(category),
          steps: plan.steps,
        });

        // Actualizar conversación con info del plan
        updateConversation(conversation.id, {
          category,
          modelUsed: defaultModel,
        });

        // Mostrar factores de riesgo si los hay
        if (plan.riskFactors.length > 0) {
          // En producción, esto podría mostrarse como una advertencia sutil
        }
      },

      // FASE 3: Paso iniciado
      onStepStarted: (step, agentStatus) => {
        setCurrentAgent(step.agent || null);
        updateMessage(conversation.id, assistantMsgId, { agentStatus });

        // Marcar step como running
        updateStep(conversation.id, assistantMsgId, step.id, {
          status: "running",
          startedAt: new Date().toISOString(),
        });

        // Actualizar workspace según lo que produce el step
        updateWorkspaceForStep(step);
      },

      // Paso en progreso (log)
      onStepProgress: (stepId, log) => {
        // Añadir log al step actual
        const currentConv = useTaskStore.getState().conversations.find((c) => c.id === conversation.id);
        const currentMsg = currentConv?.messages.find((m) => m.id === assistantMsgId);
        const currentStep = currentMsg?.steps?.find((s) => s.id === stepId);
        if (currentStep) {
          updateStep(conversation.id, assistantMsgId, stepId, {
            logs: [...(currentStep.logs || []), {
              id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              timestamp: new Date().toISOString(),
              level: "info",
              message: log,
              stepId,
              agent: currentStep.agent,
            }],
          });
        }

        // También escribir a terminal si el step produce terminal output
        const step = currentSteps.find((s) => s.id === stepId);
        if (step?.produces === "terminal") {
          appendTerminalLine({ type: "output", text: log });
        }
      },

      // Paso completado
      onStepCompleted: (step, result) => {
        const duration = step.duration || Math.floor(Math.random() * 30) + 10;
        updateStep(conversation.id, assistantMsgId, step.id, {
          status: "completed",
          completedAt: new Date().toISOString(),
          duration,
          result,
        });

        // Actualizar costo de la conversación
        const conv = useTaskStore.getState().conversations.find((c) => c.id === conversation.id);
        if (conv) {
          const tokensForStep = Math.floor(Math.random() * 3000) + 1500;
          const costForStep = (tokensForStep / 1000) * 0.5;
          updateConversation(conversation.id, {
            tokensUsed: conv.tokensUsed + tokensForStep,
            cost: conv.cost + costForStep,
          });
        }
      },

      // Paso fallido
      onStepFailed: (step, error) => {
        updateStep(conversation.id, assistantMsgId, step.id, {
          status: "failed",
          completedAt: new Date().toISOString(),
          error,
        });
      },

      // FASE 4: Verificación
      onVerificationResult: (verification) => {
        setCurrentAgent("verifier");
      },

      // FASE 5: Optimización
      onOptimizationSuggestions: (optimization) => {
        setCurrentAgent("optimizer");
        // Guardar optimizaciones en memoria semántica
        optimization.suggestions.forEach((s) => {
          useMemoryStore.getState().storeOptimization(s.title, s.timeReduction);
        });
      },

      // FASE 6: Reporte generado
      onReportGenerated: (output) => {
        setCurrentAgent("reporter");

        // Marcar mensaje como completado con output
        updateMessage(conversation.id, assistantMsgId, {
          agentStatus: "completed",
          output,
        });

        // Actualizar workspace con output final
        const outWs = {
          activeTab: output.type === "html" ? "output" as const :
                     output.type === "code" || output.type === "file" ? "files" as const : "output" as const,
          output: {
            type: output.type === "html" ? "html" as const :
                  output.type === "code" ? "code" as const : "text" as const,
            content: output.content,
            title: output.title,
            language: output.language,
          },
          ...(output.type === "code" ? {
            activeFile: {
              name: output.title || "output.ts",
              content: output.content,
              language: output.language || "typescript",
            },
          } : {}),
        };
        setWorkspace(outWs);
      },

      // Métricas del monitor (cada segundo)
      onMetricsUpdate: (metrics, anomalies) => {
        setMetrics({
          elapsedTime: metrics.elapsedTime,
          currentCost: metrics.currentCost,
          tokensUsed: metrics.tokensUsed,
          currentStep: metrics.currentStep,
          totalSteps: currentSteps.length,
        });
        // Añadir anomalías nuevas
        anomalies.forEach((a) => {
          addAnomaly({ type: a.type, severity: a.severity, message: a.message });
        });
      },

      // Completado
      onComplete: (result) => {
        setWorking(false);
        setCurrentAgent(null);

        // Actualizar conversación como completada
        updateConversation(conversation.id, {
          status: result.success ? "completed" : "failed",
          summary: result.report.content.slice(0, 200),
          learnedPatterns: result.learnedPatterns,
        });

        // Aprender de la conversación (memoria episódica + semántica)
        // Ya lo hace el orquestador internamente

        simulatingRef.current = null;
      },

      // Error
      onError: (error) => {
        setWorking(false);
        setCurrentAgent(null);
        updateMessage(conversation.id, assistantMsgId, {
          agentStatus: "failed",
          output: {
            type: "text",
            content: `Error: ${error}`,
          },
        });
        updateConversation(conversation.id, { status: "failed" });
        simulatingRef.current = null;
      },
    }).catch((error) => {
      console.error("Orchestrator error:", error);
      setWorking(false);
      simulatingRef.current = null;
    });

  }, [conversations, currentConversationId, addMessage, updateMessage, updateStep, updateConversation, setWorkspace, appendTerminalLine, setWorking, setCurrentAgent, setMetrics, addAnomaly, clearAnomalies, clearWorkingMemory, updateWorkspaceForStep]);
}

function getInitialMessageForCategory(category: string): string {
  const messages: Record<string, string> = {
    research: "Voy a investigar el tema sistemáticamente. Primero buscaré información relevante, luego analizaré los datos y finalmente generaré un reporte estructurado.",
    code: "Voy a analizar el requerimiento y generar código limpio y testeable. Primero entenderé la estructura, luego implementaré la solución y finalmente añadiré tests.",
    data: "Voy a procesar los datos sistemáticamente. Primero cargaré el dataset, luego aplicaré transformaciones y finalmente generaré visualizaciones.",
    automation: "Voy a configurar la automatización paso a paso. Primero configuraré los triggers, luego las acciones y finalmente testearé el flujo completo.",
    content: "Voy a crear el contenido paso a paso. Primero investigaré el tema, luego estructuraré las ideas y finalmente redactaré el contenido optimizado.",
    general: "Voy a trabajar en esta tarea. Te mostraré el progreso en el panel derecho.",
  };
  return messages[category] || messages.general;
}
