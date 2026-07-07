"use client";

import { useEffect, useRef, useCallback } from "react";
import { useTaskStore } from "@/lib/store-task";
import { useExecutionStore } from "@/lib/store-execution";
import { useMemoryStore } from "@/lib/memory/memory-store";
import { useAppStore } from "@/lib/store-app";
import type { ChatMessage, ExecutionStep, MessageOutput } from "@/lib/types";
import { getOrchestrator } from "@/lib/agents/orchestrator";
import { detectSimpleTask } from "@/lib/agents/simple-task-detector";
import { getAdapter, type ChatMessage as LLMChatMessage } from "@/lib/agents/opencode-adapter";
import { streamAgentExecution } from "@/lib/agents/stream-client";
import { sanitizeLLMOutput } from "@/lib/utils";
import { exportReport, type ExportFormat } from "@/lib/export-report";
import { detectConnectorIntent, executeConnectorIntent, formatConnectorResult } from "@/lib/integrations/intent-detector";

// ==================== HOOK DE EJECUCIÓN ====================
// Este hook conecta el frontend con el orquestador de los 7 agentes.
//
// Flujo:
// 1. Usuario envía mensaje
// 2. Se detecta si es una conversación simple o una tarea compleja
// 3. Simple: responde directamente con el LLM configurado
// 4. Compleja: ejecuta el orquestador con los 7 agentes
// 5. Los callbacks actualizan el store en tiempo real

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

  const updateWorkspaceForStep = useCallback((step: ExecutionStep, output?: MessageOutput) => {
    if (output?.type === "image") {
      setWorkspace({
        activeTab: "browser",
        browser: {
          url: output.url || "",
          title: output.title || step.description,
          loading: output.loading ?? false,
          screenshot: output.content,
        },
      });
      return;
    }
    if (output?.type === "code") {
      setWorkspace({
        activeTab: "files",
        files: [{ name: output.title || "output.ts", path: "/output.ts", type: "file", modified: new Date().toISOString() }],
        activeFile: { name: output.title || "output.ts", content: output.content, language: output.language || "typescript" },
      });
      return;
    }
    if (output?.type === "file") {
      setWorkspace({
        activeTab: "files",
        files: [{ name: output.filename || output.title || "output.md", path: "/output.md", type: "file", modified: new Date().toISOString() }],
        activeFile: { name: output.filename || output.title || "output.md", content: output.content, language: "markdown" },
      });
      return;
    }

    if (step.produces === "browser") {
      const url = typeof step.toolParams?.url === "string" ? step.toolParams.url : "https://example.com/search";
      setWorkspace({
        activeTab: "browser",
        browser: { url, title: step.description, loading: true },
      });
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

    // ===== DETECCIÓN DE SOLICITUD DE DESCARGA =====
    // Si el usuario pide un formato descargable (PDF, Excel, etc.), buscamos el
    // último contenido generado y disparamos la descarga directamente, sin
    // activar el orquestador. Esto es lo que espera un usuario no técnico.
    const downloadRequest = detectDownloadRequest(userMsg.content);
    if (downloadRequest) {
      // Buscar el último output generado en la conversación
      const lastOutput = [...conversation.messages]
        .reverse()
        .find((m) => m.role === "assistant" && m.output?.content)?.output;

      if (lastOutput?.content) {
        // Disparar descarga inmediata
        exportReport(lastOutput.content, downloadRequest.format, downloadRequest.baseName);

        // Responder al usuario con un mensaje de confirmación
        const simKey2 = `${conversation.id}:${userMsg.id}`;
        if (simulatingRef.current === simKey2) return;
        simulatingRef.current = simKey2;

        const confirmMsgId = `m-${Date.now()}-assistant`;
        addMessage(conversation.id, {
          id: confirmMsgId,
          role: "assistant",
          content: `Tu archivo **${downloadRequest.baseName}.${downloadRequest.ext}** se está descargando ahora mismo. Si no inicia automáticamente, revisa la carpeta de descargas de tu navegador.`,
          timestamp: new Date().toISOString(),
          agentStatus: "completed",
          steps: [],
        });
        setWorking(false);
        simulatingRef.current = null;
        return;
      } else {
        // No hay contenido previo para descargar — responder explicando
        const simKey3 = `${conversation.id}:${userMsg.id}`;
        if (simulatingRef.current === simKey3) return;
        simulatingRef.current = simKey3;

        const noContentMsgId = `m-${Date.now()}-assistant`;
        addMessage(conversation.id, {
          id: noContentMsgId,
          role: "assistant",
          content: `Aún no hay contenido generado en esta conversación para descargar como **${downloadRequest.ext.toUpperCase()}**. Primero pídeme que genere un reporte, análisis o documento, y luego podrás descargarlo en el formato que prefieras.`,
          timestamp: new Date().toISOString(),
          agentStatus: "completed",
          steps: [],
        });
        setWorking(false);
        simulatingRef.current = null;
        return;
      }
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

    // Crear mensaje inicial del asistente (se actualizará conforme avanza)
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
    const apiConfig = useAppStore.getState().apiConfig;
    const agentMode = useAppStore.getState().agentMode ?? "economy";
    const internetMode = useAppStore.getState().internetMode ?? false;
    const defaultModel = apiConfig?.selectedModel || "kimi-k2.7-code";
    // Consideramos la API key válida si está presente y tiene longitud suficiente.
    // No exigimos testResult === "success" porque el estado puede no hidratarse
    // tras una recarga; si la key fuera inválida, el LLM devolverá error y el
    // fallback lo manejará.
    const hasApiKey = Boolean(apiConfig?.apiKey && apiConfig.apiKey.length >= 10);

    // Inicializar adaptador LLM con la API key del usuario
    const adapter = getAdapter();
    if (apiConfig?.apiKey) {
      adapter.initialize(apiConfig.apiKey);
      adapter.selectModel(defaultModel);
    }

    // Detectar si es conversación simple (lo usa el backend y el fallback)
    const detection = detectSimpleTask(userMsg.content);

    // Construir historial previo y objetivo (compartido por ambos flujos)
    const previousMessages = conversation.messages
      .filter((m) => m.id !== assistantMsgId && m.id !== userMsg.id)
      .slice(-4);
    // Si el usuario adjuntó archivos (imágenes, etc.), lo incluimos en el prompt
    // para que el LLM/agent sepa que existen y pueda usarlos/referenciarlos.
    const attachments = userMsg.attachments && userMsg.attachments.length > 0 ? userMsg.attachments : undefined;
    const attachmentsBlock = attachments && attachments.length > 0
      ? `\n\n[ARCHIVOS ADJUNTOS POR EL USUARIO]\n${attachments.map((a, i) =>
          `- (${i + 1}) ${a.type} "${a.name}" — ${a.url}${a.thumbnailUrl && a.thumbnailUrl !== a.url ? ` (thumbnail: ${a.thumbnailUrl})` : ""}`
        ).join("\n")}\nSi son imágenes, descríbelas o úsalas como contexto visual. Si necesitas analizarlas, descárgalas vía fetch y aplícales las herramientas necesarias (sandbox, código, análisis).` + (attachments.some(a => a.type.startsWith("image/")) ? `\nPara modelos con visión, considera incluir las URLs como image_url en el LLM si está disponible.` : "") + `\n[/ARCHIVOS ADJUNTOS]\n`
      : "";
    const contextPrompt =
      previousMessages.length > 0
        ? `Contexto previo de la conversación:\n${previousMessages
            .map((m) => `${m.role === "user" ? "Usuario" : "Asistente"}: ${m.content.slice(0, 300)}` + (m.attachments && m.attachments.length ? ` (con ${m.attachments.length} archivo(s) adjunto(s))` : ""))
            .join("\n")}\n\nNuevo mensaje del usuario: ${userMsg.content}${attachmentsBlock}`
        : `${userMsg.content}${attachmentsBlock}`;

    let userObjective = extractUserObjective(userMsg.content);
    const lastUserMessage = previousMessages.slice().reverse().find((m) => m.role === "user");
    if (lastUserMessage && isVagueObjective(userObjective)) {
      const previousTopic = extractUserObjective(lastUserMessage.content);
      if (previousTopic && previousTopic.length > 5 && !previousTopic.toLowerCase().includes(userObjective.toLowerCase())) {
        userObjective = `${userObjective} (${previousTopic})`;
      }
    }

    // ===== RAMA BACKEND (con API key válida) =====
    // La orquestación de los 7 agentes se ejecuta en el servidor (no en el
    // navegador). El progreso llega vía SSE. Si el usuario cierra la pestaña,
    // la ejecución continúa en el backend.
    if (hasApiKey && apiConfig?.apiKey) {
      const currentStepsRef: { current: ExecutionStep[] } = { current: [] };

      streamAgentExecution(
        {
          objective: contextPrompt,
          conversationId: conversation.id,
          userObjective,
          apiKey: apiConfig.apiKey,
          previousMessages: previousMessages.map((m) => ({ role: m.role, content: m.content.slice(0, 300) })),
          forceSimple: detection.isSimple && detection.confidence > 0.6,
          mode: agentMode,
          internetMode,
        },
        {
          onStart: () => {
            setWorking(true);
          },
          onAnalysisComplete: (analysis) => {
            setCurrentAgent("analyzer");
            updateMessage(conversation.id, assistantMsgId, {
              content: `Voy a trabajar en esto. He analizado tu objetivo: ${analysis.context}. Complejidad: ${analysis.complexity}.`,
            });
          },
          onPlanCreated: (plan, category) => {
            setCurrentAgent("planner");
            currentStepsRef.current = plan.steps;
            updateMessage(conversation.id, assistantMsgId, {
              content: getInitialMessageForCategory(category),
              steps: plan.steps,
            });
            updateConversation(conversation.id, { category, modelUsed: defaultModel });
          },
          onStepStarted: (step, agentStatus) => {
            setCurrentAgent(step.agent || null);
            updateMessage(conversation.id, assistantMsgId, { agentStatus });
            updateStep(conversation.id, assistantMsgId, step.id, {
              status: "running",
              startedAt: new Date().toISOString(),
            });
            updateWorkspaceForStep(step);
          },
          onStepProgress: (stepId, log) => {
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
            const step = currentStepsRef.current.find((s) => s.id === stepId);
            if (step?.produces === "terminal") {
              appendTerminalLine({ type: "output", text: log });
            }
          },
          onStepCompleted: (step, result, output) => {
            const duration = step.duration || Math.floor(Math.random() * 30) + 10;
            updateStep(conversation.id, assistantMsgId, step.id, {
              status: "completed",
              completedAt: new Date().toISOString(),
              duration,
              result,
            });
            if (output) updateWorkspaceForStep(step, output);
          },
          onStepFailed: (step, error) => {
            updateStep(conversation.id, assistantMsgId, step.id, {
              status: "failed",
              completedAt: new Date().toISOString(),
              error,
            });
          },
          onVerificationResult: () => setCurrentAgent("verifier"),
          onOptimizationSuggestions: (optimization) => {
            setCurrentAgent("optimizer");
            optimization.suggestions.forEach((s) => {
              useMemoryStore.getState().storeOptimization(s.title, s.timeReduction);
            });
          },
          onReportGenerated: (output) => {
            setCurrentAgent("reporter");
            const reportContent = sanitizeLLMOutput(output.content || "");
            const displayContent = reportContent.slice(0, 1200) + (reportContent.length > 1200 ? "\n\n..." : "");
            updateMessage(conversation.id, assistantMsgId, {
              agentStatus: "completed",
              content: displayContent,
              output: { ...output, content: reportContent },
            });
            setWorkspace({
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
            });
          },
          onMetricsUpdate: (metrics, anomalies) => {
            setMetrics({
              elapsedTime: metrics.elapsedTime,
              currentCost: metrics.currentCost,
              tokensUsed: metrics.tokensUsed,
              currentStep: metrics.currentStep,
              totalSteps: currentStepsRef.current.length,
            });
            anomalies.forEach((a) => {
              addAnomaly({ type: a.type, severity: a.severity, message: a.message });
            });
          },
          onComplete: (result) => {
            setWorking(false);
            setCurrentAgent(null);
            const reporterModel = result.plan.steps.find((s) => s.agent === "reporter")?.modelUsed || defaultModel;
            updateConversation(conversation.id, {
              status: result.success ? "completed" : "failed",
              summary: result.report.content.slice(0, 200),
              learnedPatterns: result.learnedPatterns,
              tokensUsed: result.execution.tokensUsed,
              cost: result.execution.actualCost,
              modelUsed: reporterModel,
            });
            simulatingRef.current = null;
          },
          onSimpleStart: () => {
            updateMessage(conversation.id, assistantMsgId, { content: "", agentStatus: "thinking" });
          },
          onSimpleChunk: (content) => {
            updateMessage(conversation.id, assistantMsgId, { content, agentStatus: "thinking" });
          },
          onSimpleDone: (data) => {
            updateMessage(conversation.id, assistantMsgId, { content: data.content, agentStatus: "completed" });
            updateConversation(conversation.id, {
              status: "completed",
              modelUsed: defaultModel,
              tokensUsed: data.tokensUsed,
              cost: data.cost,
              summary: data.content.slice(0, 200),
            });
            setWorkspace({
              activeTab: "output",
              output: { type: "text", content: data.content, title: "Respuesta" },
            });
            setWorking(false);
            setCurrentAgent(null);
            simulatingRef.current = null;
          },
          onDone: (data) => {
            if (data.tokensUsed) {
              updateConversation(conversation.id, {
                tokensUsed: data.tokensUsed,
                cost: data.cost,
              });
            }
          },
          onError: (error) => {
            setWorking(false);
            setCurrentAgent(null);
            updateMessage(conversation.id, assistantMsgId, {
              agentStatus: "failed",
              output: { type: "text", content: `Error: ${error}` },
            });
            updateConversation(conversation.id, { status: "failed" });
            simulatingRef.current = null;
          },
        }
      ).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        console.warn("[Backend execution] no disponible, fallback al cliente:", message);
        // Si el backend falla (endpoint no compilado, red caída), caer al flujo
        // cliente con el adaptador real (sigue usando OpenCode Go vía proxy).
        const historyMessages: LLMChatMessage[] = conversation.messages
          .filter((m) => m.id !== assistantMsgId && (m.role === "user" || m.role === "assistant"))
          .slice(-4)
          .map((m) => ({ role: m.role, content: m.content }));
        handleDirectResponse({
          content: userMsg.content,
          conversationId: conversation.id,
          assistantMsgId,
          model: defaultModel,
          hasApiKey: true,
          adapter,
          historyMessages,
          internetMode,
          onComplete: () => {
            simulatingRef.current = null;
          },
        });
      });

      return;
    }

    // ===== FALLBACK CLIENTE (sin API key): usa simulaciones locales =====
    if (detection.isSimple && detection.confidence > 0.6) {
      // ========== RESPUESTA DIRECTA (conversación simple) ==========
      // Incluimos el historial previo de la conversación para mantener contexto.
      // Limitado a los últimos 4 mensajes para controlar costos.
      const historyMessages: LLMChatMessage[] = conversation.messages
        .filter((m) => m.id !== assistantMsgId && (m.role === "user" || m.role === "assistant"))
        .slice(-4)
        .map((m) => ({ role: m.role, content: m.content }));

      handleDirectResponse({
        content: userMsg.content,
        conversationId: conversation.id,
        assistantMsgId,
        model: defaultModel,
        hasApiKey,
        adapter,
        historyMessages,
        internetMode,
        onComplete: () => {
          simulatingRef.current = null;
        },
      });
      return;
    }

    // ========== EJECUTAR ORQUESTADOR EN CLIENTE (fallback, sin API key) ==========
    const orchestrator = getOrchestrator();

    // previousMessages, contextPrompt y userObjective ya fueron calculados arriba.
    // Crear plan inicial vacío (se actualizará cuando el Planificador termine)
    let currentSteps: ExecutionStep[] = [];

    (async () => {
      try {
        await orchestrator.executeTask(contextPrompt, conversation.id, {
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
          onStepCompleted: (step, result, output) => {
            const duration = step.duration || Math.floor(Math.random() * 30) + 10;
            updateStep(conversation.id, assistantMsgId, step.id, {
              status: "completed",
              completedAt: new Date().toISOString(),
              duration,
              result,
            });

            // Si el paso generó output enriquecido, mostrarlo en el workspace
            if (output) {
              updateWorkspaceForStep(step, output);
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
          onVerificationResult: () => {
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

            // El contenido del reporte se muestra tanto en el chat como en el workspace
            const reportContent = sanitizeLLMOutput(output.content || "");
            const displayContent = reportContent.slice(0, 1200) + (reportContent.length > 1200 ? "\n\n..." : "");

            // Marcar mensaje como completado con output y contenido legible
            updateMessage(conversation.id, assistantMsgId, {
              agentStatus: "completed",
              content: displayContent,
              output: { ...output, content: reportContent },
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

            // Actualizar conversación con tokens/costo reales y modelo usado por el reportero
            const reporterModel = result.plan.steps.find((s) => s.agent === "reporter")?.modelUsed || defaultModel;
            updateConversation(conversation.id, {
              status: result.success ? "completed" : "failed",
              summary: result.report.content.slice(0, 200),
              learnedPatterns: result.learnedPatterns,
              tokensUsed: result.execution.tokensUsed,
              cost: result.execution.actualCost,
              modelUsed: reporterModel,
            });

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
        }, userObjective);
      } catch (error) {
        console.error("Orchestrator error:", error);
        const message = error instanceof Error ? error.message : "Error desconocido";
        updateMessage(conversation.id, assistantMsgId, {
          agentStatus: "failed",
          output: { type: "text", content: `Error: ${message}` },
        });
        updateConversation(conversation.id, { status: "failed" });
      } finally {
        setWorking(false);
        setCurrentAgent(null);
        simulatingRef.current = null;
      }
    })();

  }, [conversations, currentConversationId, addMessage, updateMessage, updateStep, updateConversation, setWorkspace, appendTerminalLine, setWorking, setCurrentAgent, setMetrics, addAnomaly, clearAnomalies, clearWorkingMemory, updateWorkspaceForStep]);
}

// ==================== RESPUESTA DIRECTA ====================
// Para conversaciones simples, responder directamente con el LLM sin
// activar el pipeline de 7 agentes.

interface DirectResponseOptions {
  content: string;
  conversationId: string;
  assistantMsgId: string;
  model: string;
  hasApiKey: boolean;
  adapter: ReturnType<typeof getAdapter>;
  historyMessages?: LLMChatMessage[];
  internetMode?: boolean;
  onComplete: () => void;
}

async function handleDirectResponse(options: DirectResponseOptions) {
  const { content, conversationId, assistantMsgId, model, hasApiKey, adapter, historyMessages = [], internetMode = false, onComplete } = options;

  // Actualizar estado
  const updateMessage = useTaskStore.getState().updateMessage;
  const updateConversation = useTaskStore.getState().updateConversation;
  const setWorking = useExecutionStore.getState().setWorking;
  const setWorkspace = useExecutionStore.getState().setWorkspace;
  const setCurrentAgent = useExecutionStore.getState().setCurrentAgent;

  setCurrentAgent(null);
  updateMessage(conversationId, assistantMsgId, {
    content: "",
    agentStatus: "thinking",
  });

  let responseText = "";
  let tokensUsed = 0;
  let cost = 0;

    try {
      let internetContext = "";

// Contexto de conectores: inyectar estado de conexiones del usuario
      let connectedConnectors: Array<{ source: string; name: string; description: string; actions: string[] }> = [];
      let connectorsContext = "";
      try {
        const connRes = await fetch("/api/connectors/connected");
        if (connRes.ok) {
          const connData = await connRes.json();
          connectedConnectors = connData.connected || [];
          if (connectedConnectors.length > 0) {
            const lines = connectedConnectors.map(
              (c: { name: string; source: string; description: string; actions: string[] }) =>
                `- ${c.name} (${c.source}): ${c.description}. Acciones disponibles: ${c.actions.join(", ")}`
            );
            connectorsContext = `\n\n[CONECTORES CONECTADOS DEL USUARIO]\nEl usuario tiene los siguientes conectores externos conectados y listos para usar:\n${lines.join("\n")}\nCuando el usuario pregunte sobre conexiones, integraciones o datos de estas fuentes, confirma que están conectadas y describe qué acciones puede ejecutar.\n[/CONECTORES]\n\n`;
          }
        }
      } catch (err) {
        console.warn("[handleDirectResponse] Connectors fetch failed:", err);
      }

      // === DETECTAR Y EJECUTAR ACCIÓN DE CONECTOR ===
      // Si el usuario pide algo que mapea a una acción de conector (ej: "listar
      // mis repos"), ejecutar la acción directamente y responder con el
      // resultado formateado, sin pasar por el LLM.
      const cleanedMessage = content.replace(/^Contexto previo[\s\S]*?Nuevo mensaje del usuario:\s*/i, "").trim();
      const intent = detectConnectorIntent(cleanedMessage, connectedConnectors, historyMessages);
      if (intent && intent.confidence > 0.5) {
        updateMessage(conversationId, assistantMsgId, {
          content: `🔌 Ejecutando **${intent.source}/${intent.action}**...`,
          agentStatus: "thinking",
        });
        const actionResult = await executeConnectorIntent(intent);
        const formatted = formatConnectorResult(intent.source, intent.action, actionResult || { success: false, error: "sin respuesta" });
        updateMessage(conversationId, assistantMsgId, {
          content: formatted,
          agentStatus: "completed",
        });
        updateConversation(conversationId, {
          status: "completed",
          modelUsed: "connector:" + intent.source,
          tokensUsed: 0,
          cost: 0,
          summary: formatted.slice(0, 200),
        });
        setWorkspace({
          activeTab: "output",
          output: { type: "text", content: formatted, title: `${intent.source}/${intent.action}` },
        });
        setWorking(false);
        setCurrentAgent(null);
        onComplete();
        return;
      }

      if (internetMode) {
        try {
          updateMessage(conversationId, assistantMsgId, {
            content: "🌐 Buscando en internet...",
            agentStatus: "thinking",
          });
          const rawQuery = content.replace(/^Contexto previo[\s\S]*?Nuevo mensaje del usuario:\s*/i, "").trim();
          const query = resolveSearchQuery(rawQuery, historyMessages);
          const searchRes = await fetch("/api/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, limit: 5 }),
          });
          const searchData = await searchRes.json();
          const results = searchData.results || [];
          if (results.length > 0) {
            const top = results.slice(0, 3);
            const fetched = await Promise.allSettled(
              top.map((r: { url: string }) =>
                fetch("/api/webfetch", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ url: r.url, timeoutMs: 12000 }),
                })
                  .then((r) => r.json())
                  .catch(() => null)
              )
            );
            const snippets = top
              .map((r: { title: string; url: string; snippet: string }, i: number) => {
                const f = fetched[i];
                const text = f.status === "fulfilled" && f.value?.text
                  ? f.value.text.slice(0, 2000)
                  : r.snippet;
                return `### ${r.title}\nURL: ${r.url}\n${text}`;
              })
              .join("\n\n---\n\n");
            internetContext = `\n\n[CONTEXTO WEB ACTUALIZADO — ${new Date().toISOString()}]\nResultados de búsqueda para "${query}":\n${snippets}\n[/CONTEXTO WEB]\n\n`;
          }
        } catch (err) {
          console.warn("[handleDirectResponse] Internet search failed:", err);
        }
      }

      if (hasApiKey) {
        const systemContent = internetMode
          ? "Eres un asistente IA útil, conciso y profesional. Se te ha proporcionado contexto web actualizado extraído de internet. Úsalo para responder con información actual y cita las URL relevantes. Mantén el contexto de la conversación previa. También conoces los conectores que el usuario tiene conectados."
          : "Eres un asistente IA útil, conciso y profesional. Responde directamente a la pregunta del usuario sin usar herramientas ni pasos de ejecución. Mantén el contexto de la conversación previa. Conoces los conectores que el usuario tiene conectados e puedes describir sus acciones disponibles.";

        const userContent = `${content}${connectorsContext}${internetContext}`;

        const messages: LLMChatMessage[] = [
          { role: "system", content: systemContent },
          ...historyMessages,
          { role: "user", content: userContent },
        ];

        // Usar streaming si está disponible
        const stream = adapter.stream(messages, { model, maxTokens: 2048 });
      let streamedText = "";
      for await (const chunk of stream) {
        streamedText += chunk;
        updateMessage(conversationId, assistantMsgId, {
          content: streamedText,
          agentStatus: "thinking",
        });
      }

      responseText = sanitizeLLMOutput(streamedText);
      // Estimación conservadora de tokens/costo (se actualizará cuando haya API real)
      tokensUsed = Math.floor((responseText.length + content.length) / 4);
      cost = (tokensUsed / 1_000_000) * 2.0;
    } else {
      // Sin API key: si hay contexto web, mostrarlo; si no, respuesta simulada
      if (internetMode && internetContext) {
        responseText = `## Resultados de búsqueda en internet\n\n${internetContext.replace(/\[CONTEXTO WEB[^\]]*\]/g, "").replace(/\[\/CONTEXTO WEB\]/g, "").trim()}\n\n---\n_Nota: configura tu API key de OpenCode en Settings para obtener respuestas procesadas por el LLM._`;
      } else {
        await new Promise((r) => setTimeout(r, 600));
        responseText = generateSimulatedSimpleResponse(content);
      }
      tokensUsed = Math.floor(responseText.length / 4);
      cost = 0;
      updateMessage(conversationId, assistantMsgId, {
        content: responseText,
        agentStatus: "thinking",
      });
    }

    // Mensaje final completado
    updateMessage(conversationId, assistantMsgId, {
      content: responseText,
      agentStatus: "completed",
    });

    // Usar métricas reales del adaptador si están disponibles
    const usage = adapter.getUsageStats();
    const finalTokens = usage.totalTokens || tokensUsed;
    const finalCost = usage.totalCost || cost;

    updateConversation(conversationId, {
      status: "completed",
      modelUsed: model,
      tokensUsed: finalTokens,
      cost: finalCost,
      summary: responseText.slice(0, 200),
    });

    setWorkspace({
      activeTab: "output",
      output: { type: "text", content: responseText, title: "Respuesta" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error generando respuesta";
    updateMessage(conversationId, assistantMsgId, {
      content: `No pude generar una respuesta: ${message}`,
      agentStatus: "failed",
    });
    updateConversation(conversationId, { status: "failed" });
  } finally {
    setWorking(false);
    setCurrentAgent(null);
    onComplete();
  }
}

function generateSimulatedSimpleResponse(content: string): string {
  const lower = content.toLowerCase().trim();

  if (/^hola|^hey|^saludos/.test(lower)) {
    return "¡Hola! ¿En qué puedo ayudarte hoy?";
  }
  if (/^gracias/.test(lower)) {
    return "¡De nada! Estoy aquí para lo que necesites.";
  }
  if (/^adi[oó]s|^chao|^hasta luego/.test(lower)) {
    return "¡Hasta luego! Que tengas un buen día.";
  }
  if (/qué eres|^quién eres/.test(lower)) {
    return "Soy un agente IA multi-agente. Puedo responder preguntas, generar código, investigar, automatizar tareas y mucho más.";
  }
  if (/qué puedes hacer|^capacidades/.test(lower)) {
    return "Puedo ayudarte con investigación, generación de código, análisis de datos, automatización, contenido y navegación web. Para tareas complejas activo un equipo de 7 agentes especializados.";
  }

  return `Entiendo tu pregunta sobre "${content.slice(0, 60)}${content.length > 60 ? "..." : ""}". Aquí tienes una respuesta directa:\n\n(Respuesta simulada: configura una API key en Settings para respuestas reales del LLM)`;
}

// Extrae la petición actual del usuario descartando contenido pegado de
// respuestas anteriores, bloques markdown y metadatos. Esto evita que el
// orquestador confunda el objetivo real con texto copiado de un reporte previo.
function extractUserObjective(rawContent: string): string {
  const lines = rawContent.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return rawContent;

  const firstLine = lines[0].trim();

  // Si la primera línea parece una petición directa, usarla como objetivo.
  const requestPrefixes = /^(hazme|haz|hazlo|genera|crea|escribe|redacta|investiga|analiza|reporte|realiza|elabora|desarrolla|prepara|busca|encuentra|dame|muéstrame|muestrame|cuéntame|cuentame|dime|por favor|quiero|necesito|puedes|podrías|podrias)\b/i;
  if (requestPrefixes.test(firstLine)) {
    return firstLine.replace(/\s+/g, " ").trim();
  }

  // Si no, tomar el primer párrafo corto (máximo 3 líneas o 300 caracteres).
  const firstParagraph = lines.slice(0, 3).join(" ").trim();
  if (firstParagraph.length <= 300) return firstParagraph;

  return firstParagraph.slice(0, 300).trim();
}

// Detecta si un objetivo es demasiado vago como para buscar o categorizar solo.
// Se usa para enriquecer con el tema del mensaje previo del usuario.
function isVagueObjective(objective: string): boolean {
  if (!objective) return true;
  const lower = objective.toLowerCase();
  const vagueMarkers = ["reporte", "hazlo", "continúa", "continua", "sigue", "realiza", "elabora", "desarrolla", "prepara", "haz"];
  const hasVagueMarker = vagueMarkers.some((m) => lower.includes(m));
  const wordCount = objective.split(/\s+/).filter(Boolean).length;
  // Se considera vago si es corto y contiene un marcador genérico, o si no tiene
  // un sustantivo/tema concreto (más de 4 palabras sin marcador).
  return hasVagueMarker && wordCount < 8;
}

// ==================== DETECCIÓN DE DESCARGA ====================
// Detecta si el usuario está pidiendo descargar el contenido en un formato
// específico. Soporta lenguaje natural en español e inglés.
function detectDownloadRequest(message: string): { format: ExportFormat; ext: string; baseName: string } | null {
  const lower = message.toLowerCase().trim();

  // Patrones de solicitud de descarga
  const downloadTriggers = [
    /d[aá]me(lo)?\s+(en|como|el|un)/i,
    /descarga(r|lo|me)?/i,
    /export(a(r|lo|me)?)?/i,
    /genera(r)?\s+(el|un|el\s+archivo)/i,
    /quiero\s+(el|un)\s+(archivo|reporte|documento)/i,
    /env[ií]a(me)?\s+(el|un)/i,
    /download/i,
    /guardar?\s+(como|en)/i,
    /en\s+formato/i,
    /como\s+(archivo|documento|reporte)/i,
  ];

  const isDownloadRequest = downloadTriggers.some((pattern) => pattern.test(lower));
  if (!isDownloadRequest) return null;

  // Detectar el formato solicitado
  if (/\bpdf\b/.test(lower)) {
    return { format: "pdf", ext: "pdf", baseName: "reporte" };
  }
  if (/\b(excel|xlsx|hoja\s+de\s+c[aá]lculo|spreadsheet)\b/.test(lower)) {
    return { format: "excel", ext: "xlsx", baseName: "reporte" };
  }
  if (/\b(html|p[aá]gina\s+web|web)\b/.test(lower)) {
    return { format: "html", ext: "html", baseName: "reporte" };
  }
  if (/\b(txt|texto\s+plano|plain\s+text)\b/.test(lower)) {
    return { format: "txt", ext: "txt", baseName: "reporte" };
  }
  if (/\b(markdown|md|mark\s+down)\b/.test(lower)) {
    return { format: "markdown", ext: "md", baseName: "reporte" };
  }

  // Si pide descarga sin especificar formato, usar PDF por defecto
  if (isDownloadRequest) {
    return { format: "pdf", ext: "pdf", baseName: "reporte" };
  }

  return null;
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

/**
 * Resuelve la query de búsqueda a partir del mensaje actual + historial.
 * Si el mensaje actual es una petición de reintento ("intenta de nuevo",
 * "otra vez", "hazlo de nuevo", "again", etc.), usa la última pregunta
 * sustantiva del historial. También traduce consultas sobre deportes/eventos
 * actuales al inglés para obtener mejores resultados de Bing.
 */
function resolveSearchQuery(
  currentMessage: string,
  history: LLMChatMessage[]
): string {
  const RETRY_PATTERNS = [
    /^(intenta|hazlo|prueba|haz)\s+(de nuevo|otra vez|lo de nuevo|otra)$/i,
    /^(intenta|prueba)\s+(de nuevo|otra vez)$/i,
    /^(again|retry|repeat|try again)$/i,
    /^(otra vez|de nuevo|repite)$/i,
    /^(no funcion|no sirve|sigue sin|dale soluci)/i,
  ];
  const isRetry = RETRY_PATTERNS.some((re) => re.test(currentMessage.trim().toLowerCase()));

  let query = currentMessage;

  if (isRetry) {
    // Buscar la última pregunta sustantiva del usuario en el historial
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i];
      if (msg.role === "user" && msg.content.length > 10) {
        const cleaned = msg.content
          .replace(/^Contexto previo[\s\S]*?Nuevo mensaje del usuario:\s*/i, "")
          .trim();
        if (cleaned.length > 10 && !RETRY_PATTERNS.some((re) => re.test(cleaned.toLowerCase()))) {
          query = cleaned;
          break;
        }
      }
    }
  }

  // Traducir consultas sobre eventos deportivos/actuales al inglés
  // para que Bing devuelva resultados más relevantes.
  const sportsTranslations: Array<[RegExp, string | ((m: string, ...g: string[]) => string)]> = [
    [/estados unidos\s+vs\s+belgic?a/i, "USA vs Belgium result"],
    [/belgic?a\s+vs\s+estados unidos/i, "Belgium vs USA result"],
    [/estados unidos\s+vs\s+([a-záéíóúñ\s]+)/i, (_m, t) => `USA vs ${t} result`],
    [/([a-záéíóúñ\s]+)\s+vs\s+estados unidos/i, (_m, t) => `${t} vs USA result`],
    [/resultado\s+(?:del?\s+)?partido/i, "match result today"],
    [/quien\s+gan/i, "who won today match"],
  ];
  for (const [re, replacement] of sportsTranslations) {
    if (re.test(query)) {
      query = query.replace(re, replacement as string);
      break;
    }
  }

  // Si la query sigue en español y menciona "partido de hoy" o "resultado",
  // añadir "2026" y "result" para mejor precisión.
  if (/partido|hoy|resultado|ganó|ganador/i.test(query) && !/result|today|2026/i.test(query)) {
    query = `${query} 2026 result`;
  }

  return query.slice(0, 200) || currentMessage.slice(0, 200);
}
