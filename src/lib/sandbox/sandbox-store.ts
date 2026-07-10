"use client";

import { create } from "zustand";

// ==================== SANDBOX STORE ====================
// Store compartido para el estado del sandbox. Lo usa:
// - SandboxPanel (panel derecho): para mostrar estado, terminal, archivos
// - ChatPanel (centro): para añadir botón "Ejecutar en Sandbox" a code blocks
// - use-execution hook: para auto-iniciar sandbox cuando empieza una tarea

export type SandboxStatus =
  | "unknown"
  | "checking"
  | "available"
  | "unavailable"
  | "creating"
  | "active";

export type Language = "bash" | "python" | "node";

export interface TerminalLine {
  id: string;
  type: "input" | "output" | "error" | "system";
  text: string;
  timestamp: number;
}

export interface SandboxFile {
  name: string;
  path: string;
  content: string;
  language: string;
  dirty?: boolean; // true si tiene cambios sin guardar
}

interface SandboxState {
  status: SandboxStatus;
  taskId: string | null;
  containerId: string | null;
  createdAt: string | null;
  dockerAvailable: boolean;

  // Terminal
  terminalLines: TerminalLine[];

  // Archivos
  files: Array<{ name: string; isDirectory: boolean; size: number }>;
  activeFile: SandboxFile | null;
  loadingFiles: boolean;

  // Sub-tab activo
  activeTab: "terminal" | "files";

  // Actions
  setStatus: (status: SandboxStatus) => void;
  setSandbox: (data: Partial<Pick<SandboxState, "taskId" | "containerId" | "createdAt" | "status" | "dockerAvailable">>) => void;
  addTerminalLine: (line: Omit<TerminalLine, "id" | "timestamp">) => void;
  clearTerminal: () => void;
  setFiles: (files: SandboxState["files"]) => void;
  setActiveFile: (file: SandboxFile | null) => void;
  updateActiveFileContent: (content: string) => void;
  markActiveFileSaved: () => void;
  setLoadingFiles: (loading: boolean) => void;
  setActiveTab: (tab: "terminal" | "files") => void;
  reset: () => void;
}

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const useSandboxStore = create<SandboxState>((set) => ({
  status: "unknown",
  taskId: null,
  containerId: null,
  createdAt: null,
  dockerAvailable: false,
  terminalLines: [],
  files: [],
  activeFile: null,
  loadingFiles: false,
  activeTab: "terminal",

  setStatus: (status) => set({ status }),
  setSandbox: (data) => set(data),
  addTerminalLine: (line) =>
    set((s) => ({
      terminalLines: [...s.terminalLines, { ...line, id: genId(), timestamp: Date.now() }],
    })),
  clearTerminal: () => set({ terminalLines: [] }),
  setFiles: (files) => set({ files }),
  setActiveFile: (file) => set({ activeFile: file }),
  updateActiveFileContent: (content) =>
    set((s) => ({
      activeFile: s.activeFile ? { ...s.activeFile, content, dirty: true } : null,
    })),
  markActiveFileSaved: () =>
    set((s) => ({
      activeFile: s.activeFile ? { ...s.activeFile, dirty: false } : null,
    })),
  setLoadingFiles: (loading) => set({ loadingFiles: loading }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  reset: () =>
    set({
      status: "unknown",
      taskId: null,
      containerId: null,
      createdAt: null,
      terminalLines: [],
      files: [],
      activeFile: null,
      loadingFiles: false,
      activeTab: "terminal",
    }),
}));

// ==================== HELPER: Ejecutar código ====================
// Función utilitaria que puede ser importada desde cualquier componente
// para ejecutar código en el sandbox.

import {
  clientGetOrCreateSandbox,
  clientRunCode,
  clientExec,
  clientListFiles,
  clientReadFile,
  clientWriteFile,
} from "./sandbox-client";

export async function ensureSandboxStarted(taskId: string): Promise<string | null> {
  const store = useSandboxStore.getState();
  if (store.status === "active" && store.taskId) return store.taskId;

  store.setSandbox({ status: "creating" });
  store.addTerminalLine({ type: "system", text: `Iniciando sandbox para tarea ${taskId}...` });

  try {
    const result = await clientGetOrCreateSandbox(taskId);
    // Consultar metadata
    const res = await fetch(`/api/sandbox/${encodeURIComponent(result.taskId)}`);
    let containerId: string | null = null;
    let createdAt: string | null = null;
    if (res.ok) {
      const data = (await res.json()) as {
        sandbox: { taskId: string; containerId: string; createdAt: string; active: boolean };
      };
      containerId = data.sandbox.containerId;
      createdAt = data.sandbox.createdAt;
    }
    store.setSandbox({
      status: "active",
      taskId: result.taskId,
      containerId,
      createdAt,
    });
    store.addTerminalLine({
      type: "system",
      text: containerId
        ? `Sandbox activo · container ${containerId.slice(0, 12)}`
        : "Sandbox activo.",
    });
    return result.taskId;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    store.addTerminalLine({ type: "error", text: `Error iniciando sandbox: ${msg}` });
    store.setSandbox({ status: "available" });
    return null;
  }
}

export async function runCodeInSandbox(
  code: string,
  language: Language,
  taskId: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const store = useSandboxStore.getState();
  const sid = await ensureSandboxStarted(taskId);
  if (!sid) {
    return { stdout: "", stderr: "No se pudo iniciar el sandbox", exitCode: 1 };
  }

  store.addTerminalLine({ type: "input", text: `[${language}] ${code}` });
  store.setActiveTab("terminal");

  try {
    const result = await clientRunCode(sid, language, code);
    if (result.stdout) store.addTerminalLine({ type: "output", text: result.stdout });
    if (result.stderr) store.addTerminalLine({ type: "error", text: result.stderr });
    if (!result.stdout && !result.stderr && result.exitCode === 0) {
      store.addTerminalLine({ type: "output", text: "(sin output)" });
    }
    if (result.exitCode !== 0 && !result.stderr) {
      store.addTerminalLine({ type: "error", text: `Exit code: ${result.exitCode}` });
    }
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    store.addTerminalLine({ type: "error", text: msg });
    return { stdout: "", stderr: msg, exitCode: 1 };
  }
}

export async function refreshFilesInSandbox(): Promise<void> {
  const store = useSandboxStore.getState();
  if (!store.taskId) return;
  store.setLoadingFiles(true);
  try {
    const list = await clientListFiles(store.taskId, "/workspace");
    store.setFiles(list);
  } catch {
    // ignore
  } finally {
    store.setLoadingFiles(false);
  }
}

export async function openFileInSandbox(fileName: string): Promise<void> {
  const store = useSandboxStore.getState();
  if (!store.taskId) return;
  try {
    const content = await clientReadFile(store.taskId, `/workspace/${fileName}`);
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const langMap: Record<string, string> = {
      ts: "typescript",
      tsx: "typescript",
      js: "javascript",
      jsx: "javascript",
      py: "python",
      sh: "bash",
      bash: "bash",
      json: "json",
      md: "markdown",
      txt: "text",
      html: "html",
      css: "css",
    };
    store.setActiveFile({
      name: fileName,
      path: `/workspace/${fileName}`,
      content,
      language: langMap[ext] || "text",
    });
  } catch {
    // ignore
  }
}

export async function saveFileInSandbox(): Promise<boolean> {
  const store = useSandboxStore.getState();
  if (!store.taskId || !store.activeFile) return false;
  try {
    await clientWriteFile(store.taskId, store.activeFile.path, store.activeFile.content);
    store.markActiveFileSaved();
    store.addTerminalLine({
      type: "system",
      text: `Archivo guardado: ${store.activeFile.name}`,
    });
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    store.addTerminalLine({ type: "error", text: `Error guardando: ${msg}` });
    return false;
  }
}

export async function stopSandbox(): Promise<void> {
  const store = useSandboxStore.getState();
  if (!store.taskId) return;
  store.addTerminalLine({ type: "system", text: "Deteniendo sandbox..." });
  try {
    await fetch(`/api/sandbox/${encodeURIComponent(store.taskId)}`, { method: "DELETE" });
    store.setSandbox({
      status: "available",
      taskId: null,
      containerId: null,
      createdAt: null,
    });
    store.setFiles([]);
    store.setActiveFile(null);
    store.addTerminalLine({ type: "system", text: "Sandbox detenido." });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    store.addTerminalLine({ type: "error", text: `Error deteniendo: ${msg}` });
  }
}

export async function checkDockerAvailability(): Promise<void> {
  const store = useSandboxStore.getState();
  store.setStatus("checking");
  try {
    const res = await fetch("/api/sandbox");
    const data = (await res.json()) as { available: boolean };
    store.setSandbox({
      status: data.available ? "available" : "unavailable",
      dockerAvailable: data.available,
    });
    store.addTerminalLine({
      type: "system",
      text: data.available
        ? "Docker detectado. Listo para iniciar sandbox."
        : "Docker no disponible. Inicia el daemon para usar el sandbox.",
    });
  } catch {
    store.setSandbox({ status: "unavailable", dockerAvailable: false });
    store.addTerminalLine({ type: "error", text: "No se pudo conectar con el servidor." });
  }
}

// ==================== MULTI-ARCHIVO: Árbol de directorios ====================
// Permite escribir múltiples archivos en el sandbox manteniendo estructura de dirs.

export interface MultiFile {
  path: string; // ruta relativa a /workspace, ej: "src/App.tsx"
  content: string;
}

// Escribe múltiples archivos en el sandbox de una sola vez.
// Útil para desplegar proyectos completos generados por el agente.
export async function writeMultipleFilesToSandbox(
  files: MultiFile[],
  taskId?: string
): Promise<{ success: boolean; written: number; failed: string[] }> {
  const store = useSandboxStore.getState();
  const sid = taskId || store.taskId;
  if (!sid) {
    store.addTerminalLine({ type: "error", text: "No hay sandbox activo" });
    return { success: false, written: 0, failed: files.map((f) => f.path) };
  }

  let written = 0;
  const failed: string[] = [];

  store.addTerminalLine({
    type: "system",
    text: `Escribiendo ${files.length} archivos en el sandbox...`,
  });

  for (const file of files) {
    try {
      const fullPath = file.path.startsWith("/workspace") ? file.path : `/workspace/${file.path}`;
      await clientWriteFile(sid, fullPath, file.content);
      written++;
    } catch (err) {
      failed.push(file.path);
      const msg = err instanceof Error ? err.message : "Error";
      store.addTerminalLine({ type: "error", text: `Error escribiendo ${file.path}: ${msg}` });
    }
  }

  store.addTerminalLine({
    type: "system",
    text: `${written}/${files.length} archivos escritos correctamente.`,
  });

  // Refrescar lista de archivos
  await refreshFilesInSandbox();

  return { success: failed.length === 0, written, failed };
}

// Lista archivos recursivamente desde un directorio del sandbox.
// Devuelve estructura de árbol.
export async function listFilesRecursive(
  dirPath: string = "/workspace"
): Promise<FileTreeNode[]> {
  const store = useSandboxStore.getState();
  if (!store.taskId) return [];

  try {
    const result = await clientExec(store.taskId, `find ${dirPath} -type f 2>/dev/null | head -200`);
    if (result.exitCode !== 0) return [];

    const lines = result.stdout.split("\n").filter(Boolean);
    const nodes: FileTreeNode[] = lines.map((line) => {
      const relativePath = line.replace(dirPath + "/", "").replace(dirPath, "");
      const parts = relativePath.split("/");
      return {
        name: parts[parts.length - 1] || relativePath,
        path: line,
        relativePath,
        isDirectory: false,
        depth: parts.length - 1,
      };
    });

    return nodes;
  } catch {
    return [];
  }
}

export interface FileTreeNode {
  name: string;
  path: string;
  relativePath: string;
  isDirectory: boolean;
  depth: number;
}

// ==================== AUTO-EJECUCIÓN ====================
// Ejecuta automáticamente código generado por el orquestador.
// Detecta el lenguaje y lo ejecuta en el sandbox.

export async function autoExecuteCode(
  code: string,
  language: Language,
  taskId: string
): Promise<{ success: boolean; output?: string; error?: string }> {
  const store = useSandboxStore.getState();
  const sid = await ensureSandboxStarted(taskId);
  if (!sid) {
    return { success: false, error: "No se pudo iniciar el sandbox" };
  }

  store.addTerminalLine({
    type: "system",
    text: `[Auto-ejecución] Ejecutando código ${language}...`,
  });

  const result = await runCodeInSandbox(code, language, taskId);
  return {
    success: result.exitCode === 0,
    output: result.stdout,
    error: result.stderr,
  };
}

// Detecta si un mensaje del asistente contiene código ejecutable
// y lo ejecuta automáticamente en el sandbox.
export async function autoExecuteFromMessage(
  assistantMessage: string,
  taskId: string
): Promise<{ executed: number; results: { language: Language; success: boolean; output?: string }[] }> {
  // Extraer code blocks del mensaje
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const blocks: { language: Language | null; code: string }[] = [];
  let match;
  while ((match = codeBlockRegex.exec(assistantMessage)) !== null) {
    const lang = match[1]?.toLowerCase();
    const code = match[2];
    let mappedLang: Language | null = null;
    if (["bash", "sh", "shell"].includes(lang || "")) mappedLang = "bash";
    else if (["python", "py", "python3"].includes(lang || "")) mappedLang = "python";
    else if (["javascript", "js", "node", "typescript", "ts"].includes(lang || "")) mappedLang = "node";
    if (mappedLang) blocks.push({ language: mappedLang, code });
  }

  const results: { language: Language; success: boolean; output?: string }[] = [];
  for (const block of blocks) {
    if (block.language) {
      const result = await autoExecuteCode(block.code, block.language, taskId);
      results.push({
        language: block.language,
        success: result.success,
        output: result.output,
      });
    }
  }

  return { executed: results.length, results };
}

// ==================== DESPLIEGUE DE PROYECTOS WEB EN SANDBOX ====================
// Escribe un proyecto web generado en el sandbox y opcionalmente lo sirve.

export async function deployWebProjectToSandbox(
  files: MultiFile[],
  taskId: string
): Promise<{ success: boolean; fileCount: number; previewUrl?: string }> {
  const store = useSandboxStore.getState();
  const sid = await ensureSandboxStarted(taskId);
  if (!sid) return { success: false, fileCount: 0 };

  // Escribir todos los archivos
  const result = await writeMultipleFilesToSandbox(files, taskId);
  if (!result.success) {
    store.addTerminalLine({
      type: "error",
      text: `Error desplegando proyecto: ${result.failed.length} archivos fallaron`,
    });
  }

  // Cambiar al tab de archivos para ver el proyecto
  store.setActiveTab("files");
  store.addTerminalLine({
    type: "system",
    text: `Proyecto web desplegado en /workspace con ${result.written} archivos.`,
  });

  return {
    success: result.failed.length === 0,
    fileCount: result.written,
  };
}

