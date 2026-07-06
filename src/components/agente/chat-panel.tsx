"use client";

import { useTaskStore } from "@/lib/store-task";
import { useAppStore } from "@/lib/store-app";
import { useExecutionStore } from "@/lib/store-execution";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LogoMark } from "@/components/agente/logo";
import { MobileSidebarTrigger } from "@/components/agente/conversation-sidebar";
import {
  ArrowUp,
  Check,
  Loader2,
  ChevronRight,
  FileText,
  Terminal as TerminalIcon,
  Globe,
  Files,
  Sparkles,
  Download,
  Eye,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { formatTime, formatNumber, formatCost } from "@/lib/mock-data";
import type { ExecutionStep, ChatMessage } from "@/lib/types";
import { useTask } from "@/hooks/use-task";
import { IntegrationMenu } from "@/components/integration/IntegrationMenu";
import { exportReport, type ExportFormat } from "@/lib/export-report";
import { Markdown } from "@/components/ui/markdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PRODUCES_ICON: Record<string, typeof Globe> = {
  browser: Globe,
  terminal: TerminalIcon,
  files: Files,
  output: FileText,
  data: FileText,
};

export function ChatPanel() {
  const conversations = useTaskStore((s) => s.conversations);
  const currentConversationId = useTaskStore((s) => s.currentConversationId);
  const { createConversation, sendMessage } = useTask();
  const user = useAppStore((s) => s.user);
  const agentMode = useAppStore((s) => s.agentMode);
  const toggleAgentMode = useAppStore((s) => s.toggleAgentMode);
  const isWorking = useExecutionStore((s) => s.isWorking);

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const conversation = conversations.find((c) => c.id === currentConversationId);

  const messages = conversation?.messages;
  const lastMessageStepsLength = messages?.[messages.length - 1]?.steps?.length;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.messages.length, lastMessageStepsLength]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  const handleSubmit = () => {
    if (!input.trim()) return;
    const obj = input.trim();
    setInput("");

    if (currentConversationId) {
      // Continuar conversación existente
      sendMessage(currentConversationId, obj);
    } else {
      // Crear nueva conversación
      createConversation(obj);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Empty state
  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="h-12 px-4 flex items-center gap-2 border-b border-border shrink-0 md:hidden">
          <MobileSidebarTrigger />
          <LogoMark size={20} />
          <span className="font-medium text-sm">Agente</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="inline-flex mb-6"
            >
              <LogoMark size={48} animated />
            </motion.div>
            <h2 className="text-2xl font-semibold tracking-tight mb-2">
              ¿Qué puedo hacer por ti{user?.name ? `, ${user.name.split(" ")[0]}` : ""}?
            </h2>
            <p className="text-sm text-muted-foreground mb-8">
              Describe la tarea y el agente se encargará del resto.
            </p>

            <div className="space-y-2">
              {[
                "Investiga el mercado de tools AI y genera un reporte comparativo",
                "Refactoriza este proyecto PHP 5 a TypeScript con NestJS",
                "Crea un dashboard de ventas Q1 desde un CSV de 8000 filas",
                "Recopila noticias de IA y envía un newsletter a 1240 suscriptores",
                "Escribe 10 artículos SEO sobre tendencias de IA 2026",
              ].map((ex) => (
                <button
                  key={ex}
                  onClick={() => setInput(ex)}
                  className="w-full text-left px-3.5 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>
        <ChatInput
          input={input}
          setInput={setInput}
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          textareaRef={textareaRef}
          disabled={isWorking}
          agentMode={agentMode}
          onToggleMode={toggleAgentMode}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="md:hidden">
            <MobileSidebarTrigger />
          </div>
          <h3 className="text-sm font-medium truncate">{conversation.title}</h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <IntegrationMenu />
          {/* Botón de modo: Rápido / Calidad */}
          <button
            onClick={toggleAgentMode}
            disabled={isWorking}
            title={agentMode === "economy" ? "Modo Rápido: respuestas veloces y económicas. Clic para cambiar a Calidad." : "Modo Calidad: máxima precisión y razonamiento. Clic para cambiar a Rápido."}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all border",
              agentMode === "economy"
                ? "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                : "border-violet-500/50 text-violet-400 bg-violet-500/10 hover:bg-violet-500/20",
              isWorking && "opacity-40 cursor-not-allowed"
            )}
          >
            {agentMode === "economy" ? (
              <><Zap className="size-3" /><span className="hidden sm:inline">Rápido</span></>
            ) : (
              <><Sparkles className="size-3" /><span className="hidden sm:inline">Calidad</span></>
            )}
          </button>
          {isWorking && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="dot-anim inline-flex">
                <span /><span /><span />
              </span>
              <span className="hidden sm:inline">Trabajando</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {conversation.messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {conversation.status !== "active" && conversation.tokensUsed > 0 && (
            <div className="text-center text-[10px] text-muted-foreground/60 pt-4 border-t border-border/40">
              {formatNumber(conversation.tokensUsed)} tokens · {formatCost(conversation.cost)} · {conversation.modelUsed}
            </div>
          )}
        </div>
      </div>

      <ChatInput
        input={input}
        setInput={setInput}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        textareaRef={textareaRef}
        disabled={isWorking}
        agentMode={agentMode}
        onToggleMode={toggleAgentMode}
      />
    </div>
  );
}

function ChatInput({
  input,
  setInput,
  onSubmit,
  onKeyDown,
  textareaRef,
  disabled,
  agentMode,
  onToggleMode,
}: {
  input: string;
  setInput: (v: string) => void;
  onSubmit: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
  agentMode?: "economy" | "quality";
  onToggleMode?: () => void;
}) {
  return (
    <div className="p-3 border-t border-border shrink-0">
      <div className="max-w-3xl mx-auto">
        <div className="relative rounded-lg border border-border bg-card focus-within:border-foreground/30 transition-colors">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={disabled ? "El agente está trabajando..." : "Pide lo que necesites..."}
            disabled={disabled}
            className="min-h-[44px] max-h-[200px] resize-none bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm px-3 py-2.5 pr-12"
            rows={1}
          />
          <Button
            onClick={onSubmit}
            disabled={!input.trim() || disabled}
            size="icon"
            className="absolute right-1.5 bottom-1.5 size-7 rounded-md"
          >
            <ArrowUp className="size-3.5" />
          </Button>
        </div>
        <div className="flex items-center justify-between mt-2 px-0.5">
          <p className="text-[10px] text-muted-foreground/60">
            Enter para enviar · Shift+Enter para nueva línea
          </p>
          {onToggleMode && (
            <button
              onClick={onToggleMode}
              disabled={disabled}
              className={cn(
                "flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded transition-colors",
                agentMode === "quality"
                  ? "text-violet-400 hover:text-violet-300"
                  : "text-muted-foreground/60 hover:text-muted-foreground",
                disabled && "opacity-40 cursor-not-allowed"
              )}
            >
              {agentMode === "quality" ? (
                <><Sparkles className="size-2.5" /> Calidad</>
              ) : (
                <><Zap className="size-2.5" /> Rápido</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[85%] bg-foreground text-background rounded-2xl rounded-br-md px-3.5 py-2.5">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          <div className="text-[10px] opacity-60 mt-1.5">
            {formatTime(message.timestamp)}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2.5"
    >
      <div className="size-7 rounded-full bg-foreground text-background flex items-center justify-center shrink-0 mt-0.5">
        <LogoMark size={16} />
      </div>
      <div className="flex-1 min-w-0 space-y-3">
        {/* Indicador "Trabajando..." discreto - el usuario no sabe qué agente está actuando */}
        {message.agentStatus &&
          message.agentStatus !== "completed" &&
          message.agentStatus !== "failed" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="dot-anim inline-flex">
                <span /><span /><span />
              </span>
              <span>Trabajando...</span>
            </div>
          )}

        {/* Content */}
        <p className="text-sm leading-relaxed text-foreground/90">{message.content}</p>

        {/* Steps (timeline discreto) */}
        {message.steps && message.steps.length > 0 && (
          <div className="space-y-1">
            {message.steps.map((step) => (
              <StepRow key={step.id} step={step} />
            ))}
          </div>
        )}

        {/* Final output */}
        {message.output &&
          (message.agentStatus === "completed" || message.agentStatus === "failed") && (
            <OutputBlock message={message} />
          )}
      </div>
    </motion.div>
  );
}

function StepRow({ step }: { step: ExecutionStep }) {
  const Icon = PRODUCES_ICON[step.produces || "output"] || FileText;
  const setWorkspaceTab = useExecutionStore((s) => s.setWorkspaceTab);

  const handleClick = () => {
    if (step.produces) {
      setWorkspaceTab(step.produces);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={step.status === "pending"}
      className={cn(
        "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left transition-colors text-xs",
        step.status === "pending"
          ? "opacity-40 cursor-not-allowed"
          : "hover:bg-muted/60 cursor-pointer"
      )}
    >
      <div className="size-4 shrink-0 flex items-center justify-center">
        {step.status === "completed" && <Check className="size-3.5 text-foreground" />}
        {step.status === "running" && <Loader2 className="size-3.5 animate-spin text-foreground" />}
        {step.status === "failed" && <span className="text-destructive text-xs">✕</span>}
        {step.status === "pending" && <div className="size-1.5 rounded-full border border-muted-foreground" />}
      </div>
      <span
        className={cn(
          "flex-1 truncate",
          step.status === "completed" && "text-muted-foreground line-through decoration-muted-foreground/40",
          step.status === "running" && "text-foreground font-medium",
          step.status === "failed" && "text-destructive",
          step.status === "pending" && "text-muted-foreground"
        )}
      >
        {step.description}
      </span>
      {step.duration && step.status === "completed" && (
        <span className="text-[10px] text-muted-foreground/60 tabular-nums">{step.duration}s</span>
      )}
      {step.status !== "pending" && <Icon className="size-3 text-muted-foreground/60 shrink-0" />}
      {step.status !== "pending" && <ChevronRight className="size-3 text-muted-foreground/40 shrink-0" />}
    </button>
  );
}

function OutputBlock({ message }: { message: ChatMessage }) {
  const output = message.output!;
  const setWorkspace = useExecutionStore((s) => s.setWorkspace);
  const workspaceCollapsed = useExecutionStore((s) => s.workspaceCollapsed);
  const toggleWorkspace = useExecutionStore((s) => s.toggleWorkspace);

  const handleView = () => {
    if (workspaceCollapsed) toggleWorkspace();
    setWorkspace({
      activeTab:
        output.type === "code"
          ? "files"
          : "output",
      output: {
        type: output.type === "html" ? "html" : output.type === "code" ? "code" : "text",
        content: output.content,
        title: output.title,
        language: output.language,
      },
      ...(output.type === "code"
        ? {
            activeFile: {
              name: output.title || "output.ts",
              content: output.content,
              language: output.language || "typescript",
            },
          }
        : {}),
    });
  };

  const handleExport = (format: ExportFormat) => {
    const baseName = output.filename || output.title || "reporte";
    exportReport(output.content, format, baseName);
  };

  const exportOptions: { label: string; format: ExportFormat }[] = [
    { label: "Markdown (.md)", format: "markdown" },
    { label: "PDF (.pdf)", format: "pdf" },
    { label: "HTML (.html)", format: "html" },
    { label: "Texto (.txt)", format: "txt" },
    { label: "Excel (.xlsx)", format: "excel" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-lg border p-3",
        message.agentStatus === "failed"
          ? "bg-destructive/5 border-destructive/20"
          : "bg-muted/40 border-border"
      )}
    >
      {output.title && (
        <div className="flex items-center gap-1.5 mb-1.5">
          {message.agentStatus === "failed" ? (
            <span className="text-destructive text-xs">✕</span>
          ) : (
            <Sparkles className="size-3 text-foreground" />
          )}
          <span className="text-xs font-medium">{output.title}</span>
        </div>
      )}
      {output.content.includes("API KEY REQUERIDA") && (
        <div className="mb-2 rounded bg-destructive/10 border border-destructive/20 px-2.5 py-1.5 text-[11px] text-destructive font-medium">
          Falta una API key válida. El agente investigó el tema pero no puede redactar contenido. Configúrala en Configuración → API.
        </div>
      )}
      <div className="max-h-48 overflow-hidden relative">
        <Markdown content={output.content} compact />
        {output.content.length > 600 && (
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-muted/40 to-transparent pointer-events-none" />
        )}
      </div>
      {output.content.length > 400 && (
        <div className="mt-1.5 text-[10px] text-muted-foreground/70">
          El contenido está truncado. Abre el workspace para verlo completo.
        </div>
      )}
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={handleView}
          className="text-[10px] font-medium text-foreground hover:underline flex items-center gap-1"
        >
          <Eye className="size-2.5" />
          Ver en workspace
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-[10px] text-foreground hover:underline flex items-center gap-1">
              <Download className="size-2.5" />
              Descargar
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {exportOptions.map((opt) => (
              <DropdownMenuItem key={opt.format} onClick={() => handleExport(opt.format)} className="text-xs">
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}
