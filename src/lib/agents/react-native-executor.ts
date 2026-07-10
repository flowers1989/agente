/**
 * React Native Executor
 * Ejecutor especializado para generar y compilar aplicaciones móviles
 * Soporta: Android (.apk, .aab), iOS (.ipa), Android TV
 */

import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

const execAsync = promisify(exec);

export interface ReactNativeProjectConfig {
  projectName: string;
  appName: string;
  packageName: string; // com.example.app
  description?: string;
  version?: string;
  targetPlatforms: ("android" | "ios" | "android-tv")[];
  features?: string[];
  code: string; // App.tsx o App.js
}

export interface BuildConfig {
  platform: "android" | "ios" | "android-tv";
  buildType: "debug" | "release";
  outputFormat: "apk" | "aab" | "ipa" | "app";
}

export interface BuildResult {
  success: boolean;
  platform: string;
  buildType: string;
  outputPath?: string;
  outputFile?: string;
  fileSize?: number;
  error?: string;
  logs?: string;
}

/**
 * Ejecutor de React Native
 */
export class ReactNativeExecutor {
  private projectsDir = "/tmp/react-native-projects";
  private buildsDir = "/tmp/react-native-builds";

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
      console.error("[ReactNativeExecutor] Error creando directorios:", error);
    }
  }

  /**
   * Crear proyecto React Native
   */
  async createProject(config: ReactNativeProjectConfig): Promise<{ success: boolean; projectPath?: string; error?: string }> {
    const projectId = uuidv4();
    const projectPath = join(this.projectsDir, projectId);

    try {
      mkdirSync(projectPath, { recursive: true });

      // Crear estructura de proyecto
      const packageJsonPath = join(projectPath, "package.json");
      const packageJson = {
        name: config.projectName,
        version: config.version || "1.0.0",
        description: config.description || "Aplicación React Native",
        main: "index.js",
        scripts: {
          "android": "react-native run-android",
          "ios": "react-native run-ios",
          "build:android": "cd android && ./gradlew assembleRelease",
          "build:android-aab": "cd android && ./gradlew bundleRelease",
          "build:ios": "xcodebuild -workspace ios/App.xcworkspace -scheme App -configuration Release",
        },
        dependencies: {
          "react": "^18.2.0",
          "react-native": "^0.72.0",
          "@react-navigation/native": "^6.1.0",
          "@react-navigation/bottom-tabs": "^6.5.0",
          "react-native-screens": "^3.20.0",
          "react-native-safe-area-context": "^4.5.0",
        },
        devDependencies: {
          "@react-native/metro-config": "^0.72.0",
          "typescript": "^5.0.0",
          "@types/react": "^18.0.0",
          "@types/react-native": "^0.72.0",
        },
      };

      writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), "utf-8");

      // Crear App.tsx
      const appPath = join(projectPath, "App.tsx");
      writeFileSync(appPath, config.code, "utf-8");

      // Crear estructura de directorios
      mkdirSync(join(projectPath, "src"), { recursive: true });
      mkdirSync(join(projectPath, "assets"), { recursive: true });

      // Crear app.json
      const appJsonPath = join(projectPath, "app.json");
      const appJson = {
        name: config.appName,
        displayName: config.appName,
        version: config.version || "1.0.0",
        platforms: config.targetPlatforms,
      };
      writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2), "utf-8");

      console.log(`[ReactNativeExecutor] Proyecto creado: ${projectPath}`);

      return {
        success: true,
        projectPath,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[ReactNativeExecutor] Error creando proyecto:", message);

      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Compilar para Android
   */
  async buildAndroid(
    projectPath: string,
    buildType: "debug" | "release" = "release"
  ): Promise<BuildResult> {
    try {
      const buildId = uuidv4();
      const outputDir = join(this.buildsDir, buildId);
      mkdirSync(outputDir, { recursive: true });

      console.log(`[ReactNativeExecutor] Compilando Android (${buildType})...`);

      // Instalar dependencias
      await execAsync(`cd "${projectPath}" && npm install`, { timeout: 300000 });

      // Compilar
      const command =
        buildType === "release"
          ? `cd "${projectPath}/android" && ./gradlew assembleRelease`
          : `cd "${projectPath}/android" && ./gradlew assembleDebug`;

      const { stdout, stderr } = await execAsync(command, { timeout: 600000 });

      // Buscar APK generado
      const apkPattern =
        buildType === "release"
          ? `${projectPath}/android/app/build/outputs/apk/release/app-release.apk`
          : `${projectPath}/android/app/build/outputs/apk/debug/app-debug.apk`;

      const fs = require("fs");
      if (fs.existsSync(apkPattern)) {
        const outputPath = join(outputDir, `app-${buildType}.apk`);
        fs.copyFileSync(apkPattern, outputPath);
        const stats = fs.statSync(outputPath);

        return {
          success: true,
          platform: "android",
          buildType,
          outputPath,
          outputFile: `app-${buildType}.apk`,
          fileSize: stats.size,
          logs: stdout,
        };
      }

      throw new Error("APK no fue generado");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[ReactNativeExecutor] Error compilando Android:", message);

      return {
        success: false,
        platform: "android",
        buildType,
        error: message,
      };
    }
  }

  /**
   * Compilar para iOS
   */
  async buildIOS(
    projectPath: string,
    buildType: "debug" | "release" = "release"
  ): Promise<BuildResult> {
    try {
      const buildId = uuidv4();
      const outputDir = join(this.buildsDir, buildId);
      mkdirSync(outputDir, { recursive: true });

      console.log(`[ReactNativeExecutor] Compilando iOS (${buildType})...`);

      // Instalar dependencias
      await execAsync(`cd "${projectPath}" && npm install && cd ios && pod install`, { timeout: 300000 });

      // Compilar
      const command = `cd "${projectPath}/ios" && xcodebuild -workspace App.xcworkspace -scheme App -configuration ${buildType === "release" ? "Release" : "Debug"} -derivedDataPath build`;

      const { stdout, stderr } = await execAsync(command, { timeout: 600000 });

      // Buscar IPA generado
      const ipaPattern = `${projectPath}/ios/build/Release-iphoneos/App.ipa`;

      const fs = require("fs");
      if (fs.existsSync(ipaPattern)) {
        const outputPath = join(outputDir, `app-${buildType}.ipa`);
        fs.copyFileSync(ipaPattern, outputPath);
        const stats = fs.statSync(outputPath);

        return {
          success: true,
          platform: "ios",
          buildType,
          outputPath,
          outputFile: `app-${buildType}.ipa`,
          fileSize: stats.size,
          logs: stdout,
        };
      }

      throw new Error("IPA no fue generado");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[ReactNativeExecutor] Error compilando iOS:", message);

      return {
        success: false,
        platform: "ios",
        buildType,
        error: message,
      };
    }
  }

  /**
   * Compilar para Android TV
   */
  async buildAndroidTV(
    projectPath: string,
    buildType: "debug" | "release" = "release"
  ): Promise<BuildResult> {
    try {
      const buildId = uuidv4();
      const outputDir = join(this.buildsDir, buildId);
      mkdirSync(outputDir, { recursive: true });

      console.log(`[ReactNativeExecutor] Compilando Android TV (${buildType})...`);

      // Instalar dependencias
      await execAsync(`cd "${projectPath}" && npm install`, { timeout: 300000 });

      // Compilar (similar a Android pero con configuración TV)
      const command =
        buildType === "release"
          ? `cd "${projectPath}/android" && ./gradlew assembleRelease -PtvBuild=true`
          : `cd "${projectPath}/android" && ./gradlew assembleDebug -PtvBuild=true`;

      const { stdout, stderr } = await execAsync(command, { timeout: 600000 });

      // Buscar APK generado
      const apkPattern =
        buildType === "release"
          ? `${projectPath}/android/app/build/outputs/apk/release/app-release.apk`
          : `${projectPath}/android/app/build/outputs/apk/debug/app-debug.apk`;

      const fs = require("fs");
      if (fs.existsSync(apkPattern)) {
        const outputPath = join(outputDir, `app-tv-${buildType}.apk`);
        fs.copyFileSync(apkPattern, outputPath);
        const stats = fs.statSync(outputPath);

        return {
          success: true,
          platform: "android-tv",
          buildType,
          outputPath,
          outputFile: `app-tv-${buildType}.apk`,
          fileSize: stats.size,
          logs: stdout,
        };
      }

      throw new Error("APK para Android TV no fue generado");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[ReactNativeExecutor] Error compilando Android TV:", message);

      return {
        success: false,
        platform: "android-tv",
        buildType,
        error: message,
      };
    }
  }

  /**
   * Generar AAB (Android App Bundle) para Play Store
   */
  async buildAndroidAAB(projectPath: string): Promise<BuildResult> {
    try {
      const buildId = uuidv4();
      const outputDir = join(this.buildsDir, buildId);
      mkdirSync(outputDir, { recursive: true });

      console.log(`[ReactNativeExecutor] Compilando Android App Bundle...`);

      // Instalar dependencias
      await execAsync(`cd "${projectPath}" && npm install`, { timeout: 300000 });

      // Compilar AAB
      const command = `cd "${projectPath}/android" && ./gradlew bundleRelease`;

      const { stdout, stderr } = await execAsync(command, { timeout: 600000 });

      // Buscar AAB generado
      const aabPattern = `${projectPath}/android/app/build/outputs/bundle/release/app-release.aab`;

      const fs = require("fs");
      if (fs.existsSync(aabPattern)) {
        const outputPath = join(outputDir, `app-release.aab`);
        fs.copyFileSync(aabPattern, outputPath);
        const stats = fs.statSync(outputPath);

        return {
          success: true,
          platform: "android",
          buildType: "release",
          outputPath,
          outputFile: `app-release.aab`,
          fileSize: stats.size,
          logs: stdout,
        };
      }

      throw new Error("AAB no fue generado");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[ReactNativeExecutor] Error compilando AAB:", message);

      return {
        success: false,
        platform: "android",
        buildType: "release",
        error: message,
      };
    }
  }

  /**
   * Generar reporte de compilación
   */
  generateBuildReport(results: BuildResult[]): string {
    let report = `# Reporte de Compilación React Native

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
      report += `### ${result.platform.toUpperCase()} (${result.buildType})
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
let reactNativeExecutorInstance: ReactNativeExecutor | null = null;

export function getReactNativeExecutor(): ReactNativeExecutor {
  if (!reactNativeExecutorInstance) {
    reactNativeExecutorInstance = new ReactNativeExecutor();
  }
  return reactNativeExecutorInstance;
}
