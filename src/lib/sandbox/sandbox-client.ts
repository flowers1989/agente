// ==================== SANDBOX CLIENT (BROWSER-SAFE) ====================
// Cliente ligero para interactuar con el sandbox desde el browser.
// En lugar de importar dockerode directamente (que requiere Node.js),
// este módulo hace fetch a los endpoints /api/sandbox/* del servidor.
//
// Uso: importar este módulo en código cliente (tool-registry, executor-agent).
// El SandboxManager real (con dockerode) solo se importa en API routes (server).

export interface SandboxClientResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface FileEntry {
  name: string;
  isDirectory: boolean;
  size: number;
}

// ---- Crear o reutilizar sandbox ----
export async function clientGetOrCreateSandbox(taskId: string): Promise<{ taskId: string }> {
  // Intentar obtener el sandbox existente
  const checkRes = await fetch(`/api/sandbox/${encodeURIComponent(taskId)}`);
  if (checkRes.ok) {
    const data = (await checkRes.json()) as { sandbox: { taskId: string } };
    return { taskId: data.sandbox.taskId };
  }

  // Si no existe, crearlo
  const createRes = await fetch("/api/sandbox", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskId }),
  });

  if (!createRes.ok) {
    // Docker no disponible — modo degradado sin sandbox real
    return { taskId };
  }

  const data = (await createRes.json()) as { sandbox: { taskId: string } };
  return { taskId: data.sandbox.taskId };
}

// ---- Ejecutar código en el sandbox ----
export async function clientRunCode(
  taskId: string,
  language: "python" | "node" | "bash" | "shell",
  code: string
): Promise<SandboxClientResult> {
  const langMap: Record<string, string> = {
    python: "python3 -c",
    node: "node -e",
    bash: "bash -c",
    shell: "sh -c",
  };

  const prefix = langMap[language] ?? "sh -c";
  // Escapar comillas simples en el código
  const escapedCode = code.replace(/'/g, "'\\''");
  const command = `${prefix} '${escapedCode}'`;

  const res = await fetch(`/api/sandbox/${encodeURIComponent(taskId)}/exec`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command, timeoutMs: 30000 }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({ error: "Error desconocido" }))) as { error?: string };
    return { exitCode: 1, stdout: "", stderr: err.error ?? "Error ejecutando código" };
  }

  const data = (await res.json()) as { result?: SandboxClientResult };
  return data.result ?? { exitCode: 1, stdout: "", stderr: "Sin resultado" };
}

// ---- Ejecutar comando shell genérico ----
export async function clientExec(
  taskId: string,
  command: string,
  options?: { timeoutMs?: number; cwd?: string }
): Promise<SandboxClientResult> {
  const res = await fetch(`/api/sandbox/${encodeURIComponent(taskId)}/exec`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command, ...options }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({ error: "Error desconocido" }))) as { error?: string };
    return { exitCode: 1, stdout: "", stderr: err.error ?? "Error ejecutando comando" };
  }

  const data = (await res.json()) as { result?: SandboxClientResult };
  return data.result ?? { exitCode: 1, stdout: "", stderr: "Sin resultado" };
}

// ---- Leer archivo del sandbox via exec ----
export async function clientReadFile(taskId: string, path: string): Promise<string> {
  const result = await clientExec(taskId, `cat ${JSON.stringify(path)}`);
  if (result.exitCode !== 0) throw new Error(result.stderr || "No se pudo leer el archivo");
  return result.stdout;
}

// ---- Escribir archivo en el sandbox via exec ----
export async function clientWriteFile(taskId: string, path: string, content: string): Promise<void> {
  // Usar printf para evitar problemas con caracteres especiales
  const encoded = Buffer.from(content).toString("base64");
  const result = await clientExec(
    taskId,
    `mkdir -p "$(dirname ${JSON.stringify(path)})" && echo ${JSON.stringify(encoded)} | base64 -d > ${JSON.stringify(path)}`
  );
  if (result.exitCode !== 0) throw new Error(result.stderr || "No se pudo escribir el archivo");
}

// ---- Listar archivos del sandbox via exec ----
export async function clientListFiles(taskId: string, dirPath: string): Promise<FileEntry[]> {
  const result = await clientExec(taskId, `ls -la ${JSON.stringify(dirPath)} 2>/dev/null || echo ""`);
  if (result.exitCode !== 0 || !result.stdout.trim()) return [];

  return result.stdout
    .split("\n")
    .slice(1) // Saltar línea "total N"
    .filter((line) => line.trim() && !line.endsWith(".") && !line.endsWith(".."))
    .map((line) => {
      const parts = line.trim().split(/\s+/);
      const name = parts.slice(8).join(" ");
      const isDirectory = line.startsWith("d");
      const size = parseInt(parts[4] ?? "0", 10) || 0;
      return { name, isDirectory, size };
    })
    .filter((f) => f.name);
}
