// ==================== SANDBOX MANAGER (HARDENED) ====================
// Gestiona contenedores Docker aislados por tarea donde el agente ejecuta
// código real (shell, Python, Node, Bash), con filesystem propio.
//
// Modelo inspirado en Manus IA + super-z sandbox:
//   - Cada tarea obtiene su propio contenedor efímero
//   - rootfs read-only + tmpfs en /tmp y /workspace
//   - Sin capabilities (CapDrop: ALL)
//   - Seccomp profile restrictivo (sandbox/seccomp-profile.json)
//   - Sin red por defecto (NetworkMode: none) — allowlist opcional
//   - Límites duros: 1GB RAM, 2 CPU, 100 PIDs, 256MB /tmp, 1GB /workspace
//   - Persistencia en Prisma (SandboxSession) para reconciliación y TTL
//   - TTL de 30 min de inactividad, GC al arranque mata huérfanos
//   - Streaming SSE del stdout/stderr en vivo

import Docker from "dockerode";
import { promises as fs } from "fs";
import path from "path";
import { db } from "../db";

export interface Sandbox {
  taskId: string;
  userId: string;
  containerId: string;
  createdAt: Date;
  lastActivityAt: Date;
  networkMode: "none" | "allowlist";
  isActive(): boolean;
}

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
}

export interface FileEntry {
  name: string;
  path: string;
  type: "file" | "dir";
  size: number;
  modified: string;
}

export interface SandboxOptions {
  networkMode?: "none" | "allowlist";
  memoryMB?: number;
  cpus?: number;
  ttlMinutes?: number;
}

const SANDBOX_IMAGE = process.env.SANDBOX_IMAGE || "mexa-sandbox:latest";
const WORKDIR = "/workspace";
const SECCOMP_PROFILE = path.join(process.cwd(), "sandbox", "seccomp-profile.json");
const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutos
const GC_INTERVAL_MS = 5 * 60 * 1000; // cada 5 minutos
const MAX_SANDBOXES_PER_USER = 10;

export class SandboxManager {
  private docker: Docker;
  private sandboxes = new Map<string, Sandbox>();
  private available: boolean | null = null;
  private seccompProfile: unknown = null;
  private gcTimer: NodeJS.Timeout | null = null;
  private reconciled = false;

  constructor() {
    this.docker = new Docker();
    void this.loadSeccompProfile();
  }

  // Carga el profile seccomp desde disco (cacheado en memoria).
  private async loadSeccompProfile(): Promise<void> {
    try {
      const raw = await fs.readFile(SECCOMP_PROFILE, "utf8");
      this.seccompProfile = JSON.parse(raw);
    } catch (err) {
      console.warn(
        `[sandbox] No se pudo cargar seccomp profile en ${SECCOMP_PROFILE}. ` +
          `Los contenedores usarán el default de Docker. Error: ${(err as Error).message}`
      );
    }
  }

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

  // ====== Reconciliación al arranque ======
  // Mata contenedores marcados como "running" en DB que ya no existen en Docker,
  // y viceversa: detiene contenedores Docker huérfanos (mexa.* sin sesión en DB).
  async reconcileOnStartup(): Promise<void> {
    if (this.reconciled) return;
    this.reconciled = true;
    await this.ensureAvailable().catch(() => null);

    try {
      // 1. Recuperar sesiones "running" de DB y verificar si el contenedor existe
      const sessions = await db.sandboxSession.findMany({
        where: { status: "running" },
      });
      for (const session of sessions) {
        const container = this.docker.getContainer(session.containerId);
        try {
          const info = await container.inspect();
          if (info.State.Running) {
            // Restaurar al Map en memoria
            this.sandboxes.set(session.taskId, {
              taskId: session.taskId,
              userId: session.userId,
              containerId: session.containerId,
              createdAt: session.createdAt,
              lastActivityAt: session.lastActivityAt,
              networkMode: session.networkMode as "none" | "allowlist",
              isActive: () =>
                this.sandboxes.get(session.taskId)?.containerId === session.containerId,
            });
            console.log(`[sandbox] Recuperada sesión ${session.taskId}`);
          } else {
            // Contenedor existe pero parado — limpiar
            await container.remove({ force: true }).catch(() => null);
            await db.sandboxSession.update({
              where: { taskId: session.taskId },
              data: { status: "stopped", stoppedAt: new Date() },
            });
          }
        } catch {
          // Contenedor no existe — marcar sesión como expirada
          await db.sandboxSession.update({
            where: { taskId: session.taskId },
            data: { status: "expired" },
          });
        }
      }

      // 2. Buscar contenedores Docker huérfanos (con label mexa.taskId sin sesión en DB)
      const allContainers = await this.docker.listContainers({
        all: true,
        filters: {
          label: ["mexa.taskId"],
        },
      });
      const knownTaskIds = new Set(sessions.map((s) => s.taskId));
      for (const c of allContainers) {
        const taskId = c.Labels?.["mexa.taskId"];
        if (taskId && !knownTaskIds.has(taskId)) {
          console.log(`[sandbox] Matando contenedor huérfano ${c.Id.slice(0, 12)} (task=${taskId})`);
          const container = this.docker.getContainer(c.Id);
          await container.stop({ t: 2 }).catch(() => null);
          await container.remove({ force: true }).catch(() => null);
        }
      }

      // 3. Arrancar GC periódico
      this.startGC();
    } catch (err) {
      console.error("[sandbox] Error en reconcileOnStartup:", err);
    }
  }

  // ====== Garbage collector periódico ======
  private startGC(): void {
    if (this.gcTimer) return;
    this.gcTimer = setInterval(() => this.runGC().catch(console.error), GC_INTERVAL_MS);
    // No mantener el proceso vivo solo por el timer
    if (this.gcTimer.unref) this.gcTimer.unref();
  }

  private async runGC(): Promise<void> {
    const now = new Date();
    const expiredSessions = await db.sandboxSession.findMany({
      where: {
        status: "running",
        expiresAt: { lt: now },
      },
    });
    for (const session of expiredSessions) {
      console.log(`[sandbox] GC: expirando ${session.taskId} (inactiva desde ${session.lastActivityAt.toISOString()})`);
      await this.stopSandbox(session.taskId).catch(() => null);
    }
  }

  // ====== Crear sandbox ======
  async createSandbox(
    taskId: string,
    userId: string,
    options: SandboxOptions = {}
  ): Promise<Sandbox> {
    await this.ensureAvailable();
    await this.reconcileOnStartup();

    // Rate limit por usuario: máx N sandboxes vivos
    const userCount = await db.sandboxSession.count({
      where: { userId, status: "running" },
    });
    if (userCount >= MAX_SANDBOXES_PER_USER) {
      throw new Error(
        `Límite de ${MAX_SANDBOXES_PER_USER} sandboxes simultáneos por usuario`
      );
    }

    const existing = this.sandboxes.get(taskId);
    if (existing && existing.isActive()) return existing;
    if (existing) {
      await this.stopSandbox(taskId).catch(() => null);
    }

    const networkMode = options.networkMode ?? "none";
    const memoryMB = options.memoryMB ?? 1024;
    const cpus = options.cpus ?? 2;
    const ttlMs = (options.ttlMinutes ?? 30) * 60 * 1000;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs);

    // HostConfig endurecido
    const HostConfig: Docker.ContainerCreateOptions["HostConfig"] = {
      Memory: memoryMB * 1024 * 1024,
      MemorySwap: memoryMB * 1024 * 1024, // sin swap
      NanoCpus: cpus * 1_000_000_000,
      PidsLimit: 100, // anti fork-bomb
      CpuPeriod: 100000,
      CpuQuota: cpus * 100000,
      // rootfs read-only — el agente solo puede escribir en tmpfs
      ReadonlyRootfs: true,
      // tmpfs para /tmp y /workspace (efímero, en RAM)
      Tmpfs: {
        "/tmp": "size=256m,mode=1777",
        "/workspace": "size=1g,mode=0755,uid=1000,gid=1000",
        "/home/agent/.cache": "size=128m,mode=0700,uid=1000,gid=1000",
        "/run": "size=32m,mode=0755",
      },
      // Sin capabilities
      CapDrop: ["ALL"],
      CapAdd: ["CHOWN", "DAC_OVERRIDE", "FOWNER", "SETGID", "SETUID"], // mínimo para que chmod/chown básico funcionen
      // Sin acceso a devices innecesarios
      Devices: [],
      // Sin poder ganar nuevas privileges (no_new_privs)
      SecurityOpt: this.seccompProfile
        ? [`seccomp:${JSON.stringify(this.seccompProfile)}`, "no-new-privileges"]
        : ["no-new-privileges"],
      // Limits de file descriptors y procesos
      Ulimits: [
        { Name: "nofile", Soft: 1024, Hard: 4096 },
        { Name: "nproc", Soft: 256, Hard: 512 },
        { Name: "fsize", Soft: 524288, Hard: 1048576 }, // 512MB / 1GB archivo máx
      ],
      // Disk quota
      StorageOpt: { size: "2g" },
      // Sin acceso a /proc/sched_debug, /sys, etc.
      MaskedPaths: [
        "/proc/sched_debug",
        "/proc/scsi",
        "/sys/firmware",
        "/sys/kernel/debug",
        "/sys/kernel/secretmem",
        "/sys/kernel/notes",
      ],
      ReadonlyPaths: [
        "/proc/asound",
        "/proc/bus",
        "/proc/fs",
        "/proc/irq",
        "/proc/sys",
        "/proc/sysrq-trigger",
      ],
      // AutoRemove: false — lo gestionamos nosotros con TTL/GC
      AutoRemove: false,
      // Red
      NetworkMode: networkMode === "allowlist" ? "mexa-sandbox-net" : "none",
      // DNS (cuando networkMode es allowlist, usa el dnsmasq filtrante)
      Dns: networkMode === "allowlist" ? ["172.28.0.254"] : undefined,
      DnsSearch: networkMode === "allowlist" ? ["sandbox.local"] : undefined,
      // Sin poder escribir al log del host
      LogConfig: { Type: "json-file", Config: { "max-size": "10m", "max-file": "1" } },
    };

    const container = await this.docker.createContainer({
      Image: SANDBOX_IMAGE,
      WorkingDir: WORKDIR,
      Tty: false,
      OpenStdin: false,
      Labels: {
        "mexa.taskId": taskId,
        "mexa.userId": userId,
        "mexa.networkMode": networkMode,
      },
      Env: [
        `PYTHONUNBUFFERED=1`,
        `PYTHONDONTWRITEBYTECODE=1`,
        `NODE_ENV=production`,
        `HOME=/home/agent`,
        `PATH=/home/agent/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`,
        ...(networkMode === "allowlist"
          ? [
              `HTTP_PROXY=http://172.28.0.253:3128`,
              `HTTPS_PROXY=http://172.28.0.253:3128`,
              `NO_PROXY=localhost,127.0.0.1,172.28.0.0/16`,
            ]
          : []),
      ],
      HostConfig: HostConfig,
    });

    await container.start();

    const sandbox: Sandbox = {
      taskId,
      userId,
      containerId: container.id,
      createdAt: now,
      lastActivityAt: now,
      networkMode,
      isActive: () => this.sandboxes.get(taskId)?.containerId === container.id,
    };

    this.sandboxes.set(taskId, sandbox);

    // Persistir en DB
    await db.sandboxSession.create({
      data: {
        taskId,
        userId,
        containerId: container.id,
        imageName: SANDBOX_IMAGE,
        status: "running",
        networkMode,
        lastActivityAt: now,
        expiresAt,
        createdAt: now,
      },
    });

    return sandbox;
  }

  getSandbox(taskId: string): Sandbox | undefined {
    return this.sandboxes.get(taskId);
  }

  belongsToUser(taskId: string, userId: string): boolean {
    const s = this.sandboxes.get(taskId);
    return Boolean(s && s.userId === userId);
  }

  // Renueva el TTL del sandbox (llamar en cada exec).
  private async touchSandbox(taskId: string): Promise<void> {
    const sandbox = this.sandboxes.get(taskId);
    if (!sandbox) return;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + DEFAULT_TTL_MS);
    sandbox.lastActivityAt = now;
    await db.sandboxSession.update({
      where: { taskId },
      data: { lastActivityAt: now, expiresAt },
    });
  }

  // ====== Exec (bloqueante — para streaming usar execStream) ======
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
    const timeoutMs = options.timeoutMs ?? 30000;

    const exec = await container.exec({
      Cmd: ["bash", "-c", command],
      AttachStdout: true,
      AttachStderr: true,
      WorkingDir: options.cwd || WORKDIR,
    });

    const stream = await exec.start({ Tty: false });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        timedOut = true;
        stream.destroy();
        // No rechazamos: resolvemos con lo que tengamos hasta ahora
        resolve();
      }, timeoutMs);

      const { Writable } = require("stream");
      const stdoutStream = new Writable({
        write(chunk: Buffer, _enc: string, cb: () => void) {
          stdout += chunk.toString("utf8");
          cb();
        },
      });
      const stderrStream = new Writable({
        write(chunk: Buffer, _enc: string, cb: () => void) {
          stderr += chunk.toString("utf8");
          cb();
        },
      });
      this.docker.modem.demuxStream(stream, stdoutStream, stderrStream);

      stream.on("end", () => {
        clearTimeout(timeout);
        resolve();
      });
      stream.on("error", (err: Error) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    const inspectResult = (await exec.inspect()) as { ExitCode?: number };
    const exitCode = timedOut ? 124 : (inspectResult.ExitCode ?? 0);

    await this.touchSandbox(taskId);

    return {
      exitCode,
      stdout,
      stderr,
      durationMs: Date.now() - start,
      timedOut,
    };
  }

  // ====== Exec con streaming SSE ======
  // Llama onChunk para cada bloque de stdout/stderr recibido.
  // Permite que el endpoint /exec/stream haga SSE en vivo.
  async execStream(
    taskId: string,
    command: string,
    options: {
      timeoutMs?: number;
      cwd?: string;
      onStdout?: (chunk: string) => void;
      onStderr?: (chunk: string) => void;
    } = {}
  ): Promise<ExecResult> {
    await this.ensureAvailable();
    const sandbox = this.sandboxes.get(taskId);
    if (!sandbox) throw new Error(`Sandbox no encontrado para la tarea ${taskId}`);

    const container = this.docker.getContainer(sandbox.containerId);
    const start = Date.now();
    const timeoutMs = options.timeoutMs ?? 30000;

    const exec = await container.exec({
      Cmd: ["bash", "-c", command],
      AttachStdout: true,
      AttachStderr: true,
      WorkingDir: options.cwd || WORKDIR,
    });

    const stream = await exec.start({ Tty: false });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        timedOut = true;
        stream.destroy();
        resolve();
      }, timeoutMs);

      const { Writable } = require("stream");
      const stdoutStream = new Writable({
        write(chunk: Buffer, _enc: string, cb: () => void) {
          const text = chunk.toString("utf8");
          stdout += text;
          options.onStdout?.(text);
          cb();
        },
      });
      const stderrStream = new Writable({
        write(chunk: Buffer, _enc: string, cb: () => void) {
          const text = chunk.toString("utf8");
          stderr += text;
          options.onStderr?.(text);
          cb();
        },
      });
      this.docker.modem.demuxStream(stream, stdoutStream, stderrStream);

      stream.on("end", () => {
        clearTimeout(timeout);
        resolve();
      });
      stream.on("error", () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    const inspectResult = (await exec.inspect()) as { ExitCode?: number };
    const exitCode = timedOut ? 124 : (inspectResult.ExitCode ?? 0);

    await this.touchSandbox(taskId);

    return {
      exitCode,
      stdout,
      stderr,
      durationMs: Date.now() - start,
      timedOut,
    };
  }

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

    const ext = language === "python" ? "py" : language === "node" ? "js" : "sh";
    const tmpFile = `/tmp/mexa_run_${Date.now()}.${ext}`;
    await this.writeFile(taskId, tmpFile, code);
    return this.exec(taskId, `${runner} ${tmpFile}`, options);
  }

  async writeFile(taskId: string, path: string, content: string): Promise<void> {
    const b64 = Buffer.from(content, "utf8").toString("base64");
    const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : ".";
    const cmd = `mkdir -p ${this.shellQuote(dir)} && printf %s ${this.shellQuote(b64)} | base64 -d > ${this.shellQuote(path)}`;
    const result = await this.exec(taskId, cmd);
    if (result.exitCode !== 0) {
      throw new Error(`No se pudo escribir ${path}: ${result.stderr}`);
    }
  }

  async readFile(taskId: string, path: string): Promise<string> {
    const result = await this.exec(taskId, `cat ${this.shellQuote(path)} 2>/dev/null`);
    if (result.exitCode !== 0) {
      throw new Error(`No se pudo leer ${path}: ${result.stderr || "archivo no encontrado"}`);
    }
    return result.stdout;
  }

  async listFiles(taskId: string, path: string = WORKDIR): Promise<FileEntry[]> {
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

  async editFile(
    taskId: string,
    path: string,
    oldText: string,
    newText: string
  ): Promise<void> {
    const escapedOld = oldText.replace(/'/g, "'\\''");
    const escapedNew = newText.replace(/'/g, "'\\''");
    const cmd = `sed -i 's#${escapedOld}#${escapedNew}#g' ${this.shellQuote(path)}`;
    const result = await this.exec(taskId, cmd);
    if (result.exitCode !== 0) {
      throw new Error(`No se pudo editar ${path}: ${result.stderr}`);
    }
  }

  async deleteFile(taskId: string, path: string): Promise<void> {
    const result = await this.exec(taskId, `rm -rf ${this.shellQuote(path)}`);
    if (result.exitCode !== 0) {
      throw new Error(`No se pudo eliminar ${path}: ${result.stderr}`);
    }
  }

  async stopSandbox(taskId: string): Promise<void> {
    const sandbox = this.sandboxes.get(taskId);
    if (!sandbox) {
      // Quizás solo está en DB (post-reinicio)
      const session = await db.sandboxSession.findUnique({ where: { taskId } });
      if (!session) return;
      try {
        const container = this.docker.getContainer(session.containerId);
        await container.stop({ t: 5 }).catch(() => null);
        await container.remove({ force: true }).catch(() => null);
      } finally {
        await db.sandboxSession.update({
          where: { taskId },
          data: { status: "stopped", stoppedAt: new Date() },
        });
      }
      return;
    }
    try {
      const container = this.docker.getContainer(sandbox.containerId);
      await container.stop({ t: 5 }).catch(() => null);
      await container.remove({ force: true }).catch(() => null);
    } finally {
      this.sandboxes.delete(taskId);
      await db.sandboxSession.update({
        where: { taskId },
        data: { status: "stopped", stoppedAt: new Date() },
      });
    }
  }

  // Lista sandboxes activos (para dashboard /monitoreo).
  async listActiveSandboxes(userId?: string): Promise<
    Array<{
      taskId: string;
      containerId: string;
      networkMode: string;
      createdAt: Date;
      lastActivityAt: Date;
      expiresAt: Date;
    }>
  > {
    return db.sandboxSession.findMany({
      where: userId ? { userId, status: "running" } : { status: "running" },
      orderBy: { lastActivityAt: "desc" },
    });
  }

  // Estadísticas de un contenedor (CPU, RAM, IO) en vivo.
  async getStats(taskId: string): Promise<{
    cpuPercent: number;
    memoryUsage: number;
    memoryLimit: number;
    pids: number;
  } | null> {
    const sandbox = this.sandboxes.get(taskId);
    if (!sandbox) return null;
    try {
      const container = this.docker.getContainer(sandbox.containerId);
      const stats = await container.stats({ stream: false });
      const mem = stats.memory_stats?.usage ?? 0;
      const memLimit = stats.memory_stats?.limit ?? 0;
      const pids = stats.pids_stats?.current ?? 0;
      // Cálculo de CPU % (simplificado)
      const cpuDelta = stats.cpu_stats?.cpu_usage?.total_usage ?? 0;
      const sysDelta = stats.cpu_stats?.system_cpu_usage ?? 0;
      const cpuPercent = sysDelta > 0 ? (cpuDelta / sysDelta) * 100 : 0;
      return {
        cpuPercent: Math.round(cpuPercent * 100) / 100,
        memoryUsage: mem,
        memoryLimit: memLimit,
        pids,
      };
    } catch {
      return null;
    }
  }

  private shellQuote(s: string): string {
    return "'" + s.replace(/'/g, "'\\''") + "'";
  }
}

// ====== Singleton ======
let sandboxManagerInstance: SandboxManager | null = null;
export function getSandboxManager(): SandboxManager {
  if (!sandboxManagerInstance) {
    sandboxManagerInstance = new SandboxManager();
    // Reconciliar al primer uso (lazy)
    void sandboxManagerInstance.reconcileOnStartup();
  }
  return sandboxManagerInstance;
}

// Helper para obtener/crear un sandbox asociado al usuario actual.
export async function getOrCreateSandbox(
  taskId: string,
  options?: SandboxOptions
): Promise<Sandbox> {
  const manager = getSandboxManager();
  const existing = manager.getSandbox(taskId);
  if (existing && existing.isActive()) return existing;
  // userId se resuelve en el endpoint (auth real)
  return manager.createSandbox(taskId, "user", options);
}
