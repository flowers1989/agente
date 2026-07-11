"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Terminal as TerminalIcon,
  Files,
  Play,
  Loader2,
  RefreshCw,
  PanelRightClose,
  PanelRight,
  Folder,
  File as FileIcon,
  Download,
  Copy,
  Check,
  AlertCircle,
  Power,
  ChevronRight,
  Save,
  Edit3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useExecutionStore } from "@/lib/store-execution";
import { useTaskStore } from "@/lib/store-task";
import {
  useSandboxStore,
  checkDockerAvailability,
  ensureSandboxStarted,
  stopSandbox,
  runCodeInSandbox,
  runCodeInSandboxStream,
  runCommandInSandboxStream,
  refreshFilesInSandbox,
  listFilesInPath,
  readFileFromSandbox,
  openFileInSandbox,
  saveFileInSandbox,
  type Language,
} from "@/lib/sandbox/sandbox-store";

// ==================== SANDBOX PANEL ====================
// Panel derecho que reemplaza al antiguo WorkspacePanel.
// Muestra un sandbox Docker real con terminal interactiva,
// explorador de archivos y editor de código con guardado.

export function SandboxPanel() {
  const collapsed = useExecutionStore((s) => s.workspaceCollapsed);
  const toggle = useExecutionStore((s) => s.toggleWorkspace);
  const currentConversationId = useTaskStore((s) => s.currentConversationId);

  const status = useSandboxStore((s) => s.status);
  const dockerAvailable = useSandboxStore((s) => s.dockerAvailable);
  const containerId = useSandboxStore((s) => s.containerId);
  const taskId = useSandboxStore((s) => s.taskId);
  const activeTab = useSandboxStore((s) => s.activeTab);
  const setActiveTab = useSandboxStore((s) => s.setActiveTab);
  const terminalLines = useSandboxStore((s) => s.terminalLines);

  const [running, setRunning] = useState(false);

  // Detectar Docker al montar
  useEffect(() => {
    checkDockerAvailability();
  }, []);

  const handleStart = useCallback(async () => {
    const tid = currentConversationId || `sandbox-${Date.now()}`;
    setRunning(true);
    await ensureSandboxStarted(tid);
    setRunning(false);
  }, [currentConversationId]);

  const handleStop = useCallback(async () => {
    await stopSandbox();
  }, []);

  // ===== Render colapsado =====
  if (collapsed) {
    return (
      <button
        onClick={toggle}
        className="hidden lg:flex w-10 border-l border-border bg-card flex-col items-center py-3 hover:bg-muted transition-colors shrink-0"
        title="Mostrar Sandbox"
      >
        <PanelRight className="size-4 text-muted-foreground" />
      </button>
    );
  }

  const isActive = status === "active" && !!taskId;

  return (
    <motion.aside
      initial={{ width: 0 }}
      animate={{ width: "40%" }}
      exit={{ width: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="hidden lg:flex flex-col border-l border-border bg-card min-w-0 shrink-0"
      style={{ maxWidth: "50%" }}
    >
      {/* ===== Header ===== */}
      <div className="h-12 px-3 flex items-center justify-between border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <StatusDot status={status} />
          <span className="text-xs font-semibold uppercase tracking-wider">Sandbox</span>
          {containerId && (
            <code className="text-[10px] font-mono text-muted-foreground truncate">
              {containerId.slice(0, 12)}
            </code>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!isActive ? (
            <button
              onClick={handleStart}
              disabled={running || status === "checking" || !dockerAvailable}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-manus-primary/20 text-manus-primary hover:bg-manus-primary/30 border border-manus-primary/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={!dockerAvailable ? "Docker no disponible" : "Iniciar sandbox Docker"}
            >
              {running ? <Loader2 className="size-3 animate-spin" /> : <Power className="size-3" />}
              {running ? "Iniciando..." : "Iniciar"}
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-destructive/20 text-destructive hover:bg-destructive/30 border border-destructive/40 transition-colors"
              title="Detener sandbox"
            >
              <Power className="size-3" />
              Detener
            </button>
          )}
          <button
            onClick={toggle}
            className="size-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
            title="Colapsar panel"
          >
            <PanelRightClose className="size-3.5" />
          </button>
        </div>
      </div>

      {/* ===== Estado no activo ===== */}
      {!isActive && status !== "creating" && (
        <SandboxPlaceholder status={status} dockerAvailable={dockerAvailable} onStart={handleStart} />
      )}

      {/* ===== Creando ===== */}
      {status === "creating" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6">
          <Loader2 className="size-6 animate-spin text-manus-primary" />
          <p className="text-xs text-muted-foreground">Creando contenedor Docker...</p>
        </div>
      )}

      {/* ===== Sandbox activo ===== */}
      {isActive && (
        <>
          <div className="flex border-b border-border shrink-0">
            <SubTab active={activeTab === "terminal"} onClick={() => setActiveTab("terminal")} icon={TerminalIcon} label="Terminal" />
            <SubTab active={activeTab === "files"} onClick={() => setActiveTab("files")} icon={Files} label="Archivos" />
          </div>

          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                {activeTab === "terminal" && <TerminalView taskId={taskId!} lines={terminalLines} />}
                {activeTab === "files" && <FilesView taskId={taskId!} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </>
      )}
    </motion.aside>
  );
}

// ==================== Sub-componentes ====================

function StatusDot({ status }: { status: string }) {
  const config: Record<string, { color: string; pulse: boolean }> = {
    unknown: { color: "bg-muted-foreground", pulse: false },
    checking: { color: "bg-amber-500", pulse: true },
    available: { color: "bg-amber-500", pulse: false },
    unavailable: { color: "bg-destructive", pulse: false },
    creating: { color: "bg-amber-500", pulse: true },
    active: { color: "bg-emerald-500", pulse: true },
  };
  const c = config[status] || config.unknown;
  return (
    <span className="relative flex size-2 shrink-0">
      {c.pulse && (
        <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping", c.color)} />
      )}
      <span className={cn("relative inline-flex size-2 rounded-full", c.color)} />
    </span>
  );
}

function SubTab({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof TerminalIcon;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-2 text-xs transition-all border-b-2",
        active
          ? "text-manus-primary border-manus-primary bg-manus-primary/5"
          : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50"
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}

function SandboxPlaceholder({
  status,
  dockerAvailable,
  onStart,
}: {
  status: string;
  dockerAvailable: boolean;
  onStart: () => void;
}) {
  const messages: Record<string, { title: string; desc: string }> = {
    unknown: { title: "Verificando Docker...", desc: "Comprobando disponibilidad del daemon Docker." },
    checking: { title: "Verificando Docker...", desc: "Comprobando disponibilidad del daemon Docker." },
    available: {
      title: "Sandbox listo para iniciar",
      desc: "Docker está disponible. Inicia un sandbox para ejecutar comandos, código y explorar archivos en un contenedor aislado.",
    },
    unavailable: {
      title: "Docker no disponible",
      desc: "Inicia el daemon Docker para usar el sandbox. Ejecuta: sudo systemctl start docker",
    },
    creating: { title: "", desc: "" },
    active: { title: "", desc: "" },
  };
  const msg = messages[status] || messages.unknown;

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
      <div className={cn("size-12 rounded-xl flex items-center justify-center", dockerAvailable ? "bg-manus-primary/10" : "bg-destructive/10")}>
        {dockerAvailable ? <TerminalIcon className="size-6 text-manus-primary" /> : <AlertCircle className="size-6 text-destructive" />}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{msg.title}</p>
        <p className="text-xs text-muted-foreground max-w-xs">{msg.desc}</p>
      </div>
      {dockerAvailable && status === "available" && (
        <button
          onClick={onStart}
          className="mt-2 flex items-center gap-2 px-4 py-2 rounded-md bg-manus-primary/20 text-manus-primary hover:bg-manus-primary/30 border border-manus-primary/40 text-xs font-medium transition-colors"
        >
          <Power className="size-3.5" />
          Iniciar Sandbox
        </button>
      )}
    </div>
  );
}

function TerminalView({
  taskId,
  lines,
}: {
  taskId: string;
  lines: ReturnType<typeof useSandboxStore.getState>["terminalLines"];
}) {
  const [input, setInput] = useState("");
  const [lang, setLang] = useState<Language>("bash");
  const [running, setRunning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const clearTerminal = useSandboxStore((s) => s.clearTerminal);
  const addTerminalLine = useSandboxStore((s) => s.addTerminalLine);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines.length]);

  // Limpia el AbortController al desmontar
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleSubmit = async () => {
    const code = input.trim();
    if (!code || running) return;
    setRunning(true);
    setInput("");
    // Streaming SSE: el output aparece en vivo en el terminal
    abortRef.current = await runCodeInSandboxStream(code, lang, taskId, {
      timeoutMs: 60000,
    });
    setRunning(false);
    inputRef.current?.focus();
  };

  const handleCancel = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      addTerminalLine({ type: "system", text: "⏹ Ejecución cancelada por el usuario" });
      setRunning(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-1.5 border-b border-border flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <TerminalIcon className="size-3" />
          <span className="font-mono">/workspace</span>
          <code className="text-[9px] opacity-60">{taskId.slice(0, 12)}</code>
        </div>
        <button
          onClick={clearTerminal}
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          title="Limpiar terminal"
        >
          Limpiar
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-0.5">
        {lines.length === 0 ? (
          <div className="text-muted-foreground italic">
            Escribe un comando y presiona Enter para ejecutarlo en el sandbox.
          </div>
        ) : (
          lines.map((line) => (
            <div
              key={line.id}
              className={cn(
                "leading-relaxed whitespace-pre-wrap break-words",
                line.type === "input" && "text-manus-primary",
                line.type === "output" && "text-foreground/80",
                line.type === "error" && "text-destructive",
                line.type === "system" && "text-muted-foreground italic"
              )}
            >
              {line.type === "input" && <span className="text-muted-foreground/60">$ </span>}
              {line.type === "system" && <span className="text-[10px]">› </span>}
              {line.text}
            </div>
          ))
        )}
        {running && (
          <div className="text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="size-3 animate-spin" />
            <span className="text-[10px]">Ejecutando...</span>
          </div>
        )}
      </div>

      <div className="border-t border-border p-2 shrink-0 space-y-2">
        <div className="flex gap-1">
          {(["bash", "python", "node"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-mono transition-colors",
                lang === l
                  ? "bg-manus-primary/20 text-manus-primary border border-manus-primary/40"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground border border-transparent"
              )}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              lang === "bash"
                ? "ls -la && echo hola"
                : lang === "python"
                ? "print(sum(range(10)))"
                : "console.log(Array.from({length: 5}, (_, i) => i*i))"
            }
            rows={2}
            className="flex-1 bg-background border border-border rounded px-2 py-1.5 text-xs font-mono resize-none focus:outline-none focus:border-manus-primary/50 placeholder:text-muted-foreground/40"
            disabled={running}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || running}
            className="size-8 rounded bg-manus-primary/20 text-manus-primary hover:bg-manus-primary/30 border border-manus-primary/40 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            title="Ejecutar (Enter)"
          >
            {running ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
          </button>
          {running && (
            <button
              onClick={handleCancel}
              className="size-8 rounded bg-destructive/20 text-destructive hover:bg-destructive/30 border border-destructive/40 flex items-center justify-center transition-colors shrink-0"
              title="Cancelar ejecución"
            >
              <span className="text-xs font-bold">⏹</span>
            </button>
          )}
        </div>
        <div className="text-[9px] text-muted-foreground/60">
          Enter para ejecutar · Shift+Enter para nueva línea
        </div>
      </div>
    </div>
  );
}

// ==================== EXPLORADOR DE ARCHIVOS TIPO VS CODE ====================
// - Árbol de directorios expandible (clic en carpeta para abrir/cerrar)
// - Breadcrumbs para navegación
// - Iconos por tipo de archivo (color según extensión)
// - Editor con números de línea y Ctrl+S

interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  children?: TreeNode[];
  loaded?: boolean;
  expanded?: boolean;
}

function getFileIcon(name: string): { icon: string; color: string } {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, { icon: string; color: string }> = {
    ts: { icon: "TS", color: "text-blue-500" },
    tsx: { icon: "TSX", color: "text-blue-500" },
    js: { icon: "JS", color: "text-yellow-500" },
    jsx: { icon: "JSX", color: "text-yellow-500" },
    py: { icon: "PY", color: "text-emerald-500" },
    json: { icon: "{}", color: "text-amber-500" },
    md: { icon: "M↓", color: "text-sky-500" },
    html: { icon: "<>", color: "text-orange-500" },
    css: { icon: "#", color: "text-blue-400" },
    sh: { icon: "$", color: "text-green-500" },
    txt: { icon: "T", color: "text-muted-foreground" },
    yml: { icon: "Y", color: "text-purple-500" },
    yaml: { icon: "Y", color: "text-purple-500" },
    csv: { icon: "C", color: "text-green-600" },
    png: { icon: "🖼", color: "text-pink-500" },
    jpg: { icon: "🖼", color: "text-pink-500" },
    jpeg: { icon: "🖼", color: "text-pink-500" },
    svg: { icon: "SVG", color: "text-pink-500" },
    pdf: { icon: "PDF", color: "text-red-500" },
  };
  return map[ext] || { icon: "F", color: "text-muted-foreground" };
}

function FilesView({ taskId }: { taskId: string }) {
  const activeFile = useSandboxStore((s) => s.activeFile);
  const setActiveFile = useSandboxStore((s) => s.setActiveFile);
  const [copied, setCopied] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [currentPath] = useState("/workspace");

  // Cargar árbol raíz al montar
  const loadDirectory = useCallback(async (dirPath: string) => {
    setLoadingTree(true);
    try {
      const items = await listFilesInPath(dirPath);
      return items.map((item) => ({
        name: item.name,
        path: dirPath === "/workspace" ? `/workspace/${item.name}` : `${dirPath}/${item.name}`,
        isDirectory: item.isDirectory,
        size: item.size,
        loaded: !item.isDirectory,
        expanded: false,
      })) as TreeNode[];
    } catch {
      return [];
    } finally {
      setLoadingTree(false);
    }
  }, []);

  useEffect(() => {
    loadDirectory("/workspace").then(setTree);
  }, [loadDirectory]);

  // Expandir/contraer un directorio
  const toggleDir = useCallback(async (node: TreeNode, parentPath: string[]) => {
    const updateTree = (nodes: TreeNode[], targetPath: string[], depth: number): TreeNode[] => {
      if (depth >= targetPath.length) return nodes;
      return nodes.map((n) => {
        if (n.path === targetPath[depth]) {
          if (depth === targetPath.length - 1) {
            // Es el nodo objetivo
            if (!n.loaded) {
              // Cargar hijos async
              loadDirectory(n.path).then((children) => {
                setTree((prev) => updateTreeWithChildren(prev, n.path, children, true));
              });
              return { ...n, expanded: true, children: [] };
            }
            return { ...n, expanded: !n.expanded };
          }
          return { ...n, children: updateTree(n.children || [], targetPath, depth + 1) };
        }
        return n;
      });
    };
    setTree((prev) => updateTree(prev, [...parentPath, node.path], parentPath.length));
  }, [loadDirectory]);

  const updateTreeWithChildren = (
    nodes: TreeNode[],
    targetPath: string,
    children: TreeNode[],
    expanded: boolean
  ): TreeNode[] => {
    return nodes.map((n) => {
      if (n.path === targetPath) {
        return { ...n, children, loaded: true, expanded };
      }
      if (n.children) {
        return { ...n, children: updateTreeWithChildren(n.children, targetPath, children, expanded) };
      }
      return n;
    });
  };

  // Abrir archivo
  const handleOpenFile = useCallback(async (node: TreeNode) => {
    if (node.isDirectory) return;
    try {
      const content = await readFileFromSandbox(node.path);
      const ext = node.name.split(".").pop()?.toLowerCase() || "";
      const langMap: Record<string, string> = {
        ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
        py: "python", sh: "bash", bash: "bash", json: "json", md: "markdown",
        txt: "text", html: "html", css: "css", yml: "yaml", yaml: "yaml",
      };
      setActiveFile({
        name: node.name,
        path: node.path,
        content,
        language: langMap[ext] || "text",
      });
      setEditMode(false);
    } catch (err) {
      toast.error("No se pudo leer el archivo");
    }
  }, [readFileFromSandbox, setActiveFile]);

  const handleRefresh = useCallback(() => {
    loadDirectory(currentPath).then(setTree);
  }, [loadDirectory, currentPath]);

  const handleCopy = () => {
    if (activeFile?.content) {
      navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      toast.success("Copiado");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (activeFile?.content) {
      const blob = new Blob([activeFile.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = activeFile.name;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Descargado");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const ok = await saveFileInSandbox();
    setSaving(false);
    if (ok) toast.success("Guardado en sandbox");
    else toast.error("Error al guardar");
  };

  // Render recursivo del árbol
  const renderTree = (nodes: TreeNode[], depth: number = 0, parentPath: string[] = []): React.ReactNode => {
    // Ordenar: directorios primero, luego archivos alfabéticamente
    const sorted = [...nodes].sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return sorted.map((node) => {
      const fileIcon = getFileIcon(node.name);
      const isActive = activeFile?.path === node.path;
      return (
        <div key={node.path}>
          <button
            onClick={() => node.isDirectory ? toggleDir(node, parentPath) : handleOpenFile(node)}
            className={cn(
              "w-full flex items-center gap-1 px-1.5 py-1 rounded text-xs text-left transition-all border border-transparent",
              isActive
                ? "bg-manus-primary/10 text-manus-primary border-manus-primary/30"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
            style={{ paddingLeft: `${depth * 12 + 6}px` }}
          >
            {node.isDirectory ? (
              <>
                <ChevronRight
                  className={cn("size-3 shrink-0 transition-transform", node.expanded && "rotate-90")}
                />
                <Folder className="size-3 shrink-0 text-amber-500/80" />
              </>
            ) : (
              <>
                <span className="w-3 shrink-0" />
                <span className={cn("text-[9px] font-bold shrink-0 w-6 text-center", fileIcon.color)}>
                  {fileIcon.icon}
                </span>
              </>
            )}
            <span className="truncate flex-1">{node.name}</span>
            {!node.isDirectory && node.size > 0 && (
              <span className="text-[9px] text-muted-foreground/60">{formatSize(node.size)}</span>
            )}
          </button>
          {node.isDirectory && node.expanded && node.children && (
            <div>
              {node.children.length === 0 && node.loaded ? (
                <div
                  className="text-[10px] text-muted-foreground/50 italic px-1 py-0.5"
                  style={{ paddingLeft: `${(depth + 1) * 12 + 24}px` }}
                >
                  (vacío)
                </div>
              ) : (
                renderTree(node.children, depth + 1, [...parentPath, node.path])
              )}
            </div>
          )}
        </div>
      );
    });
  };

  // Breadcrumbs
  const breadcrumbs = currentPath.split("/").filter(Boolean);

  return (
    <div className="h-full flex">
      {/* Sidebar de archivos tipo VS Code */}
      <div className="w-48 border-r border-border flex flex-col shrink-0">
        <div className="px-2 py-1.5 border-b border-border flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">EXPLORER</span>
          <button
            onClick={handleRefresh}
            disabled={loadingTree}
            className="size-5 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            title="Refrescar"
          >
            <RefreshCw className={cn("size-3", loadingTree && "animate-spin")} />
          </button>
        </div>
        {/* Breadcrumbs */}
        <div className="px-2 py-1 border-b border-border text-[10px] text-muted-foreground font-mono truncate">
          {breadcrumbs.map((part, i) => (
            <span key={i}>
              {i > 0 && <span className="opacity-40">/</span>}
              <span className={i === breadcrumbs.length - 1 ? "text-foreground" : ""}>{part}</span>
            </span>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-1">
          {tree.length === 0 && !loadingTree ? (
            <div className="text-[10px] text-muted-foreground italic px-1 py-2">
              Sin archivos. Crea alguno desde la terminal.
            </div>
          ) : loadingTree && tree.length === 0 ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="size-3 animate-spin text-muted-foreground" />
            </div>
          ) : (
            renderTree(tree)
          )}
        </div>
      </div>

      {/* Visor / Editor de archivo */}
      <div className="flex-1 min-w-0 flex flex-col">
        {activeFile ? (
          <>
            <div className="px-3 py-1.5 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <ChevronRight className="size-3 text-muted-foreground shrink-0" />
                <span className="text-xs font-mono truncate">{activeFile.name}</span>
                {activeFile.dirty && (
                  <span className="size-1.5 rounded-full bg-amber-500 shrink-0" title="Cambios sin guardar" />
                )}
                <span className="text-[9px] text-muted-foreground/60 uppercase">{activeFile.language}</span>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={() => setEditMode(!editMode)}
                  className={cn(
                    "size-6 rounded flex items-center justify-center transition-colors",
                    editMode
                      ? "bg-manus-primary/20 text-manus-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  title={editMode ? "Modo edición activo" : "Modo lectura"}
                >
                  <Edit3 className="size-3" />
                </button>
                {editMode && (
                  <button
                    onClick={handleSave}
                    disabled={saving || !activeFile.dirty}
                    className="size-6 rounded hover:bg-manus-secondary/20 hover:text-manus-secondary flex items-center justify-center text-muted-foreground disabled:opacity-40 transition-colors"
                    title="Guardar en sandbox (Ctrl+S)"
                  >
                    {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                  </button>
                )}
                <button
                  onClick={handleCopy}
                  className="size-6 rounded hover:bg-manus-primary/20 hover:text-manus-primary flex items-center justify-center text-muted-foreground transition-colors"
                  title="Copiar"
                >
                  {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                </button>
                <button
                  onClick={handleDownload}
                  className="size-6 rounded hover:bg-manus-secondary/20 hover:text-manus-secondary flex items-center justify-center text-muted-foreground transition-colors"
                  title="Descargar"
                >
                  <Download className="size-3" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {editMode ? (
                <CodeEditor />
              ) : (
                <pre className="text-xs font-mono text-foreground/90 whitespace-pre-wrap leading-relaxed p-3">
                  {activeFile.content}
                </pre>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-2">
            <Files className="size-6 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">Selecciona un archivo para ver su contenido</p>
            <p className="text-[10px] text-muted-foreground/60">
              Usa la terminal para crear archivos con <code className="font-mono">echo "hola" &gt; prueba.txt</code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== EDITOR DE CÓDIGO ====================
// Textarea con números de línea, tabulación y guardado con Ctrl+S.

function CodeEditor() {
  const activeFile = useSandboxStore((s) => s.activeFile);
  const updateActiveFileContent = useSandboxStore((s) => s.updateActiveFileContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const lines = activeFile?.content.split("\n") || [];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab inserta 2 espacios
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newContent = activeFile!.content.slice(0, start) + "  " + activeFile!.content.slice(end);
      updateActiveFileContent(newContent);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
    // Ctrl+S guarda
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      saveFileInSandbox();
    }
  };

  if (!activeFile) return null;

  return (
    <div className="h-full flex">
      {/* Números de línea */}
      <div className="w-10 shrink-0 border-r border-border bg-muted/30 overflow-hidden text-right select-none">
        <div className="p-2 font-mono text-[10px] leading-relaxed text-muted-foreground/60">
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
      </div>
      {/* Área de edición */}
      <textarea
        ref={textareaRef}
        value={activeFile.content}
        onChange={(e) => updateActiveFileContent(e.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        className="flex-1 bg-background text-foreground p-3 text-xs font-mono leading-relaxed resize-none focus:outline-none whitespace-pre"
        style={{ tabSize: 2 }}
      />
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
}
