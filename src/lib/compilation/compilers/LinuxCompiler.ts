// ==================== LINUX COMPILER ====================
// Compilador real para Linux: genera un paquete tar.gz ejecutable con Python.

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { BaseCompiler } from "./BaseCompiler";
import type { Build, BuildArtifact, BuildLogEntry, Platform } from "../types";

export class LinuxCompiler extends BaseCompiler {
  constructor() {
    super("linux");
  }

  async compile(
    build: Build,
    projectPath: string
  ): Promise<{ success: boolean; artifact?: BuildArtifact; logs: BuildLogEntry[]; error?: string }> {
    const logs: BuildLogEntry[] = [];
    logs.push(this.log(`Iniciando compilación Linux para ${build.projectName}`));

    const linuxDir = path.join(projectPath, "linux");
    if (!fs.existsSync(linuxDir)) {
      return { success: false, logs, error: "No se encontró el directorio linux/ del proyecto" };
    }

    try {
      // Validar que python3 existe
      logs.push(this.log("Validando toolchain..."));
      execSync("python3 --version", { stdio: "pipe" });

      // Crear directorio de salida
      const distDir = path.join(projectPath, "dist");
      fs.mkdirSync(distDir, { recursive: true });

      const appSlug = build.projectName.toLowerCase().replace(/\s+/g, "-");
      const version = build.config.project.version;
      const outputName = `${appSlug}-${version}-linux.tar.gz`;
      const outputPath = path.join(distDir, outputName);

      // Empaquetar main.py, README.md y otros archivos de linux/
      logs.push(this.log("Empaquetando archivos..."));
      const filesToPack = fs.readdirSync(linuxDir)
        .filter((f) => !f.startsWith("."))
        .map((f) => path.join(linuxDir, f));

      if (filesToPack.length === 0) {
        return { success: false, logs, error: "No hay archivos para empaquetar en linux/" };
      }

      const tarCmd = `tar -czf "${outputPath}" -C "${linuxDir}" ${filesToPack
        .map((f) => `"${path.basename(f)}"`)
        .join(" ")}`;
      execSync(tarCmd, { stdio: "pipe" });

      logs.push(this.log(`Paquete generado: ${outputPath}`));

      const artifact = this.createArtifact(build, "linux", "tar.gz", outputPath);
      logs.push(this.log("Compilación Linux completada con éxito"));

      return { success: true, artifact, logs };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logs.push(this.log(`Error en compilación Linux: ${message}`, "error"));
      return { success: false, logs, error: message };
    }
  }
}
