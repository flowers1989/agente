// ==================== COMPILADOR BASE ====================

import fs from "fs";
import crypto from "crypto";
import type { Build, BuildArtifact, BuildConfig, BuildLogEntry, Platform } from "../types";

export abstract class BaseCompiler {
  protected platform: Platform;

  constructor(platform: Platform) {
    this.platform = platform;
  }

  abstract compile(build: Build, projectPath: string): Promise<{ success: boolean; artifactPath?: string; logs: BuildLogEntry[]; error?: string }>;

  protected log(message: string, level: BuildLogEntry["level"] = "info"): BuildLogEntry {
    return {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date(),
      level,
      message,
      platform: this.platform,
    };
  }

  protected generateChecksum(filePath: string): string {
    // Simulación de checksum; en producción usar crypto
    const hash = crypto.createHash("sha256");
    hash.update(fs.readFileSync(filePath));
    return hash.digest("hex");
  }

  protected getFileSize(filePath: string): number {
    return fs.statSync(filePath).size;
  }

  protected createArtifact(
    build: Build,
    platform: Platform,
    format: string,
    filePath: string
  ): BuildArtifact {
    const platformConfig = build.config.platforms[platform];
    const fileName = filePath.split("/").pop() || `artifact.${format}`;
    return {
      id: `artifact-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      buildId: build.id,
      projectName: build.projectName,
      version: build.config.project.version,
      platform,
      format: format as BuildArtifact["format"],
      fileSize: this.getFileSize(filePath),
      checksum: this.generateChecksum(filePath),
      filePath,
      uploadedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      downloadUrl: `/api/compile/download/${build.id}/${fileName}`,
      installationInstructions: generateInstallationInstructions(platform, format),
    };
  }
}

function generateInstallationInstructions(platform: string, format: string): string {
  const instructions: Record<string, string> = {
    "android-apk": `1. Habilita "Orígenes desconocidos" en Configuración > Seguridad
2. Descarga el archivo APK
3. Abre el archivo y toca "Instalar"`,
    "android-aab": `1. Sube el AAB a Google Play Console
2. Configura la firma
3. Publica en Play Store`,
    "windows-exe": `1. Descarga el archivo EXE
2. Haz doble clic en el archivo
3. Sigue las instrucciones del instalador`,
    "windows-msi": `1. Descarga el archivo MSI
2. Haz doble clic para instalar
3. Sigue el asistente`,
    "linux-tar.gz": `1. Descarga el tar.gz
2. Extrae: tar -xzf archivo.tar.gz
3. Ejecuta: ./main.py`,
    "linux-deb": `1. Descarga el archivo DEB
2. Abre una terminal en la carpeta de descargas
3. Ejecuta: sudo dpkg -i archivo.deb`,
    "linux-appimage": `1. Descarga el AppImage
2. Dale permisos: chmod +x archivo.AppImage
3. Ejecuta: ./archivo.AppImage`,
    "macos-dmg": `1. Descarga el archivo DMG
2. Haz doble clic para abrir
3. Arrastra la aplicación a la carpeta Aplicaciones`,
    "macos-app": `1. Descarga el archivo APP
2. Arrástralo a Aplicaciones
3. Abre desde Launchpad`,
  };
  return instructions[`${platform}-${format}`] || `1. Descarga el archivo\n2. Sigue las instrucciones específicas para ${platform}.`;
}
