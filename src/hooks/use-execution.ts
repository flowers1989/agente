"use client";

import { useEffect, useRef } from "react";
import { useTaskStore } from "@/lib/store-task";
import { useExecutionStore } from "@/lib/store-execution";
import { useAppStore } from "@/lib/store-app";
import type {
  ChatMessage,
  ExecutionStep,
  WorkspaceState,
  AgentStatus,
  TaskCategory,
} from "@/lib/types";
import { TASK_TEMPLATES, detectCategory } from "@/lib/mock-data";

// Mapping de herramienta a estado interno del agente (invisible al usuario)
// El usuario solo ve "Trabajando..." pero internamente el agente cambia de estado
const STATUS_BY_TOOL: Record<string, AgentStatus> = {
  "Web Search": "browsing",
  "Web Extraction": "browsing",
  "Browser Navigation": "browsing",
  "Screenshot": "browsing",
  "Code Generation": "coding",
  "File Read": "analyzing",
  "File Write": "writing",
  "Python Execution": "executing",
  "Node.js Execution": "executing",
  "Bash/Shell Execution": "executing",
  "Testing": "verifying",
  "Data Analysis": "analyzing",
  "Visualization": "writing",
  "Document Generation": "writing",
  "Git": "executing",
  "HTTP Client": "browsing",
  "Notifications": "executing",
  "Workflow Automation": "executing",
  "Email": "executing",
  "Web Scraping": "browsing",
};

// Hook que simula un WebSocket - el backend real enviaría eventos así
// Internamente: PlannerAgent → ExecutorAgent → VerifierAgent
// El usuario NO ve qué agente está trabajando, solo ve "Trabajando..."
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

  const simulatingRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      // Si está en progreso, reanudar simulación
      if (nextMsg.agentStatus && nextMsg.agentStatus !== "completed" && nextMsg.agentStatus !== "failed") {
        const simKey = `${conversation.id}:${nextMsg.id}`;
        if (simulatingRef.current === simKey) return;
        simulatingRef.current = simKey;
        resumeSimulation(conversation.id, nextMsg);
      }
      return;
    }

    // Crear respuesta del asistente y empezar simulación
    const simKey = `${conversation.id}:${userMsg.id}`;
    if (simulatingRef.current === simKey) return;
    simulatingRef.current = simKey;

    const category = detectCategory(userMsg.content) as TaskCategory;
    const template = TASK_TEMPLATES[category];
    const assistantMsgId = `m-${Date.now()}-assistant`;

    // Crear steps basados en la plantilla (interno: planner/executor/verifier)
    // El usuario NO ve qué agente está trabajando
    const steps: ExecutionStep[] = template.steps.map((s, i) => ({
      id: `step-${i}-${Date.now()}`,
      stepNumber: i + 1,
      description: s.title,
      toolName: s.tool,
      toolCategory: s.toolCategory as ExecutionStep["toolCategory"],
      toolParams: {},
      status: "pending" as const,
      logs: [],
      produces: s.produces,
      agent: s.agent,
    }));

    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: template.description,
      timestamp: new Date().toISOString(),
      agentStatus: "thinking",
      steps,
    };

    addMessage(conversation.id, assistantMsg);
    setWorking(true);

    // Inicializar workspace
    setWorkspace({
      activeTab: "output",
      output: {
        type: "text",
        content: "Trabajando en tu tarea...",
      },
      terminal: { lines: [] },
      browser: undefined,
      files: undefined,
      activeFile: undefined,
    });

    // Empezar simulación
    setTimeout(() => startStepSimulation(conversation.id, assistantMsgId, steps, template, 0), 1200);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [conversations, currentConversationId, addMessage, updateMessage, updateStep, updateConversation, setWorkspace, appendTerminalLine, setWorking]);

  function resumeSimulation(conversationId: string, message: ChatMessage) {
    if (!message.steps) return;
    const conv = useTaskStore.getState().conversations.find((c) => c.id === conversationId);
    if (!conv) return;
    const userMsg = conv.messages.find((m, i, arr) => i + 1 < arr.length && arr[i + 1].id === message.id);
    if (!userMsg) return;
    const category = detectCategory(userMsg.content) as TaskCategory;
    const template = TASK_TEMPLATES[category];
    const idx = message.steps.findIndex((s) => s.status !== "completed");
    if (idx === -1) return;
    setTimeout(() => startStepSimulation(conversationId, message.id, message.steps!, template, idx), 500);
  }

  function startStepSimulation(
    conversationId: string,
    messageId: string,
    steps: ExecutionStep[],
    template: typeof TASK_TEMPLATES["general"],
    stepIndex: number
  ) {
    if (stepIndex >= steps.length) {
      // Todos los pasos completados
      const templateOutput = template.finalOutput;
      updateMessage(conversationId, messageId, {
        agentStatus: "completed",
        output: {
          type: templateOutput.type as "text" | "code" | "file" | "html",
          title: templateOutput.title,
          content: templateOutput.content,
          language: templateOutput.language,
          filename: templateOutput.filename,
        },
      });
      updateConversation(conversationId, { status: "completed" });
      setWorking(false);

      // Mostrar output final en workspace
      const outWs: Partial<WorkspaceState> = {
        activeTab: templateOutput.type === "html" ? "output" : templateOutput.type === "code" || templateOutput.type === "file" ? "files" : "output",
        output: {
          type: templateOutput.type === "html" ? "html" : templateOutput.type === "code" ? "code" : "text",
          content: templateOutput.content,
          title: templateOutput.title,
          language: templateOutput.language,
        },
      };
      if (templateOutput.type === "code") {
        outWs.activeFile = {
          name: templateOutput.title || "output.ts",
          content: templateOutput.content,
          language: templateOutput.language || "typescript",
        };
      }
      setWorkspace(outWs);
      simulatingRef.current = null;
      return;
    }

    const step = steps[stepIndex];
    const stepTemplate = template.steps[stepIndex];
    const agentStatus = STATUS_BY_TOOL[step.toolName] || "executing";

    // Marcar step como running y actualizar agentStatus
    // El usuario solo ve "Trabajando..." - no sabe qué agente está actuando
    updateStep(conversationId, messageId, step.id, {
      status: "running",
      startedAt: new Date().toISOString(),
    });
    updateMessage(conversationId, messageId, { agentStatus });

    // Actualizar workspace según lo que produce el step
    updateWorkspaceForStep(step, stepTemplate.produces);

    // Emitir logs progresivamente
    let logIdx = 0;
    const emitLog = () => {
      if (logIdx < stepTemplate.logs.length) {
        const logMsg = stepTemplate.logs[logIdx];
        const currentConv = useTaskStore.getState().conversations.find((c) => c.id === conversationId);
        const currentMsg = currentConv?.messages.find((m) => m.id === messageId);
        const currentStep = currentMsg?.steps?.find((s) => s.id === step.id);
        if (currentStep) {
          updateStep(conversationId, messageId, step.id, {
            logs: [...(currentStep.logs || []), {
              id: `log-${Date.now()}-${logIdx}`,
              timestamp: new Date().toISOString(),
              level: "info" as const,
              message: logMsg,
              stepId: step.id,
            }],
          });
        }
        if (stepTemplate.produces === "terminal") {
          appendTerminalLine({ type: "output", text: logMsg });
        }
        logIdx++;
        timerRef.current = setTimeout(emitLog, 800 + Math.random() * 700);
      } else {
        // Completar este step
        const duration = stepTemplate.duration;
        updateStep(conversationId, messageId, step.id, {
          status: "completed",
          completedAt: new Date().toISOString(),
          duration,
        });

        // Actualizar costo de la conversación
        const conv = useTaskStore.getState().conversations.find((c) => c.id === conversationId);
        if (conv) {
          const tokensForStep = Math.floor(Math.random() * 3000) + 1500;
          const costForStep = (tokensForStep / 1000) * 0.5;
          updateConversation(conversationId, {
            tokensUsed: conv.tokensUsed + tokensForStep,
            cost: conv.cost + costForStep,
          });
        }

        // Siguiente step
        timerRef.current = setTimeout(() => {
          startStepSimulation(conversationId, messageId, steps, template, stepIndex + 1);
        }, 600);
      }
    };
    timerRef.current = setTimeout(emitLog, 800);
  }

  function updateWorkspaceForStep(step: ExecutionStep, produces: ExecutionStep["produces"]) {
    if (produces === "browser") {
      setWorkspace({
        activeTab: "browser",
        browser: {
          url: "https://example.com/search",
          title: step.description,
          loading: true,
        },
      });
      setTimeout(() => {
        setWorkspace({
          browser: {
            url: "https://example.com/results",
            title: step.description,
            loading: false,
          },
        });
      }, 1500);
    } else if (produces === "terminal") {
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
    } else if (produces === "files") {
      setWorkspace({
        activeTab: "files",
        files: [
          { name: "src", path: "/src", type: "dir", modified: new Date().toISOString() },
          { name: "package.json", path: "/package.json", type: "file", size: 1840, modified: new Date().toISOString() },
          { name: "README.md", path: "/README.md", type: "file", size: 4200, modified: new Date().toISOString() },
          { name: "index.ts", path: "/src/index.ts", type: "file", size: 580, modified: new Date().toISOString() },
          { name: "solution.ts", path: "/src/solution.ts", type: "file", size: 2470, modified: new Date().toISOString() },
        ],
        activeFile: {
          name: "solution.ts",
          language: "typescript",
          content: `// ${step.description}\n// Generando...\n`,
        },
      });
    } else if (produces === "data") {
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
        output: {
          type: "text",
          title: step.description,
          content: `Trabajando en: ${step.description}...`,
        },
      });
    }
  }
}
