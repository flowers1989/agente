// ==================== SANDBOX MANAGER ====================
// Gestiona contenedores Docker aislados por tarea donde el agente ejecuta
// código real (shell, Python, Node, Bash), con filesystem propio.
//
// Inspirado en el sandbox de Manus IA: cada tarea obtiene su propio entorno
// efímero con shell, intérpretes y sistema de archivos, aislado del servidor.

import Docker from "dockerode";

export interface Sandbox {
  taskId: string;
  userId: string;
  containerId: string;
  createdAt: Date;
  isActive(): boolean;
}

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface FileEntry {
  name: string;
  path: string;
  type: "file" | "dir";
  size: number;
  modified: string;
}

const SANDBOX_IMAGE = "mexa-sandbox:latest";
const WORKDIR = "/workspace";

export class SandboxManager {
  private docker: Docker;
  private sandboxes = new Map<string, Sandbox>();
  private available: boolean | null = null;

  constructor() {
    // dockerode usa el socket de Docker por defecto (/var/run/docker.sock).
    this.docker = new Docker();
  }

  // Comprueba que el daemon de Docker está accesible.
  async isAvailable(): Promise<boolean> {
    if (this.available !== null) return this.available;
    try {
      await this.docker.ping();
      this.available = true;
    } catch {
      this.available = false;
    }
    return this.available;
  }

  private async ensureAvailable(): Promise<void> {
    const ok = await this.isAvailable();
    if (!ok) {
      throw new Error(
        "Docker no está disponible. Inicia el daemon: sudo systemctl start docker"
      );
    }
  }

  // Crea un contenedor nuevo para una tarea.
  async createSandbox(taskId: string, userId: string): Promise<Sandbox> {
    await this.ensureAvailable();

    // Si ya existe uno para esta tarea, lo devolvemos.
    const existing = this.sandboxes.get(taskId);
    if (existing && existing.isActive()) return existing;

    // Limpieza de contenedor previo muerto
    if (existing) {
      await this.stopSandbox(taskId).catch(() => {});
    }

    const container = await this.docker.createContainer({
      Image: SANDBOX_IMAGE,
      WorkingDir: WORKDIR,
      Tty: false,
      OpenStdin: false,
      Labels: { "mexa.taskId": taskId, "mexa.userId": userId },
      // Límites de recursos para evitar que una tarea consuma todo el host
      HostConfig: {
        Memory: 1024 * 1024 * 1024, // 1 GB RAM
        NanoCpus: 2_000_000_000, // 2 CPU
        NetworkMode: "bridge",
        AutoRemove: true,
      },
    });

    await container.start();

    const sandbox: Sandbox = {
      taskId,
      userId,
      containerId: container.id,
      createdAt: new Date(),
      isActive: () => this.sandboxes.get(taskId)?.containerId === container.id,
    };

    this.sandboxes.set(taskId, sandbox);
    return sandbox;
  }

  getSandbox(taskId: string): Sandbox | undefined {
    return this.sandboxes.get(taskId);
  }

  belongsToUser(taskId: string, userId: string): boolean {
    const s = this.sandboxes.get(taskId);
    return Boolean(s && s.userId === userId);
  }

  // Ejecuta un comando en el contenedor (vía bash -c).
  async exec(
    taskId: string,
    command: string,
    options: { timeoutMs?: number; cwd?: string } = {}
  ): Promise<ExecResult> {
    await this.ensureAvailable();
    const sandbox = this.sandboxes.get(taskId);
    if (!sandbox) throw new Error(`Sandbox no encontrado para la tarea ${taskId}`);

    const container = this.docker.getContainer(sandbox.containerId);
    const start = Date.now();

    const exec = await container.exec({
      Cmd: ["bash", "-c", command],
      AttachStdout: true,
      AttachStderr: true,
      WorkingDir: options.cwd || WORKDIR,
    });

    const stream = await exec.start({ Tty: false });

    let stdout = "";
    let stderr = "";

    // dockerode multiplexa stdout/stderr en el stream; hay que demuxear.
    await new Promise<void>((resolve, reject) => {
      const timeout = options.timeoutMs
        ? setTimeout(() => {
            stream.destroy();
            reject(new Error(`Timeout tras ${options.timeoutMs}ms`));
          }, options.timeoutMs)
        : null;

      this.docker.modem.demuxStream(stream, {
        write: (data: Buffer) => {
          stdout += data.toString("utf8");
        },
      }, {
        write: (data: Buffer) => {
          stderr += data.toString("utf8");
        },
      });

      stream.on("end", () => {
        if (timeout) clearTimeout(timeout);
        resolve();
      });
      stream.on("error", (err: Error) => {
        if (timeout) clearTimeout(timeout);
        reject(err);
      });
    });

    const inspectResult = (await exec.inspect()) as { ExitCode?: number };
    const exitCode = inspectResult.ExitCode ?? 0;

    return {
      exitCode,
      stdout,
      stderr,
      durationMs: Date.now() - start,
    };
  }

  // Ejecuta un script en un lenguaje específico.
  async runCode(
    taskId: string,
    language: "python" | "node" | "bash",
    code: string,
    options: { timeoutMs?: number } = {}
  ): Promise<ExecResult> {
    const runners: Record<string, string> = {
      python: "python3",
      node: "node",
      bash: "bash",
    };
    const runner = runners[language];
    if (!runner) throw new Error(`Lenguaje no soportado: ${language}`);

    // Escribir el código a un archivo temporal y ejecutarlo.
    const tmpFile = `/tmp/mexa_run_${Date.now()}.${language === "python" ? "py" : language === "node" ? "js" : "sh"}`;
    await this.writeFile(taskId, tmpFile, code);
    return this.exec(taskId, `${runner} ${tmpFile}`, options);
  }

  // Escribe un archivo en el filesystem del sandbox (via base64 para evitar escaping).
  async writeFile(taskId: string, path: string, content: string): Promise<void> {
    const b64 = Buffer.from(content, "utf8").toString("base64");
    // Crear directorio padre si no existe, luego decodificar y escribir.
    const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : ".";
    const cmd = `mkdir -p ${this.shellQuote(dir)} && printf %s ${this.shellQuote(b64)} | base64 -d > ${this.shellQuote(path)}`;
    const result = await this.exec(taskId, cmd);
    if (result.exitCode !== 0) {
      throw new Error(`No se pudo escribir ${path}: ${result.stderr}`);
    }
  }

  // Lee un archivo de texto del sandbox.
  async readFile(taskId: string, path: string): Promise<string> {
    const result = await this.exec(taskId, `cat ${this.shellQuote(path)} 2>/dev/null`);
    if (result.exitCode !== 0) {
      throw new Error(`No se pudo leer ${path}: ${result.stderr || "archivo no encontrado"}`);
    }
    return result.stdout;
  }

  // Lista archivos de un directorio del sandbox.
  async listFiles(taskId: string, path: string = WORKDIR): Promise<FileEntry[]> {
    // Formato: nombre|tipo|tamaño|fecha separados por \0 para parseo robusto
    const result = await this.exec(
      taskId,
      `cd ${this.shellQuote(path)} && for f in *; do ` +
        `if [ -e "$f" ]; then ` +
        `t=$([ -d "$f" ] && echo dir || echo file); ` +
        `s=$(stat -c %s "$f" 2>/dev/null || echo 0); ` +
        `m=$(stat -c %y "$f" 2>/dev/null | cut -d. -f1); ` +
        `printf '%s|%s|%s|%s\\n' "$f" "$t" "$s" "$m"; ` +
        `fi; done`
    );

    if (result.exitCode !== 0 && !result.stdout) {
      throw new Error(`No se pudo listar ${path}: ${result.stderr}`);
    }

    return result.stdout
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        const [name, type, size, modified] = line.split("|");
        return {
          name: name || "",
          path: `${path.replace(/\/$/, "")}/${name || ""}`,
          type: (type === "dir" ? "dir" : "file") as "file" | "dir",
          size: Number(size) || 0,
          modified: modified || new Date().toISOString(),
        };
      });
  }

  // Edita un archivo reemplazando un texto por otro.
  async editFile(taskId: string, path: string, oldText: string, newText: string): Promise<void> {
    // Usar sed con escapado de delimitador para evitar inyección.
    const escapedOld = oldText.replace(/'/g, "'\\''");
    const escapedNew = newText.replace(/'/g, "'\\''");
    const cmd = `sed -i 's#${escapedOld}#${escapedNew}#g' ${this.shellQuote(path)}`;
    const result = await this.exec(taskId, cmd);
    if (result.exitCode !== 0) {
      throw new Error(`No se pudo editar ${path}: ${result.stderr}`);
    }
  }

  // Elimina un archivo o directorio.
  async deleteFile(taskId: string, path: string): Promise<void> {
    const result = await this.exec(taskId, `rm -rf ${this.shellQuote(path)}`);
    if (result.exitCode !== 0) {
      throw new Error(`No se pudo eliminar ${path}: ${result.stderr}`);
    }
  }

  // Detiene y elimina el contenedor de una tarea.
  async stopSandbox(taskId: string): Promise<void> {
    const sandbox = this.sandboxes.get(taskId);
    if (!sandbox) return;
    try {
      const container = this.docker.getContainer(sandbox.containerId);
      await container.stop({ t: 5 }).catch(() => {});
      await container.remove({ force: true }).catch(() => {});
    } finally {
      this.sandboxes.delete(taskId);
    }
  }

  // Cita simple de un path para bash (single-quote safe).
  private shellQuote(s: string): string {
    return "'" + s.replace(/'/g, "'\\''") + "'";
  }
}

// Singleton compartido por los endpoints y el tool-registry.
import { getUserId } from "../api/auth";
let sandboxManagerInstance: SandboxManager | null = null;
export function getSandboxManager(): SandboxManager {
  if (!sandboxManagerInstance) {
    sandboxManagerInstance = new SandboxManager();
  }
  return sandboxManagerInstance;
}

// Helper para obtener/crear un sandbox asociado al usuario demo actual.
export async function getOrCreateSandbox(taskId: string): Promise<Sandbox> {
  const manager = getSandboxManager();
  const existing = manager.getSandbox(taskId);
  if (existing && existing.isActive()) return existing;
  return manager.createSandbox(taskId, getUserId());
}
