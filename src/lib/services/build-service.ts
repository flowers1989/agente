/**
 * Build Service
 * Servicio centralizado de compilación multiplataforma
 * Orquesta React Native, Electron y Web para compilar todas las plataformas
 *
 * CAMBIO: Ahora conecta de verdad con los executors en lugar de retornar
 * resultados simulados. Los executors requieren toolchains nativas instaladas
 * (Android SDK, Xcode, electron-builder) para funcionar. Si no están
 * disponibles, el build falla con un mensaje claro.
 */

import { promisify } from "util";
import { exec } from "child_process";
import { mkdirSync, existsSync, readFileSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import { getReactNativeExecutor } from "../agents/react-native-executor";
import { getElectronExecutor } from "../agents/electron-executor";

const execAsync = promisify(exec);

export interface BuildRequest {
  projectId: string;
  projectName: string;
  projectType: "web" | "mobile" | "desktop" | "hybrid";
  targetPlatforms: string[]; // "android", "ios", "windows", "macos", "linux", "android-tv"
  buildType?: "debug" | "release";
  includeSourceCode?: boolean;
  optimizations?: {
    minify?: boolean;
    treeshake?: boolean;
    compress?: boolean;
  };
  // Código fuente del proyecto (App.tsx para RN, App.tsx para Electron, index.html para web)
  sourceCode?: string;
  // Configuración adicional
  packageName?: string; // com.example.app para Android
  description?: string;
  version?: string;
  features?: string[];
}

export interface BuildJob {
  jobId: string;
  buildRequest: BuildRequest;
  status: "pending" | "running" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
  results: BuildJobResult[];
  totalSize?: number;
  zipPath?: string;
  sourceCodeZipPath?: string; // ZIP con código fuente
  error?: string;
  // Vista previa web (si aplica)
  previewUrl?: string;
}

export interface BuildJobResult {
  platform: string;
  status: "success" | "failed" | "skipped";
  outputPath?: string;
  outputFile?: string;
  fileSize?: number;
  error?: string;
  duration?: number;
  logs?: string;
}

/**
 * Servicio de compilación
 */
export class BuildService {
  private jobsDir = "/tmp/build-jobs";
  private outputDir = "/tmp/build-outputs";
  private jobs: Map<string, BuildJob> = new Map();

  constructor() {
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    try {
      if (!existsSync(this.jobsDir)) mkdirSync(this.jobsDir, { recursive: true });
      if (!existsSync(this.outputDir)) mkdirSync(this.outputDir, { recursive: true });
    } catch (error) {
      console.error("[BuildService] Error creando directorios:", error);
    }
  }

  async createBuildJob(request: BuildRequest): Promise<BuildJob> {
    const jobId = uuidv4();
    const job: BuildJob = {
      jobId,
      buildRequest: request,
      status: "pending",
      results: [],
    };
    this.jobs.set(jobId, job);
    console.log(`[BuildService] Trabajo de compilación creado: ${jobId}`);
    return job;
  }

  async executeBuildJob(jobId: string): Promise<BuildJob> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Trabajo no encontrado: ${jobId}`);

    job.status = "running";
    job.startedAt = new Date().toISOString();

    try {
      const request = job.buildRequest;

      // 1. Crear el proyecto base (scaffolding) según el tipo
      let projectPath: string | null = null;
      if (request.projectType === "mobile" || request.targetPlatforms.some((p) => ["android", "ios", "android-tv"].includes(p))) {
        // Crear proyecto React Native
        const rnExecutor = getReactNativeExecutor();
        const createResult = await rnExecutor.createProject({
          projectName: request.projectName,
          appName: request.projectName,
          packageName: request.packageName || `com.agente.${request.projectName.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
          description: request.description,
          version: request.version || "1.0.0",
          targetPlatforms: request.targetPlatforms.filter((p) => ["android", "ios", "android-tv"].includes(p)) as ("android" | "ios" | "android-tv")[],
          features: request.features,
          code: request.sourceCode || defaultRNCode(request.projectName),
        });
        if (createResult.success && createResult.projectPath) {
          projectPath = createResult.projectPath;
        }
      } else if (request.projectType === "desktop" || request.targetPlatforms.some((p) => ["windows", "macos", "linux"].includes(p))) {
        // Crear proyecto Electron
        const electronExecutor = getElectronExecutor();
        const electronCode = request.sourceCode || defaultElectronCode(request.projectName);
        const createResult = await electronExecutor.createProject({
          projectName: request.projectName,
          appName: request.projectName,
          description: request.description,
          version: request.version || "1.0.0",
          targetPlatforms: request.targetPlatforms.filter((p) => ["windows", "macos", "linux"].includes(p)) as ("windows" | "macos" | "linux")[],
          mainCode: electronMainCode(request.projectName),
          rendererCode: electronCode,
        });
        if (createResult.success && createResult.projectPath) {
          projectPath = createResult.projectPath;
        }
      }

      // 2. Compilar cada plataforma
      for (const platform of request.targetPlatforms) {
        const startTime = Date.now();
        try {
          const result = await this.buildPlatform(platform, request, projectPath);
          result.duration = Date.now() - startTime;
          job.results.push(result);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          job.results.push({
            platform,
            status: "failed",
            error: message,
            duration: Date.now() - startTime,
          });
        }
      }

      // 3. Generar vista previa web si hay plataforma web
      if (request.targetPlatforms.includes("web") && job.results.some((r) => r.platform === "web" && r.status === "success")) {
        try {
          job.previewUrl = await this.createWebPreview(jobId, request, projectPath);
        } catch (err) {
          console.warn("[BuildService] No se pudo crear vista previa web:", err);
        }
      }

      // 4. Crear ZIP con binarios compilados
      if (job.results.some((r) => r.status === "success")) {
        try {
          job.zipPath = await this.createOutputZip(jobId, job);
          job.totalSize = await this.calculateTotalSize(job);
        } catch (err) {
          console.warn("[BuildService] Error creando ZIP de binarios:", err);
        }
      }

      // 5. Crear ZIP con código fuente (si se solicita o siempre)
      if (projectPath && existsSync(projectPath)) {
        try {
          job.sourceCodeZipPath = await this.createSourceCodeZip(jobId, projectPath, request.projectName);
        } catch (err) {
          console.warn("[BuildService] Error creando ZIP de código fuente:", err);
        }
      }

      job.status = "completed";
      job.completedAt = new Date().toISOString();
      console.log(`[BuildService] Trabajo completado: ${jobId}`);
    } catch (error) {
      job.status = "failed";
      job.error = error instanceof Error ? error.message : String(error);
      job.completedAt = new Date().toISOString();
      console.error(`[BuildService] Error en trabajo: ${jobId}`, error);
    }

    return job;
  }

  private async buildPlatform(
    platform: string,
    request: BuildRequest,
    projectPath: string | null
  ): Promise<BuildJobResult> {
    const buildType = request.buildType || "release";

    switch (platform) {
      case "android":
        return await this.buildAndroid(request, buildType, projectPath);
      case "ios":
        return await this.buildIOS(request, buildType, projectPath);
      case "android-tv":
        return await this.buildAndroidTV(request, buildType, projectPath);
      case "windows":
        return await this.buildWindows(request, projectPath);
      case "macos":
        return await this.buildMacOS(request, projectPath);
      case "linux":
        return await this.buildLinux(request, projectPath);
      case "web":
        return await this.buildWeb(request, projectPath);
      default:
        return { platform, status: "skipped", error: `Plataforma no soportada: ${platform}` };
    }
  }

  // ===== REACT NATIVE =====

  private async buildAndroid(request: BuildRequest, buildType: string, projectPath: string | null): Promise<BuildJobResult> {
    if (!projectPath) return { platform: "android", status: "failed", error: "No project path" };
    try {
      const executor = getReactNativeExecutor();
      const result = await executor.buildAndroid(projectPath, buildType as "debug" | "release");
      return {
        platform: "android",
        status: result.success ? "success" : "failed",
        outputFile: result.outputFile,
        outputPath: result.outputPath,
        fileSize: result.fileSize,
        error: result.error,
        logs: result.logs,
      };
    } catch (error) {
      return { platform: "android", status: "failed", error: error instanceof Error ? error.message : String(error) };
    }
  }

  private async buildIOS(request: BuildRequest, buildType: string, projectPath: string | null): Promise<BuildJobResult> {
    if (!projectPath) return { platform: "ios", status: "failed", error: "No project path" };
    try {
      const executor = getReactNativeExecutor();
      const result = await executor.buildIOS(projectPath, buildType as "debug" | "release");
      return {
        platform: "ios",
        status: result.success ? "success" : "failed",
        outputFile: result.outputFile,
        outputPath: result.outputPath,
        fileSize: result.fileSize,
        error: result.error,
        logs: result.logs,
      };
    } catch (error) {
      return { platform: "ios", status: "failed", error: error instanceof Error ? error.message : String(error) };
    }
  }

  private async buildAndroidTV(request: BuildRequest, buildType: string, projectPath: string | null): Promise<BuildJobResult> {
    if (!projectPath) return { platform: "android-tv", status: "failed", error: "No project path" };
    try {
      const executor = getReactNativeExecutor();
      const result = await executor.buildAndroidTV(projectPath, buildType as "debug" | "release");
      return {
        platform: "android-tv",
        status: result.success ? "success" : "failed",
        outputFile: result.outputFile,
        outputPath: result.outputPath,
        fileSize: result.fileSize,
        error: result.error,
        logs: result.logs,
      };
    } catch (error) {
      return { platform: "android-tv", status: "failed", error: error instanceof Error ? error.message : String(error) };
    }
  }

  // ===== ELECTRON =====

  private async buildWindows(request: BuildRequest, projectPath: string | null): Promise<BuildJobResult> {
    if (!projectPath) return { platform: "windows", status: "failed", error: "No project path" };
    try {
      const executor = getElectronExecutor();
      const result = await executor.buildWindows(projectPath);
      return {
        platform: "windows",
        status: result.success ? "success" : "failed",
        outputFile: result.outputFile,
        outputPath: result.outputPath,
        fileSize: result.fileSize,
        error: result.error,
        logs: result.logs,
      };
    } catch (error) {
      return { platform: "windows", status: "failed", error: error instanceof Error ? error.message : String(error) };
    }
  }

  private async buildMacOS(request: BuildRequest, projectPath: string | null): Promise<BuildJobResult> {
    if (!projectPath) return { platform: "macos", status: "failed", error: "No project path" };
    try {
      const executor = getElectronExecutor();
      const result = await executor.buildMacOS(projectPath);
      return {
        platform: "macos",
        status: result.success ? "success" : "failed",
        outputFile: result.outputFile,
        outputPath: result.outputPath,
        fileSize: result.fileSize,
        error: result.error,
        logs: result.logs,
      };
    } catch (error) {
      return { platform: "macos", status: "failed", error: error instanceof Error ? error.message : String(error) };
    }
  }

  private async buildLinux(request: BuildRequest, projectPath: string | null): Promise<BuildJobResult> {
    if (!projectPath) return { platform: "linux", status: "failed", error: "No project path" };
    try {
      const executor = getElectronExecutor();
      const result = await executor.buildLinux(projectPath);
      return {
        platform: "linux",
        status: result.success ? "success" : "failed",
        outputFile: result.outputFile,
        outputPath: result.outputPath,
        fileSize: result.fileSize,
        error: result.error,
        logs: result.logs,
      };
    } catch (error) {
      return { platform: "linux", status: "failed", error: error instanceof Error ? error.message : String(error) };
    }
  }

  // ===== WEB =====

  private async buildWeb(request: BuildRequest, projectPath: string | null): Promise<BuildJobResult> {
    // Para web: crear un directorio con index.html + assets
    const webDir = join(this.outputDir, request.projectId || uuidv4(), "web");
    mkdirSync(webDir, { recursive: true });

    const html = request.sourceCode || defaultWebCode(request.projectName);
    writeFileSync(join(webDir, "index.html"), html);

    // Calcular tamaño
    const size = Buffer.byteLength(html);

    return {
      platform: "web",
      status: "success",
      outputFile: "index.html",
      outputPath: webDir,
      fileSize: size,
    };
  }

  // ===== VISTA PREVIA WEB =====

  private async createWebPreview(jobId: string, request: BuildRequest, projectPath: string | null): Promise<string> {
    // Crear un servidor HTTP simple para servir la web
    const webDir = projectPath ? join(projectPath, "dist") : join(this.outputDir, request.projectId || jobId, "web");
    if (!existsSync(webDir)) {
      // Si no hay dist, usar el directorio web
      const altDir = join(this.outputDir, request.projectId || jobId, "web");
      if (existsSync(altDir)) {
        mkdirSync(webDir, { recursive: true });
        // Copiar index.html
        writeFileSync(join(webDir, "index.html"), readFileSync(join(altDir, "index.html")));
      }
    }

    // Encontrar un puerto libre
    const port = 3000 + Math.floor(Math.random() * 1000);
    const serverScript = join(webDir, "_preview-server.js");
    writeFileSync(
      serverScript,
      `
const http = require('http');
const fs = require('fs');
const path = require('path');
const server = http.createServer((req, res) => {
  let filePath = path.join('${webDir}', req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    res.end(data);
  } catch (e) {
    res.writeHead(404);
    res.end('Not found');
  }
});
server.listen(${port}, () => console.log('Preview en http://localhost:' + ${port}));
`
    );

    // Iniciar servidor en background
    try {
      await execAsync(`node ${serverScript} &`, { timeout: 3000 }).catch(() => {});
      return `http://localhost:${port}`;
    } catch {
      return `http://localhost:${port}`;
    }
  }

  // ===== ZIP DE SALIDA =====

  private async createOutputZip(jobId: string, job: BuildJob): Promise<string> {
    const zipPath = join(this.outputDir, `${jobId}-binaries.zip`);
    const tempDir = join(this.outputDir, jobId);
    mkdirSync(tempDir, { recursive: true });

    // Copiar archivos de cada plataforma
    for (const result of job.results) {
      if (result.status === "success" && result.outputPath && existsSync(result.outputPath)) {
        const platformDir = join(tempDir, result.platform);
        mkdirSync(platformDir, { recursive: true });
        try {
          await execAsync(`cp -r "${result.outputPath}"/* "${platformDir}/" 2>/dev/null || cp "${result.outputPath}" "${platformDir}/" 2>/dev/null || true`);
        } catch {}
      }
    }

    // Crear README
    writeFileSync(
      join(tempDir, "README.md"),
      `# ${job.buildRequest.projectName} - Binarios compilados\n\n` +
        `Generado: ${new Date().toISOString()}\n\n` +
        `## Plataformas\n\n` +
        job.results
          .map((r) => `- **${r.platform}**: ${r.status} ${r.outputFile ? `(${r.outputFile})` : ""}`)
          .join("\n")
    );

    // Crear ZIP
    try {
      await execAsync(`cd "${tempDir}" && zip -r "${zipPath}" .`);
    } catch {
      // Si zip no está disponible, crear tar.gz
      await execAsync(`cd "${tempDir}" && tar -czf "${zipPath}.tar.gz" .`);
      return `${zipPath}.tar.gz`;
    }

    return zipPath;
  }

  private async createSourceCodeZip(jobId: string, projectPath: string, projectName: string): Promise<string> {
    const zipPath = join(this.outputDir, `${jobId}-source.zip`);
    const safeName = projectName.replace(/[^a-zA-Z0-9-_]/g, "_");

    try {
      // Excluir node_modules, .git, dist, build
      await execAsync(
        `cd "${projectPath}/.." && zip -r "${zipPath}" "${safeName}" -x "*/node_modules/*" -x "*/.git/*" -x "*/dist/*" -x "*/build/*" -x "*/.next/*"`
      );
    } catch {
      // Fallback: rsync + tar
      const tempDir = `/tmp/source-${jobId}`;
      mkdirSync(tempDir, { recursive: true });
      try {
        await execAsync(`rsync -av --exclude=node_modules --exclude=.git --exclude=dist --exclude=build --exclude=.next "${projectPath}/" "${tempDir}/"`);
        await execAsync(`cd "${tempDir}" && tar -czf "${zipPath}.tar.gz" .`);
        rmSync(tempDir, { recursive: true, force: true });
        return `${zipPath}.tar.gz`;
      } catch (err) {
        throw new Error(`No se pudo crear ZIP de código fuente: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return zipPath;
  }

  private async calculateTotalSize(job: BuildJob): Promise<number> {
    let total = 0;
    for (const result of job.results) {
      if (result.fileSize) total += result.fileSize;
    }
    return total;
  }

  // ===== HELPERS PÚBLICOS =====

  getJob(jobId: string): BuildJob | undefined {
    return this.jobs.get(jobId);
  }

  listJobs(): BuildJob[] {
    return Array.from(this.jobs.values());
  }

  // Verificar qué toolchains están disponibles en el sistema
  async checkToolchains(): Promise<{
    android: boolean;
    ios: boolean;
    electron: boolean;
    web: boolean;
    details: Record<string, string>;
  }> {
    const check = async (cmd: string): Promise<boolean> => {
      try {
        await execAsync(`which ${cmd} 2>/dev/null`);
        return true;
      } catch {
        return false;
      }
    };

    const [java, gradle, adb, xcode, electron, npm, node] = await Promise.all([
      check("java"),
      check("gradle"),
      check("adb"),
      check("xcodebuild"),
      check("electron"),
      check("npm"),
      check("node"),
    ]);

    return {
      android: java && gradle,
      ios: xcode,
      electron: electron || npm, // electron-builder via npx
      web: node && npm,
      details: {
        java: java ? "OK" : "No encontrado",
        gradle: gradle ? "OK" : "No encontrado",
        adb: adb ? "OK" : "No encontrado (Android SDK)",
        xcode: xcode ? "OK" : "No encontrado (solo macOS)",
        electron: electron ? "OK" : "Vía npx electron-builder",
        npm: npm ? "OK" : "No encontrado",
        node: node ? "OK" : "No encontrado",
      },
    };
  }
}

// ===== CÓDIGO POR DEFECTO =====

function defaultRNCode(projectName: string): string {
  return `import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>${projectName}</Text>
        <Text style={styles.subtitle}>Generado por Agente IA</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#6C5CE7' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: 'white', marginBottom: 8 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
});
`;
}

function defaultElectronCode(projectName: string): string {
  return `import React from 'react';

export default function App() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #6C5CE7 0%, #E94560 100%)',
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      <h1 style={{ fontSize: '3rem', margin: 0 }}>${projectName}</h1>
      <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>Generado por Agente IA</p>
    </div>
  );
}
`;
}

function electronMainCode(projectName: string): string {
  return `import { app, BrowserWindow } from 'electron';
import path from 'path';

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    title: ${JSON.stringify(projectName)},
  });

  win.loadFile(path.join(__dirname, '../dist/index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
`;
}

function defaultWebCode(projectName: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${projectName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #6C5CE7 0%, #E94560 100%);
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  .container { text-align: center; }
  h1 { font-size: 3rem; margin-bottom: 0.5rem; }
  p { font-size: 1.2rem; opacity: 0.9; }
</style>
</head>
<body>
  <div class="container">
    <h1>${projectName}</h1>
    <p>Generado por Agente IA</p>
  </div>
</body>
</html>`;
}

// Singleton
let buildServiceInstance: BuildService | null = null;
export function getBuildService(): BuildService {
  if (!buildServiceInstance) {
    buildServiceInstance = new BuildService();
  }
  return buildServiceInstance;
}
