/**
 * Electron Executor
 * Ejecutor especializado para generar y compilar aplicaciones de escritorio
 * Soporta: Windows (.exe), macOS (.dmg, .app), Linux (.AppImage, .deb)
 */

import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

const execAsync = promisify(exec);

export interface ElectronProjectConfig {
  projectName: string;
  appName: string;
  version?: string;
  description?: string;
  targetPlatforms: ("windows" | "macos" | "linux")[];
  mainCode: string; // main.ts o main.js
  rendererCode: string; // App.tsx o App.js
  preloadCode?: string; // preload.ts (opcional)
}

export interface DesktopBuildConfig {
  platform: "windows" | "macos" | "linux";
  architecture: "x64" | "arm64" | "universal";
  outputFormat?: "exe" | "dmg" | "app" | "appimage" | "deb";
}

export interface BuildResult {
  success: boolean;
  platform: string;
  architecture: string;
  outputPath?: string;
  outputFile?: string;
  fileSize?: number;
  error?: string;
  logs?: string;
}

/**
 * Ejecutor de Electron
 */
export class ElectronExecutor {
  private projectsDir = "/tmp/electron-projects";
  private buildsDir = "/tmp/electron-builds";

  constructor() {
    this.ensureDirectories();
  }

  /**
   * Asegurar que los directorios existen
   */
  private ensureDirectories(): void {
    try {
      if (!existsSync(this.projectsDir)) {
        mkdirSync(this.projectsDir, { recursive: true });
      }
      if (!existsSync(this.buildsDir)) {
        mkdirSync(this.buildsDir, { recursive: true });
      }
    } catch (error) {
      console.error("[ElectronExecutor] Error creando directorios:", error);
    }
  }

  /**
   * Crear proyecto Electron
   */
  async createProject(config: ElectronProjectConfig): Promise<{ success: boolean; projectPath?: string; error?: string }> {
    const projectId = uuidv4();
    const projectPath = join(this.projectsDir, projectId);

    try {
      mkdirSync(projectPath, { recursive: true });

      // Crear estructura de proyecto
      const packageJsonPath = join(projectPath, "package.json");
      const packageJson = {
        name: config.projectName,
        version: config.version || "1.0.0",
        description: config.description || "Aplicación Electron",
        main: "dist/main.js",
        homepage: "./",
        scripts: {
          "start": "electron .",
          "dev": "concurrently \"npm run watch\" \"wait-on http://localhost:3000 && electron .\"",
          "watch": "tsc -w",
          "build": "npm run build:ts && electron-builder",
          "build:ts": "tsc",
          "build:windows": "npm run build:ts && electron-builder --win",
          "build:macos": "npm run build:ts && electron-builder --mac",
          "build:linux": "npm run build:ts && electron-builder --linux",
          "build:all": "npm run build:ts && electron-builder -mwl",
        },
        dependencies: {
          "react": "^18.2.0",
          "react-dom": "^18.2.0",
          "electron-squirrel-startup": "^1.1.0",
        },
        devDependencies: {
          "electron": "^latest",
          "electron-builder": "^24.0.0",
          "typescript": "^5.0.0",
          "@types/node": "^20.0.0",
          "@types/react": "^18.0.0",
          "@types/react-dom": "^18.0.0",
          "concurrently": "^8.0.0",
          "wait-on": "^7.0.0",
        },
      };

      writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), "utf-8");

      // Crear estructura de directorios
      mkdirSync(join(projectPath, "src"), { recursive: true });
      mkdirSync(join(projectPath, "public"), { recursive: true });

      // Crear main.ts
      const mainPath = join(projectPath, "src", "main.ts");
      writeFileSync(mainPath, config.mainCode, "utf-8");

      // Crear App.tsx
      const appPath = join(projectPath, "src", "App.tsx");
      writeFileSync(appPath, config.rendererCode, "utf-8");

      // Crear preload.ts si se proporciona
      if (config.preloadCode) {
        const preloadPath = join(projectPath, "src", "preload.ts");
        writeFileSync(preloadPath, config.preloadCode, "utf-8");
      }

      // Crear tsconfig.json
      const tsconfigPath = join(projectPath, "tsconfig.json");
      const tsconfig = {
        compilerOptions: {
          target: "ES2020",
          module: "commonjs",
          lib: ["ES2020"],
          outDir: "./dist",
          rootDir: "./src",
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          jsx: "react-jsx",
        },
        include: ["src/**/*"],
        exclude: ["node_modules"],
      };
      writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2), "utf-8");

      // Crear electron-builder.yml
      const builderConfigPath = join(projectPath, "electron-builder.yml");
      const builderConfig = `appId: com.${config.projectName.toLowerCase()}.app
productName: ${config.appName}
directories:
  buildResources: public
files:
  - dist/**/*
  - node_modules/**/*
  - package.json
win:
  target:
    - nsis
    - portable
    - msi
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
mac:
  target:
    - dmg
    - zip
  category: public.app-category.utilities
linux:
  target:
    - AppImage
    - deb
  category: Utility
`;
      writeFileSync(builderConfigPath, builderConfig, "utf-8");

      console.log(`[ElectronExecutor] Proyecto creado: ${projectPath}`);

      return {
        success: true,
        projectPath,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[ElectronExecutor] Error creando proyecto:", message);

      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Compilar para Windows
   */
  async buildWindows(projectPath: string, architecture: "x64" | "arm64" = "x64"): Promise<BuildResult> {
    try {
      const buildId = uuidv4();
      const outputDir = join(this.buildsDir, buildId);
      mkdirSync(outputDir, { recursive: true });

      console.log(`[ElectronExecutor] Compilando Windows (${architecture})...`);

      // Instalar dependencias
      await execAsync(`cd "${projectPath}" && npm install`, { timeout: 300000 });

      // Compilar TypeScript
      await execAsync(`cd "${projectPath}" && npm run build:ts`, { timeout: 120000 });

      // Compilar con Electron Builder
      const command = `cd "${projectPath}" && electron-builder --win --${architecture}`;
      const { stdout, stderr } = await execAsync(command, { timeout: 600000 });

      // Buscar ejecutable generado
      const fs = require("fs");
      const distPath = join(projectPath, "dist");

      if (fs.existsSync(distPath)) {
        const files = fs.readdirSync(distPath);
        const exeFile = files.find((f: string) => f.endsWith(".exe"));

        if (exeFile) {
          const outputPath = join(outputDir, exeFile);
          fs.copyFileSync(join(distPath, exeFile), outputPath);
          const stats = fs.statSync(outputPath);

          return {
            success: true,
            platform: "windows",
            architecture,
            outputPath,
            outputFile: exeFile,
            fileSize: stats.size,
            logs: stdout,
          };
        }
      }

      throw new Error("Ejecutable de Windows no fue generado");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[ElectronExecutor] Error compilando Windows:", message);

      return {
        success: false,
        platform: "windows",
        architecture,
        error: message,
      };
    }
  }

  /**
   * Compilar para macOS
   */
  async buildMacOS(projectPath: string, architecture: "x64" | "arm64" | "universal" = "universal"): Promise<BuildResult> {
    try {
      const buildId = uuidv4();
      const outputDir = join(this.buildsDir, buildId);
      mkdirSync(outputDir, { recursive: true });

      console.log(`[ElectronExecutor] Compilando macOS (${architecture})...`);

      // Instalar dependencias
      await execAsync(`cd "${projectPath}" && npm install`, { timeout: 300000 });

      // Compilar TypeScript
      await execAsync(`cd "${projectPath}" && npm run build:ts`, { timeout: 120000 });

      // Compilar con Electron Builder
      const command = `cd "${projectPath}" && electron-builder --mac --${architecture}`;
      const { stdout, stderr } = await execAsync(command, { timeout: 600000 });

      // Buscar DMG generado
      const fs = require("fs");
      const distPath = join(projectPath, "dist");

      if (fs.existsSync(distPath)) {
        const files = fs.readdirSync(distPath);
        const dmgFile = files.find((f: string) => f.endsWith(".dmg"));

        if (dmgFile) {
          const outputPath = join(outputDir, dmgFile);
          fs.copyFileSync(join(distPath, dmgFile), outputPath);
          const stats = fs.statSync(outputPath);

          return {
            success: true,
            platform: "macos",
            architecture,
            outputPath,
            outputFile: dmgFile,
            fileSize: stats.size,
            logs: stdout,
          };
        }
      }

      throw new Error("DMG de macOS no fue generado");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[ElectronExecutor] Error compilando macOS:", message);

      return {
        success: false,
        platform: "macos",
        architecture,
        error: message,
      };
    }
  }

  /**
   * Compilar para Linux
   */
  async buildLinux(projectPath: string, architecture: "x64" | "arm64" = "x64"): Promise<BuildResult> {
    try {
      const buildId = uuidv4();
      const outputDir = join(this.buildsDir, buildId);
      mkdirSync(outputDir, { recursive: true });

      console.log(`[ElectronExecutor] Compilando Linux (${architecture})...`);

      // Instalar dependencias
      await execAsync(`cd "${projectPath}" && npm install`, { timeout: 300000 });

      // Compilar TypeScript
      await execAsync(`cd "${projectPath}" && npm run build:ts`, { timeout: 120000 });

      // Compilar con Electron Builder
      const command = `cd "${projectPath}" && electron-builder --linux --${architecture}`;
      const { stdout, stderr } = await execAsync(command, { timeout: 600000 });

      // Buscar AppImage generado
      const fs = require("fs");
      const distPath = join(projectPath, "dist");

      if (fs.existsSync(distPath)) {
        const files = fs.readdirSync(distPath);
        const appImageFile = files.find((f: string) => f.endsWith(".AppImage"));

        if (appImageFile) {
          const outputPath = join(outputDir, appImageFile);
          fs.copyFileSync(join(distPath, appImageFile), outputPath);
          const stats = fs.statSync(outputPath);

          return {
            success: true,
            platform: "linux",
            architecture,
            outputPath,
            outputFile: appImageFile,
            fileSize: stats.size,
            logs: stdout,
          };
        }
      }

      throw new Error("AppImage de Linux no fue generado");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[ElectronExecutor] Error compilando Linux:", message);

      return {
        success: false,
        platform: "linux",
        architecture,
        error: message,
      };
    }
  }

  /**
   * Generar reporte de compilación
   */
  generateBuildReport(results: BuildResult[]): string {
    let report = `# Reporte de Compilación Electron

`;
    report += `**Fecha**: ${new Date().toISOString()}
`;
    report += `**Total de compilaciones**: ${results.length}
`;
    report += `**Exitosas**: ${results.filter((r) => r.success).length}
`;
    report += `**Fallidas**: ${results.filter((r) => !r.success).length}

`;

    report += `## Resultados Detallados

`;
    for (const result of results) {
      report += `### ${result.platform.toUpperCase()} (${result.architecture})
`;
      report += `**Estado**: ${result.success ? "✅ Exitosa" : "❌ Fallida"}
`;

      if (result.success) {
        report += `**Archivo**: ${result.outputFile}
`;
        report += `**Tamaño**: ${(result.fileSize! / 1024 / 1024).toFixed(2)} MB
`;
      } else {
        report += `**Error**: ${result.error}
`;
      }
      report += `
`;
    }

    return report;
  }
}

/**
 * Instancia global del ejecutor
 */
let electronExecutorInstance: ElectronExecutor | null = null;

export function getElectronExecutor(): ElectronExecutor {
  if (!electronExecutorInstance) {
    electronExecutorInstance = new ElectronExecutor();
  }
  return electronExecutorInstance;
}
