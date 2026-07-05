// ==================== BUILD MANAGER ====================
// Orquesta el análisis, generación, compilación y empaquetado.

import * as fs from "fs";
import * as path from "path";
import { extractRequirements } from "./analyzer";
import { getRecommendations } from "./recommender";
import { generateProject } from "./generator";
import { LinuxCompiler } from "./compilers/LinuxCompiler";
import { SimulatedCompiler } from "./compilers/SimulatedCompiler";
import type {
  Build,
  BuildArtifact,
  BuildConfig,
  BuildLogEntry,
  BuildStatus,
  CompileRequest,
  Platform,
} from "./types";

const BUILDS_DIR = path.join(process.cwd(), "uploads", "builds");

export class BuildManager {
  private builds = new Map<string, Build>();
  readonly buildsDir = BUILDS_DIR;

  constructor() {
    fs.mkdirSync(BUILDS_DIR, { recursive: true });
  }

  analyze(objective: string) {
    const requirements = extractRequirements(objective);
    const recommendations = getRecommendations(requirements);
    return { requirements, recommendations };
  }

  async createBuild(request: CompileRequest): Promise<Build> {
    const id = `build-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const requirements = request.requirements;
    const recommendations = getRecommendations(requirements);

    const config: BuildConfig = {
      project: {
        name: request.projectName,
        version: request.config?.project?.version || "1.0.0",
        description: request.config?.project?.description || `Aplicación ${request.projectName}`,
        author: request.config?.project?.author || "Agente IA",
        license: request.config?.project?.license || "MIT",
      },
      platforms: {},
      features: requirements.features,
      optimization: {
        minify: request.config?.optimization?.minify ?? true,
        stripSymbols: request.config?.optimization?.stripSymbols ?? true,
        compression: request.config?.optimization?.compression || "medium",
      },
    };

    request.platforms.forEach((platform) => {
      const rec = recommendations.find((r) => r.platform === platform);
      config.platforms[platform] = {
        enabled: true,
        outputFormat: this.inferOutputFormat(platform),
        architecture: this.inferArchitecture(platform),
        ...(platform === "android" || platform === "android-tv"
          ? { minSdk: platform === "android" ? 26 : 21, targetSdk: platform === "android" ? 34 : 33 }
          : {}),
        ...(platform === "macos" ? { minimumVersion: "10.15" } : {}),
      };
    });

    const build: Build = {
      id,
      projectName: request.projectName,
      requirements,
      platforms: request.platforms,
      config,
      status: "queued",
      progress: 0,
      logs: [this.log("Build creado y encolado")],
      artifacts: [],
      estimatedTime: request.platforms.length * 120,
    };

    this.builds.set(id, build);
    return build;
  }

  async runBuild(id: string): Promise<Build> {
    const build = this.builds.get(id);
    if (!build) throw new Error(`Build no encontrado: ${id}`);

    build.status = "compiling";
    build.startedAt = new Date();
    build.logs.push(this.log("Iniciando generación de proyecto"));

    const projectPath = path.join(BUILDS_DIR, id);
    fs.mkdirSync(projectPath, { recursive: true });

    // Generar proyecto
    const project = generateProject(build.config);
    project.files.forEach((file) => {
      const filePath = path.join(projectPath, file.path);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, file.content);
    });
    build.logs.push(this.log(`Proyecto generado: ${project.files.length} archivos`));

    // Compilar cada plataforma
    const totalPlatforms = build.platforms.length;
    for (let i = 0; i < totalPlatforms; i++) {
      const platform = build.platforms[i];
      build.logs.push(this.log(`Compilando plataforma ${i + 1}/${totalPlatforms}: ${platform}`));

      const compiler = this.getCompiler(platform);
      const result = await compiler.compile(build, projectPath);
      build.logs.push(...result.logs);

      if (result.success && result.artifact) {
        build.artifacts.push(result.artifact);
      } else {
        build.logs.push(this.log(`Falló la compilación para ${platform}: ${result.error || "Error desconocido"}`, "error"));
      }

      build.progress = Math.round(((i + 1) / totalPlatforms) * 100);
    }

    build.status = build.artifacts.length > 0 ? "completed" : "failed";
    if (build.status === "failed") {
      build.error = "Ninguna plataforma pudo compilarse correctamente";
    }
    build.completedAt = new Date();
    build.logs.push(this.log(`Build finalizado con estado: ${build.status}`));

    return build;
  }

  getBuild(id: string): Build | undefined {
    return this.builds.get(id);
  }

  listBuilds(): Build[] {
    return Array.from(this.builds.values()).sort(
      (a, b) => (b.startedAt?.getTime() || 0) - (a.startedAt?.getTime() || 0)
    );
  }

  getArtifactPath(buildId: string, fileName: string): string | undefined {
    const build = this.builds.get(buildId);
    const artifact = build?.artifacts.find((a) => a.filePath.endsWith(fileName));
    return artifact?.filePath;
  }

  private getCompiler(platform: Platform) {
    if (platform === "linux") return new LinuxCompiler();
    return new SimulatedCompiler(platform);
  }

  private inferOutputFormat(platform: Platform): string {
    const map: Record<Platform, string> = {
      android: "apk",
      "android-tv": "apk",
      windows: "exe",
      linux: "tar.gz",
      macos: "app",
    };
    return map[platform];
  }

  private inferArchitecture(platform: Platform): string {
    const map: Record<Platform, string> = {
      android: "arm64-v8a,armeabi-v7a",
      "android-tv": "arm64-v8a",
      windows: "x64",
      linux: "x86_64",
      macos: "universal",
    };
    return map[platform];
  }

  private log(message: string, level: BuildLogEntry["level"] = "info", platform?: Platform): BuildLogEntry {
    return {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date(),
      level,
      message,
      platform,
    };
  }
}

export const buildManager = new BuildManager();
