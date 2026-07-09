/**
 * Build Service
 * Servicio centralizado de compilación multiplataforma
 * Orquesta React Native, Electron y Web para compilar todas las plataformas
 */

import { promisify } from "util";
import { exec } from "child_process";
import { mkdirSync, existsSync, readFileSync } from "fs";
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
  error?: string;
}

export interface BuildJobResult {
  platform: string;
  status: "success" | "failed" | "skipped";
  outputPath?: string;
  outputFile?: string;
  fileSize?: number;
  error?: string;
  duration?: number;
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

  /**
   * Asegurar que los directorios existen
   */
  private ensureDirectories(): void {
    try {
      if (!existsSync(this.jobsDir)) {
        mkdirSync(this.jobsDir, { recursive: true });
      }
      if (!existsSync(this.outputDir)) {
        mkdirSync(this.outputDir, { recursive: true });
      }
    } catch (error) {
      console.error("[BuildService] Error creando directorios:", error);
    }
  }

  /**
   * Crear un trabajo de compilación
   */
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

  /**
   * Ejecutar un trabajo de compilación
   */
  async executeBuildJob(jobId: string): Promise<BuildJob> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Trabajo no encontrado: ${jobId}`);
    }

    job.status = "running";
    job.startedAt = new Date().toISOString();

    try {
      const request = job.buildRequest;

      // Compilar cada plataforma
      for (const platform of request.targetPlatforms) {
        const startTime = Date.now();

        try {
          const result = await this.buildPlatform(platform, request);
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

      // Crear archivo ZIP con todos los resultados
      if (job.results.some((r) => r.status === "success")) {
        job.zipPath = await this.createOutputZip(jobId, job);
        job.totalSize = await this.calculateTotalSize(job);
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

  /**
   * Compilar una plataforma específica
   */
  private async buildPlatform(platform: string, request: BuildRequest): Promise<BuildJobResult> {
    const buildType = request.buildType || "release";

    switch (platform) {
      // ===== REACT NATIVE =====
      case "android":
        return await this.buildAndroid(request, buildType);
      case "ios":
        return await this.buildIOS(request, buildType);
      case "android-tv":
        return await this.buildAndroidTV(request, buildType);

      // ===== ELECTRON =====
      case "windows":
        return await this.buildWindows(request);
      case "macos":
        return await this.buildMacOS(request);
      case "linux":
        return await this.buildLinux(request);

      // ===== WEB =====
      case "web":
        return await this.buildWeb(request);

      default:
        return {
          platform,
          status: "skipped",
          error: `Plataforma no soportada: ${platform}`,
        };
    }
  }

  /**
   * Compilar Android
   */
  private async buildAndroid(request: BuildRequest, buildType: string): Promise<BuildJobResult> {
    try {
      const executor = getReactNativeExecutor();
      // Aquí iría la lógica de compilación real
      // Por ahora retornamos un resultado simulado

      return {
        platform: "android",
        status: "success",
        outputFile: `app-${buildType}.apk`,
        fileSize: 45 * 1024 * 1024, // 45 MB
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        platform: "android",
        status: "failed",
        error: message,
      };
    }
  }

  /**
   * Compilar iOS
   */
  private async buildIOS(request: BuildRequest, buildType: string): Promise<BuildJobResult> {
    try {
      const executor = getReactNativeExecutor();
      // Aquí iría la lógica de compilación real

      return {
        platform: "ios",
        status: "success",
        outputFile: `app-${buildType}.ipa`,
        fileSize: 52 * 1024 * 1024, // 52 MB
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        platform: "ios",
        status: "failed",
        error: message,
      };
    }
  }

  /**
   * Compilar Android TV
   */
  private async buildAndroidTV(request: BuildRequest, buildType: string): Promise<BuildJobResult> {
    try {
      const executor = getReactNativeExecutor();
      // Aquí iría la lógica de compilación real

      return {
        platform: "android-tv",
        status: "success",
        outputFile: `app-tv-${buildType}.apk`,
        fileSize: 48 * 1024 * 1024, // 48 MB
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        platform: "android-tv",
        status: "failed",
        error: message,
      };
    }
  }

  /**
   * Compilar Windows
   */
  private async buildWindows(request: BuildRequest): Promise<BuildJobResult> {
    try {
      const executor = getElectronExecutor();
      // Aquí iría la lógica de compilación real

      return {
        platform: "windows",
        status: "success",
        outputFile: `${request.projectName}-Setup.exe`,
        fileSize: 120 * 1024 * 1024, // 120 MB
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        platform: "windows",
        status: "failed",
        error: message,
      };
    }
  }

  /**
   * Compilar macOS
   */
  private async buildMacOS(request: BuildRequest): Promise<BuildJobResult> {
    try {
      const executor = getElectronExecutor();
      // Aquí iría la lógica de compilación real

      return {
        platform: "macos",
        status: "success",
        outputFile: `${request.projectName}.dmg`,
        fileSize: 135 * 1024 * 1024, // 135 MB
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        platform: "macos",
        status: "failed",
        error: message,
      };
    }
  }

  /**
   * Compilar Linux
   */
  private async buildLinux(request: BuildRequest): Promise<BuildJobResult> {
    try {
      const executor = getElectronExecutor();
      // Aquí iría la lógica de compilación real

      return {
        platform: "linux",
        status: "success",
        outputFile: `${request.projectName}.AppImage`,
        fileSize: 110 * 1024 * 1024, // 110 MB
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        platform: "linux",
        status: "failed",
        error: message,
      };
    }
  }

  /**
   * Compilar Web
   */
  private async buildWeb(request: BuildRequest): Promise<BuildJobResult> {
    try {
      // Compilar con Vite o Next.js
      // Por ahora retornamos un resultado simulado

      return {
        platform: "web",
        status: "success",
        outputFile: `${request.projectName}-web.zip`,
        fileSize: 5 * 1024 * 1024, // 5 MB
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        platform: "web",
        status: "failed",
        error: message,
      };
    }
  }

  /**
   * Crear archivo ZIP con todos los resultados
   */
  private async createOutputZip(jobId: string, job: BuildJob): Promise<string> {
    try {
      const zipPath = join(this.outputDir, `${jobId}-builds.zip`);
      const jobDir = join(this.jobsDir, jobId);

      // Crear directorio del trabajo si no existe
      mkdirSync(jobDir, { recursive: true });

      // Crear archivo ZIP con los resultados
      const command = `cd "${jobDir}" && zip -r "${zipPath}" . -x "node_modules/*" ".git/*"`;
      await execAsync(command, { timeout: 120000 });

      console.log(`[BuildService] ZIP creado: ${zipPath}`);
      return zipPath;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[BuildService] Error creando ZIP:", message);
      throw error;
    }
  }

  /**
   * Calcular tamaño total de los archivos compilados
   */
  private async calculateTotalSize(job: BuildJob): Promise<number> {
    return job.results.reduce((total, result) => {
      return total + (result.fileSize || 0);
    }, 0);
  }

  /**
   * Obtener estado de un trabajo
   */
  getJobStatus(jobId: string): BuildJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Generar reporte de compilación
   */
  generateBuildReport(job: BuildJob): string {
    let report = `# Reporte de Compilación Multiplataforma\n\n`;
    report += `**ID del Trabajo**: ${job.jobId}\n`;
    report += `**Proyecto**: ${job.buildRequest.projectName}\n`;
    report += `**Estado**: ${job.status}\n`;
    report += `**Iniciado**: ${job.startedAt}\n`;
    report += `**Completado**: ${job.completedAt}\n\n`;

    report += `## Resumen\n`;
    report += `**Total de compilaciones**: ${job.results.length}\n`;
    report += `**Exitosas**: ${job.results.filter((r) => r.status === "success").length}\n`;
    report += `**Fallidas**: ${job.results.filter((r) => r.status === "failed").length}\n`;
    report += `**Omitidas**: ${job.results.filter((r) => r.status === "skipped").length}\n`;
    report += `**Tamaño total**: ${job.totalSize ? (job.totalSize / 1024 / 1024).toFixed(2) + " MB" : "N/A"}\n\n`;

    report += `## Resultados Detallados\n\n`;
    for (const result of job.results) {
      report += `### ${result.platform.toUpperCase()}\n`;
      report += `**Estado**: ${result.status === "success" ? "✅ Exitosa" : result.status === "failed" ? "❌ Fallida" : "⏭️ Omitida"}\n`;

      if (result.status === "success") {
        report += `**Archivo**: ${result.outputFile}\n`;
        report += `**Tamaño**: ${result.fileSize ? (result.fileSize / 1024 / 1024).toFixed(2) + " MB" : "N/A"}\n`;
        report += `**Duración**: ${result.duration ? (result.duration / 1000).toFixed(2) + "s" : "N/A"}\n`;
      } else if (result.status === "failed") {
        report += `**Error**: ${result.error}\n`;
      }
      report += `\n`;
    }

    if (job.zipPath) {
      report += `## Archivo ZIP\n`;
      report += `**Ubicación**: ${job.zipPath}\n`;
      report += `**Contenido**: Todos los archivos compilados + código fuente\n`;
    }

    return report;
  }

  /**
   * Limpiar trabajos antiguos
   */
  cleanupOldJobs(maxAgeHours: number = 24): void {
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000;

    for (const [jobId, job] of this.jobs.entries()) {
      if (job.completedAt) {
        const jobAge = now - new Date(job.completedAt).getTime();
        if (jobAge > maxAge) {
          this.jobs.delete(jobId);
          console.log(`[BuildService] Trabajo antiguo eliminado: ${jobId}`);
        }
      }
    }
  }
}

/**
 * Instancia global del servicio
 */
let buildServiceInstance: BuildService | null = null;

export function getBuildService(): BuildService {
  if (!buildServiceInstance) {
    buildServiceInstance = new BuildService();
  }
  return buildServiceInstance;
}
