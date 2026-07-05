// ==================== COMPILADORES SIMULADOS ====================
// Para plataformas que requieren toolchains nativas no disponibles en el entorno.
// Generan un archivo dummy/estructura que representa el artefacto final.

import * as fs from "fs";
import * as path from "path";
import { BaseCompiler } from "./BaseCompiler";
import type { Build, BuildArtifact, BuildLogEntry, Platform } from "../types";

export class SimulatedCompiler extends BaseCompiler {
  constructor(platform: Platform) {
    super(platform);
  }

  async compile(
    build: Build,
    projectPath: string
  ): Promise<{ success: boolean; artifact?: BuildArtifact; logs: BuildLogEntry[]; error?: string }> {
    const logs: BuildLogEntry[] = [];
    logs.push(this.log(`Iniciando compilación ${this.platform} para ${build.projectName}`));

    const platformDir = path.join(projectPath, this.platform);
    if (!fs.existsSync(platformDir)) {
      return { success: false, logs, error: `No se encontró el directorio ${this.platform}/ del proyecto` };
    }

    try {
      const distDir = path.join(projectPath, "dist");
      fs.mkdirSync(distDir, { recursive: true });

      const appSlug = build.projectName.toLowerCase().replace(/\s+/g, "-");
      const version = build.config.project.version;
      const format = this.getOutputFormat();
      const outputName = `${appSlug}-${version}-${this.platform}.${format}`;
      const outputPath = path.join(distDir, outputName);

      // Crear un archivo representativo (dummy) con metadatos
      const metadata = {
        project: build.projectName,
        version,
        platform: this.platform,
        format,
        note: "Artefacto simulado. En un entorno con toolchain nativa se generaría el binario real.",
        generatedAt: new Date().toISOString(),
      };

      fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2));

      logs.push(this.log(`Artefacto simulado generado: ${outputPath}`));
      logs.push(this.log(`Nota: se requiere toolchain nativa de ${this.platform} para binario real`, "warn"));

      const artifact = this.createArtifact(build, this.platform, format, outputPath);
      logs.push(this.log(`Compilación ${this.platform} completada`));

      return { success: true, artifact, logs };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logs.push(this.log(`Error en compilación ${this.platform}: ${message}`, "error"));
      return { success: false, logs, error: message };
    }
  }

  private getOutputFormat(): string {
    const formats: Record<Platform, string> = {
      android: "apk",
      "android-tv": "apk",
      windows: "exe",
      linux: "tar.gz",
      macos: "app",
    };
    return formats[this.platform];
  }
}
