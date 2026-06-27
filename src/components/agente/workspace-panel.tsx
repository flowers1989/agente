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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { WorkspaceTabType } from "@/lib/types";
import { toast } from "sonner";

const TABS: { id: WorkspaceTabType; label: string; icon: typeof Globe }[] = [
  { id: "output", label: "Output", icon: FileText },
  { id: "browser", label: "Browser", icon: Globe },
  { id: "terminal", label: "Terminal", icon: TerminalIcon },
  { id: "files", label: "Files", icon: Files },
  { id: "data", label: "Data", icon: FileText },
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
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors whitespace-nowrap",
                  isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}

function BrowserView() {
  const workspace = useExecutionStore((s) => s.workspace);
  const browser = workspace.browser;

  if (!browser) {
    return <EmptyState icon={Globe} message="Sin actividad de navegador aún" />;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <button className="size-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground">
          <RefreshCw className="size-3" />
        </button>
        <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1 rounded bg-muted text-xs text-muted-foreground truncate">
          {browser.loading ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <span className="size-2 rounded-full bg-emerald-500" />
          )}
          <span className="truncate">{browser.url}</span>
        </div>
        <button className="size-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground">
          <ExternalLink className="size-3" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">{browser.title}</div>
        {browser.loading ? (
          <div className="space-y-2">
            <div className="h-3 w-3/4 bg-muted rounded shimmer" />
            <div className="h-3 w-full bg-muted rounded shimmer" />
            <div className="h-3 w-5/6 bg-muted rounded shimmer" />
            <div className="h-3 w-2/3 bg-muted rounded shimmer" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm font-medium">Resultados de búsqueda</div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-2.5 rounded border border-border bg-background/50">
                <div className="text-xs text-foreground font-medium mb-0.5">Resultado #{i} - Título del sitio web</div>
                <div className="text-[10px] text-muted-foreground mb-1">https://example{i}.com/page</div>
                <div className="text-xs text-muted-foreground leading-relaxed">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
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
                  "w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-xs text-left transition-colors",
                  isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
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
                  className="size-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                </button>
                <button
                  onClick={handleDownload}
                  className="size-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
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
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{output.content}</p>
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
