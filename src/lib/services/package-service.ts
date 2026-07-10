/**
 * Package Service
 * Servicio de empaquetado ZIP que incluye código fuente y compilados
 */

import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, mkdirSync, existsSync, copyFileSync, readdirSync } from "fs";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

const execAsync = promisify(exec);

export interface PackageConfig {
  projectId: string;
  projectName: string;
  projectPath: string;
  includeNodeModules?: boolean;
  includeGit?: boolean;
  excludePatterns?: string[];
  metadata?: {
    version?: string;
    author?: string;
    description?: string;
    buildDate?: string;
    platforms?: string[];
  };
}

export interface PackageResult {
  success: boolean;
  zipPath?: string;
  fileName?: string;
  fileSize?: number;
  checksumMD5?: string;
  error?: string;
  includedFiles?: number;
  excludedFiles?: number;
}

/**
 * Servicio de empaquetado
 */
export class PackageService {
  private packagesDir = "/tmp/packages";
  private tempDir = "/tmp/package-temp";

  constructor() {
    this.ensureDirectories();
  }

  /**
   * Asegurar que los directorios existen
   */
  private ensureDirectories(): void {
    try {
      if (!existsSync(this.packagesDir)) {
        mkdirSync(this.packagesDir, { recursive: true });
      }
      if (!existsSync(this.tempDir)) {
        mkdirSync(this.tempDir, { recursive: true });
      }
    } catch (error) {
      console.error("[PackageService] Error creando directorios:", error);
    }
  }

  /**
   * Crear paquete ZIP del proyecto
   */
  async createPackage(config: PackageConfig): Promise<PackageResult> {
    const packageId = uuidv4();
    const tempProjectDir = join(this.tempDir, packageId);

    try {
      // Crear directorio temporal
      mkdirSync(tempProjectDir, { recursive: true });

      // Copiar archivos del proyecto
      await this.copyProjectFiles(config.projectPath, tempProjectDir, config);

      // Crear archivo README
      this.createReadmeFile(tempProjectDir, config);

      // Crear archivo de metadatos
      if (config.metadata) {
        this.createMetadataFile(tempProjectDir, config.metadata);
      }

      // Crear archivo ZIP
      const zipPath = join(this.packagesDir, `${config.projectName}-${packageId}.zip`);
      const { includedFiles, excludedFiles } = await this.createZipFile(tempProjectDir, zipPath, config);

      // Calcular checksum MD5
      const checksumMD5 = await this.calculateMD5(zipPath);

      // Obtener tamaño del archivo
      const fs = require("fs");
      const stats = fs.statSync(zipPath);

      console.log(`[PackageService] Paquete creado: ${zipPath}`);

      return {
        success: true,
        zipPath,
        fileName: `${config.projectName}-${packageId}.zip`,
        fileSize: stats.size,
        checksumMD5,
        includedFiles,
        excludedFiles,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[PackageService] Error creando paquete:", message);

      return {
        success: false,
        error: message,
      };
    } finally {
      // Limpiar directorio temporal
      await this.cleanupTempDir(tempProjectDir);
    }
  }

  /**
   * Copiar archivos del proyecto al directorio temporal
   */
  private async copyProjectFiles(
    sourcePath: string,
    destPath: string,
    config: PackageConfig
  ): Promise<void> {
    const excludePatterns = config.excludePatterns || [];

    // Patrones de exclusión por defecto
    const defaultExcludes = [
      "node_modules",
      ".git",
      ".gitignore",
      ".env",
      ".env.local",
      "dist",
      "build",
      ".next",
      "coverage",
      ".DS_Store",
      "*.log",
    ];

    // Combinar patrones
    const allExcludes = [...defaultExcludes, ...excludePatterns];

    // Si no incluir node_modules, añadirlo a exclusiones
    if (!config.includeNodeModules && !allExcludes.includes("node_modules")) {
      allExcludes.push("node_modules");
    }

    // Si no incluir .git, añadirlo a exclusiones
    if (!config.includeGit && !allExcludes.includes(".git")) {
      allExcludes.push(".git");
    }

    // Construir comando rsync
    const excludeFlags = allExcludes.map((pattern) => `--exclude='${pattern}'`).join(" ");
    const command = `rsync -av ${excludeFlags} "${sourcePath}/" "${destPath}/"`;

    try {
      await execAsync(command);
      console.log(`[PackageService] Archivos copiados a ${destPath}`);
    } catch (error) {
      // rsync puede retornar código de salida no-cero en algunos casos, pero aún así copia archivos
      console.warn("[PackageService] Warning en rsync:", error);
    }
  }

  /**
   * Crear archivo README
   */
  private createReadmeFile(destPath: string, config: PackageConfig): void {
    const readmeContent = `# ${config.projectName}

${config.metadata?.description || "Proyecto generado automáticamente"}

## Información

- **Versión**: ${config.metadata?.version || "1.0.0"}
- **Autor**: ${config.metadata?.author || "Agente de Desarrollo"}
- **Fecha de Compilación**: ${config.metadata?.buildDate || new Date().toISOString()}
- **Plataformas**: ${config.metadata?.platforms?.join(", ") || "Múltiples"}

## Instalación

1. Descomprime este archivo ZIP
2. Navega al directorio del proyecto
3. Instala las dependencias: \`npm install\`
4. Sigue las instrucciones específicas de cada plataforma

## Estructura del Proyecto

\`\`\`
${config.projectName}/
├── src/              # Código fuente
├── dist/             # Archivos compilados
├── package.json      # Configuración del proyecto
├── README.md         # Este archivo
└── METADATA.json     # Metadatos del proyecto
\`\`\`

## Compilación

Para compilar para diferentes plataformas:

\`\`\`bash
# Android
npm run build:android

# iOS
npm run build:ios

# Windows
npm run build:windows

# macOS
npm run build:macos

# Linux
npm run build:linux
\`\`\`

## Soporte

Para más información, consulta la documentación del proyecto.
`;

    const readmePath = join(destPath, "README.md");
    writeFileSync(readmePath, readmeContent, "utf-8");
  }

  /**
   * Crear archivo de metadatos
   */
  private createMetadataFile(destPath: string, metadata: PackageConfig["metadata"]): void {
    const metadataPath = join(destPath, "METADATA.json");
    writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), "utf-8");
  }

  /**
   * Crear archivo ZIP
   */
  private async createZipFile(
    sourcePath: string,
    zipPath: string,
    config: PackageConfig
  ): Promise<{ includedFiles: number; excludedFiles: number }> {
    try {
      // Contar archivos antes de comprimir
      const { stdout: countOutput } = await execAsync(`find "${sourcePath}" -type f | wc -l`);
      const includedFiles = parseInt(countOutput.trim());

      // Crear ZIP
      const command = `cd "${sourcePath}" && zip -r -q "${zipPath}" .`;
      await execAsync(command, { timeout: 300000 });

      console.log(`[PackageService] ZIP creado: ${zipPath}`);

      return {
        includedFiles,
        excludedFiles: 0, // Simplificado
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[PackageService] Error creando ZIP:", message);
      throw error;
    }
  }

  /**
   * Calcular checksum MD5
   */
  private async calculateMD5(filePath: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`md5sum "${filePath}"`);
      return stdout.split(" ")[0];
    } catch (error) {
      console.warn("[PackageService] Error calculando MD5:", error);
      return "N/A";
    }
  }

  /**
   * Limpiar directorio temporal
   */
  private async cleanupTempDir(dirPath: string): Promise<void> {
    try {
      if (existsSync(dirPath)) {
        const { stdout } = await execAsync(`rm -rf "${dirPath}"`);
        console.log(`[PackageService] Directorio temporal eliminado: ${dirPath}`);
      }
    } catch (error) {
      console.warn("[PackageService] Error limpiando directorio temporal:", error);
    }
  }

  /**
   * Generar reporte de empaquetado
   */
  generatePackageReport(result: PackageResult): string {
    let report = `# Reporte de Empaquetado

`;

    if (result.success) {
      report += `**Estado**: ✅ Exitoso

`;
      report += `## Información del Paquete
`;
      report += `- **Nombre**: ${result.fileName}
`;
      report += `- **Tamaño**: ${result.fileSize ? (result.fileSize / 1024 / 1024).toFixed(2) + " MB" : "N/A"}
`;
      report += `- **Archivos Incluidos**: ${result.includedFiles || "N/A"}
`;
      report += `- **Checksum MD5**: ${result.checksumMD5}
`;
      report += `- **Ubicación**: ${result.zipPath}
`;
    } else {
      report += `**Estado**: ❌ Fallido

`;
      report += `**Error**: ${result.error}
`;
    }

    return report;
  }

  /**
   * Verificar integridad de un paquete ZIP
   */
  async verifyPackage(zipPath: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`unzip -t "${zipPath}" > /dev/null 2>&1 && echo "valid"`);
      return stdout.includes("valid");
    } catch (error) {
      console.error("[PackageService] Error verificando paquete:", error);
      return false;
    }
  }

  /**
   * Listar contenido de un paquete ZIP
   */
  async listPackageContents(zipPath: string): Promise<string[]> {
    try {
      const { stdout } = await execAsync(`unzip -l "${zipPath}"`);
      const lines = stdout.split("\n");
      const files = lines
        .slice(3, -2) // Saltar encabezados y pie
        .map((line) => line.trim().split(/\s+/).pop())
        .filter((file) => file && file !== "");

      return files as string[];
    } catch (error) {
      console.error("[PackageService] Error listando contenido:", error);
      return [];
    }
  }
}

/**
 * Instancia global del servicio
 */
let packageServiceInstance: PackageService | null = null;

export function getPackageService(): PackageService {
  if (!packageServiceInstance) {
    packageServiceInstance = new PackageService();
  }
  return packageServiceInstance;
}
