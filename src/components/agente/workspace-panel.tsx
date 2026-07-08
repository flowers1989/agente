"use client";

import { useExecutionStore } from "@/lib/store-execution";
import { Button } from "@/components/ui/button";
import {
  Globe,
  Terminal as TerminalIcon,
  Files,
  FileText,
  PanelRightClose,
  PanelRight,
  Loader2,
  RefreshCw,
  ExternalLink,
  Download,
  Copy,
  Check,
  Folder,
  File as FileIcon,
  Brain,
  Database,
  Lightbulb,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { WorkspaceTabType } from "@/lib/types";
import { toast } from "sonner";
import { useMemoryStore as useMemoryStoreForView } from "@/lib/memory/memory-store";
import { BrowserControlView } from "@/components/agente/browser/BrowserControlView";
import { Markdown } from "@/components/ui/markdown";

const TABS: { id: WorkspaceTabType; label: string; icon: typeof Globe }[] = [
  { id: "output", label: "Output", icon: FileText },
  { id: "browser", label: "Browser", icon: Globe },
  { id: "terminal", label: "Terminal", icon: TerminalIcon },
  { id: "files", label: "Files", icon: Files },
  { id: "data", label: "Data", icon: FileText },
  { id: "memory", label: "Memory", icon: Brain },
];

export function WorkspacePanel() {
  const workspace = useExecutionStore((s) => s.workspace);
  const setWorkspaceTab = useExecutionStore((s) => s.setWorkspaceTab);
  const collapsed = useExecutionStore((s) => s.workspaceCollapsed);
  const toggle = useExecutionStore((s) => s.toggleWorkspace);

  if (collapsed) {
    return (
      <button
        onClick={toggle}
        className="hidden lg:flex w-10 border-l border-border bg-card flex-col items-center py-3 hover:bg-muted transition-colors shrink-0"
      >
        <PanelRight className="size-4 text-muted-foreground" />
      </button>
    );
  }

  return (
    <motion.aside
      initial={{ width: 0 }}
      animate={{ width: "40%" }}
      exit={{ width: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="hidden lg:flex flex-col border-l border-border bg-card min-w-0 shrink-0"
      style={{ maxWidth: "50%" }}
    >
      <div className="h-12 px-3 flex items-center justify-between border-b border-border shrink-0">
        <div className="flex items-center gap-0.5 overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = workspace.activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setWorkspaceTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-all whitespace-nowrap border",
                  isActive 
                    ? "bg-gradient-to-r from-manus-primary/20 to-manus-secondary/20 text-manus-primary border-manus-primary/40 shadow-glow-violet" 
                    : "text-muted-foreground border-border hover:text-foreground hover:bg-muted/50 hover:border-foreground/20"
                )}
              >
                <tab.icon className="size-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={toggle}
          className="size-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <PanelRightClose className="size-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={workspace.activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            {workspace.activeTab === "browser" && <BrowserView />}
            {workspace.activeTab === "terminal" && <TerminalView />}
            {workspace.activeTab === "files" && <FilesView />}
            {workspace.activeTab === "output" && <OutputView />}
            {workspace.activeTab === "data" && <DataView />}
            {workspace.activeTab === "memory" && <MemoryView />}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}

function BrowserView() {
  return <BrowserControlView />;
}

function TerminalView() {
  const workspace = useExecutionStore((s) => s.workspace);
  const terminal = workspace.terminal;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [terminal?.lines.length]);

  if (!terminal || terminal.lines.length === 0) {
    return <EmptyState icon={TerminalIcon} message="Sin actividad de terminal aún" />;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-1.5 border-b border-border flex items-center gap-2 text-[10px] text-muted-foreground">
        <TerminalIcon className="size-3" />
        <span className="font-mono">{terminal.cwd || "/workspace"}</span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 font-mono text-xs">
        {terminal.lines.map((line, i) => (
          <div
            key={i}
            className={cn(
              "leading-relaxed whitespace-pre-wrap break-words",
              line.type === "input" && "text-foreground",
              line.type === "output" && "text-muted-foreground",
              line.type === "error" && "text-destructive"
            )}
          >
            {line.type === "input" && <span className="text-muted-foreground/60">$ </span>}
            {line.text}
          </div>
        ))}
        <div className="text-muted-foreground cursor-blink" />
      </div>
    </div>
  );
}

function FilesView() {
  const workspace = useExecutionStore((s) => s.workspace);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const files = workspace.files || [];
  const activeFile = workspace.activeFile;

  const handleCopy = () => {
    if (activeFile?.content) {
      navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      toast.success("Copiado al portapapeles");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (activeFile?.content) {
      const blob = new Blob([activeFile.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = activeFile.name || "output.txt";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Archivo descargado");
    }
  };

  if (files.length === 0 && !activeFile) {
    return <EmptyState icon={Files} message="Sin archivos generados aún" />;
  }

  return (
    <div className="h-full flex">
      {files.length > 0 && (
        <div className="w-44 border-r border-border overflow-y-auto p-1.5 shrink-0">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 px-1">Archivos</div>
          {files.map((file) => {
            const Icon = file.type === "dir" ? Folder : FileIcon;
            const isActive = selectedFile === file.name || activeFile?.name === file.name;
            return (
              <button
                key={file.path}
                onClick={() => setSelectedFile(file.name)}
                className={cn(
                  "w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-xs text-left transition-all border border-transparent",
                  isActive ? "bg-manus-primary/10 text-manus-primary border-manus-primary/30" : "text-muted-foreground hover:bg-muted/50 hover:border-foreground/10"
                )}
              >
                <Icon className="size-3 shrink-0" />
                <span className="truncate">{file.name}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {activeFile ? (
          <>
            <div className="px-3 py-1.5 border-b border-border flex items-center justify-between">
              <span className="text-xs font-mono truncate">{activeFile.name}</span>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={handleCopy}
                  className="size-6 rounded hover:bg-manus-primary/20 hover:text-manus-primary flex items-center justify-center text-muted-foreground transition-colors"
                  title="Copiar al portapapeles"
                >
                  {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                </button>
                <button
                  onClick={handleDownload}
                  className="size-6 rounded hover:bg-manus-secondary/20 hover:text-manus-secondary flex items-center justify-center text-muted-foreground transition-colors"
                  title="Descargar archivo"
                >
                  <Download className="size-3" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-3">
              <pre className="text-xs font-mono text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {activeFile.content}
              </pre>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
            Selecciona un archivo
          </div>
        )}
      </div>
    </div>
  );
}

function OutputView() {
  const workspace = useExecutionStore((s) => s.workspace);
  const output = workspace.output;
  const [copied, setCopied] = useState(false);

  if (!output) {
    return <EmptyState icon={FileText} message="Sin output aún" />;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(output.content);
    setCopied(true);
    toast.success("Copiado");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col">
      {output.title && (
        <div className="px-3 py-1.5 border-b border-border flex items-center justify-between">
          <span className="text-xs font-medium truncate">{output.title}</span>
          <button
            onClick={handleCopy}
            className="size-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          </button>
        </div>
      )}
      <div className="flex-1 overflow-auto p-4">
        {output.type === "html" ? (
          <div className="space-y-2 text-xs">
            <div className="p-3 rounded border border-border bg-background/50">
              <div className="font-medium mb-1">Dashboard interactivo</div>
              <div className="grid grid-cols-3 gap-2 my-3">
                {[
                  { label: "KPI 1", value: "$4.2M" },
                  { label: "KPI 2", value: "+23%" },
                  { label: "KPI 3", value: "8,400" },
                ].map((kpi) => (
                  <div key={kpi.label} className="p-2 rounded bg-muted/50 text-center">
                    <div className="text-[10px] text-muted-foreground">{kpi.label}</div>
                    <div className="text-sm font-semibold">{kpi.value}</div>
                  </div>
                ))}
              </div>
              <div className="h-16 rounded bg-muted/40 flex items-end justify-around p-1">
                {[40, 65, 50, 80, 70, 90, 60].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 mx-0.5 bg-foreground/30 rounded-t"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
            <pre className="text-[10px] text-muted-foreground font-mono whitespace-pre-wrap">
              {output.content.slice(0, 200)}...
            </pre>
          </div>
        ) : output.type === "code" ? (
          <pre className="text-xs font-mono text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {output.content}
          </pre>
        ) : (
          <Markdown content={output.content} />
        )}
      </div>
    </div>
  );
}

function DataView() {
  const workspace = useExecutionStore((s) => s.workspace);
  const output = workspace.output;

  if (!output) {
    return <EmptyState icon={FileText} message="Sin datos procesados aún" />;
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="space-y-3">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">
          {output.title || "Datos procesados"}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Filas", value: "8,000" },
            { label: "Columnas", value: "14" },
            { label: "Outliers", value: "23" },
            { label: "Nulos", value: "0.2%" },
          ].map((s) => (
            <div key={s.label} className="p-2.5 rounded border border-border bg-background/50">
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
              <div className="text-base font-semibold tabular-nums">{s.value}</div>
            </div>
          ))}
        </div>
        <pre className="text-xs font-mono text-foreground/90 whitespace-pre-wrap leading-relaxed mt-3 p-3 rounded bg-muted/40">
          {output.content}
        </pre>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: typeof Globe; message: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-6">
      <div className="size-10 rounded-lg bg-muted flex items-center justify-center mb-3">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

function MemoryView() {
  const memoryStore = useMemoryStoreForView();
  const [activeType, setActiveType] = useState<"working" | "episodic" | "semantic">("semantic");

  const memories = memoryStore[activeType] || [];

  const MEMORY_INFO = {
    working: {
      icon: Brain,
      label: "Working",
      description: "Contexto actual de ejecución (volátil)",
      color: "text-foreground",
    },
    episodic: {
      icon: Database,
      label: "Episodic",
      description: "Historial de tareas (persistente)",
      color: "text-amber-500",
    },
    semantic: {
      icon: Lightbulb,
      label: "Semantic",
      description: "Patrones aprendidos (persistente)",
      color: "text-emerald-500",
    },
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-border">
        <div className="text-xs font-medium mb-1">Sistema de Memoria</div>
        <p className="text-[10px] text-muted-foreground">
          Los 7 agentes leen y escriben aquí para mantener contexto entre conversaciones.
        </p>
      </div>

      {/* Memory type tabs */}
      <div className="px-3 py-2 border-b border-border flex gap-1">
        {(["working", "episodic", "semantic"] as const).map((type) => {
          const info = MEMORY_INFO[type];
          const count = memoryStore[type]?.length || 0;
          return (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded text-[10px] transition-colors",
                activeType === type ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <info.icon className="size-3" />
              {info.label}
              <span className="font-mono">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Memory content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {memories.length === 0 ? (
          <div className="text-center py-8">
            <Database className="size-6 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">
              Sin entradas en {MEMORY_INFO[activeType].label.toLowerCase()} memory aún.
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              {MEMORY_INFO[activeType].description}
            </p>
          </div>
        ) : (
          memories.slice(0, 50).map((entry: { id: string; key: string; value: string; timestamp: string; confidence?: number; tags?: string[] }) => (
            <div key={entry.id} className="p-2.5 rounded border border-border bg-background/50">
              <div className="flex items-start justify-between gap-2 mb-1">
                <code className="text-[10px] font-mono text-foreground/70 truncate">{entry.key}</code>
                <span className="text-[9px] text-muted-foreground shrink-0">
                  {new Date(entry.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-xs text-foreground/90 leading-relaxed line-clamp-3">{entry.value}</p>
              {entry.tags && entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {entry.tags.slice(0, 3).map((tag: string) => (
                    <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {entry.confidence !== undefined && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-foreground"
                      style={{ width: `${entry.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground font-mono">
                    {Math.round(entry.confidence * 100)}%
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer stats */}
      <div className="px-3 py-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Total: {memories.length} entradas</span>
        <span>Persistente: {activeType !== "working" ? "Sí" : "No"}</span>
      </div>
    </div>
  );
}
