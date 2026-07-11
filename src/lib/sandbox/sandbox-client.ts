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
// Ahora lanza error fuerte si Docker no está disponible.
// El caller debe catchear y mostrar el mensaje al usuario.
export async function clientGetOrCreateSandbox(taskId: string): Promise<{ taskId: string }> {
  // Intentar obtener el sandbox existente
  const checkRes = await fetch(`/api/sandbox/${encodeURIComponent(taskId)}`);
  if (checkRes.ok) {
    const data = (await checkRes.json()) as { sandbox: { taskId: string } };
    return { taskId: data.sandbox.taskId };
  }

  // Verificar disponibilidad de Docker antes de intentar crear
  const availRes = await fetch("/api/sandbox");
  const availData = (await availRes.json().catch(() => ({ available: false }))) as { available: boolean };
  if (!availData.available) {
    throw new Error(
      "Docker no está disponible. Inicia el daemon: sudo systemctl start docker (Linux) o abre Docker Desktop (Mac/Windows). " +
        "Luego construye la imagen del sandbox: cd sandbox && bash build-image.sh"
    );
  }

  // Si Docker está disponible, crear el sandbox
  const createRes = await fetch("/api/sandbox", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskId }),
  });

  if (!createRes.ok) {
    const err = (await createRes.json().catch(() => ({ error: "Error desconocido" }))) as { error?: string };
    throw new Error(`No se pudo crear el sandbox: ${err.error || `HTTP ${createRes.status}`}`);
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
// Browser-safe: NO usa Buffer.from (que solo existe en Node.js).
// Usa TextEncoder + conversión manual a base64 compatible con browsers modernos.
export async function clientWriteFile(taskId: string, path: string, content: string): Promise<void> {
  const encoded = browserBase64Encode(content);
  const result = await clientExec(
    taskId,
    `mkdir -p "$(dirname ${JSON.stringify(path)})" && printf %s ${JSON.stringify(encoded)} | base64 -d > ${JSON.stringify(path)}`
  );
  if (result.exitCode !== 0) throw new Error(result.stderr || "No se pudo escribir el archivo");
}

// Codificación base64 browser-safe (sin Buffer).
// Soporta Unicode completo (incluido emojis/CJK) vía TextEncoder.
function browserBase64Encode(str: string): string {
  if (typeof window === "undefined") {
    // Server-side: usar Buffer si está disponible (más rápido)
    return Buffer.from(str, "utf8").toString("base64");
  }
  // Browser: usar btoa con manejo de UTF-8
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
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

// ---- Streaming SSE en vivo del output de un comando ----
// Llama onStdout/onStderr a medida que llega output, y onDone al terminar.
// Cancelable: devuelve un AbortController; llamar .abort() para parar.
export interface StreamHandlers {
  onStdout?: (text: string) => void;
  onStderr?: (text: string) => void;
  onDone?: (info: { exitCode: number; durationMs: number; timedOut: boolean }) => void;
  onError?: (message: string) => void;
}

export async function clientExecStream(
  taskId: string,
  command: string,
  handlers: StreamHandlers,
  options?: { timeoutMs?: number; cwd?: string }
): Promise<AbortController> {
  const controller = new AbortController();

  fetch(`/api/sandbox/${encodeURIComponent(taskId)}/exec/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command, ...options }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok || !res.body) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        handlers.onError?.(err.error ?? `HTTP ${res.status}`);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE frames separados por \n\n
        let frameEnd: number;
        while ((frameEnd = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, frameEnd);
          buffer = buffer.slice(frameEnd + 2);

          let event = "message";
          let data = "";
          for (const line of frame.split("\n")) {
            if (line.startsWith("event: ")) event = line.slice(7);
            else if (line.startsWith("data: ")) data = line.slice(6);
          }

          try {
            const payload = JSON.parse(data);
            if (event === "stdout") handlers.onStdout?.(payload.text);
            else if (event === "stderr") handlers.onStderr?.(payload.text);
            else if (event === "done") handlers.onDone?.(payload);
            else if (event === "error") handlers.onError?.(payload.message);
          } catch {
            // ignore parse errors
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        handlers.onError?.(err.message ?? "Error de red");
      }
    });

  return controller;
}
