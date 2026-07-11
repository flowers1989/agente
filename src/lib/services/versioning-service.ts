/**
 * Versioning Service
 * Servicio de versionamiento automático y control de versiones (SemVer)
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

export interface VersionInfo {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  metadata?: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    added?: string[];
    changed?: string[];
    deprecated?: string[];
    removed?: string[];
    fixed?: string[];
    security?: string[];
  };
}

export interface VersioningConfig {
  projectPath: string;
  currentVersion: string;
  bumpType: "major" | "minor" | "patch" | "prerelease";
  prereleaseName?: string; // alpha, beta, rc, etc.
  changelogPath?: string;
}

export interface VersioningResult {
  versioningId: string;
  oldVersion: string;
  newVersion: string;
  changelogUpdated: boolean;
  packageJsonUpdated: boolean;
  gitTagCreated?: boolean;
  timestamp: string;
}

/**
 * Servicio de Versionamiento
 */
export class VersioningService {
  private results: Map<string, VersioningResult> = new Map();

  /**
   * Parsear versión SemVer
   */
  parseVersion(versionString: string): VersionInfo {
    const regex =
      /^(\d+)\.(\d+)\.(\d+)(?:-(\w+(?:\.\w+)*))?(?:\+(\w+(?:\.\w+)*))?$/;
    const match = versionString.match(regex);

    if (!match) {
      throw new Error(`Versión inválida: ${versionString}`);
    }

    return {
      major: parseInt(match[1]),
      minor: parseInt(match[2]),
      patch: parseInt(match[3]),
      prerelease: match[4],
      metadata: match[5],
    };
  }

  /**
   * Convertir VersionInfo a string
   */
  versionToString(version: VersionInfo): string {
    let result = `${version.major}.${version.minor}.${version.patch}`;
    if (version.prerelease) {
      result += `-${version.prerelease}`;
    }
    if (version.metadata) {
      result += `+${version.metadata}`;
    }
    return result;
  }

  /**
   * Incrementar versión
   */
  bumpVersion(currentVersion: string, bumpType: string, prereleaseName?: string): string {
    const version = this.parseVersion(currentVersion);

    switch (bumpType) {
      case "major":
        version.major++;
        version.minor = 0;
        version.patch = 0;
        version.prerelease = undefined;
        break;
      case "minor":
        version.minor++;
        version.patch = 0;
        version.prerelease = undefined;
        break;
      case "patch":
        version.patch++;
        version.prerelease = undefined;
        break;
      case "prerelease":
        if (prereleaseName) {
          version.prerelease = `${prereleaseName}.1`;
        } else {
          version.prerelease = "alpha.1";
        }
        break;
      default:
        throw new Error(`Tipo de bump inválido: ${bumpType}`);
    }

    return this.versionToString(version);
  }

  /**
   * Actualizar versión del proyecto
   */
  async updateVersion(config: VersioningConfig): Promise<VersioningResult> {
    const versioningId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      // Calcular nueva versión
      const newVersion = this.bumpVersion(
        config.currentVersion,
        config.bumpType,
        config.prereleaseName
      );

      console.log(
        `[VersioningService] Actualizando versión: ${config.currentVersion} → ${newVersion}`
      );

      // Actualizar package.json
      const packageJsonPath = join(config.projectPath, "package.json");
      let packageJsonUpdated = false;

      if (existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
          packageJson.version = newVersion;
          writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
          packageJsonUpdated = true;
          console.log(`[VersioningService] package.json actualizado`);
        } catch (error) {
          console.warn(`[VersioningService] Error actualizando package.json:`, error);
        }
      }

      // Actualizar CHANGELOG
      const changelogPath = config.changelogPath || join(config.projectPath, "CHANGELOG.md");
      let changelogUpdated = false;

      try {
        const changelog = this.generateChangelog(newVersion, changelogPath);
        writeFileSync(changelogPath, changelog);
        changelogUpdated = true;
        console.log(`[VersioningService] CHANGELOG.md actualizado`);
      } catch (error) {
        console.warn(`[VersioningService] Error actualizando CHANGELOG:`, error);
      }

      const result: VersioningResult = {
        versioningId,
        oldVersion: config.currentVersion,
        newVersion,
        changelogUpdated,
        packageJsonUpdated,
        timestamp,
      };

      this.results.set(versioningId, result);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Error en versionamiento: ${message}`);
    }
  }

  /**
   * Generar CHANGELOG
   */
  private generateChangelog(newVersion: string, changelogPath: string): string {
    let changelog = "";

    // Leer changelog existente si existe
    if (existsSync(changelogPath)) {
      changelog = readFileSync(changelogPath, "utf-8");
    }

    // Crear entrada para nueva versión
    const date = new Date().toISOString().split("T")[0];
    const entry = `## [${newVersion}] - ${date}\n\n### Added\n- Nueva funcionalidad\n\n### Changed\n- Cambios realizados\n\n### Fixed\n- Bugs corregidos\n\n`;

    // Insertar al principio (después del encabezado si existe)
    if (changelog.startsWith("# Changelog")) {
      changelog = changelog.replace("# Changelog\n\n", `# Changelog\n\n${entry}`);
    } else {
      changelog = `# Changelog\n\n${entry}${changelog}`;
    }

    return changelog;
  }

  /**
   * Obtener resultado
   */
  getVersioningResult(versioningId: string): VersioningResult | undefined {
    return this.results.get(versioningId);
  }

  /**
   * Generar reporte de versionamiento
   */
  generateVersioningReport(result: VersioningResult): string {
    let report = `# Reporte de Versionamiento\n\n`;
    report += `**ID de Versionamiento**: ${result.versioningId}\n`;
    report += `**Versión Anterior**: ${result.oldVersion}\n`;
    report += `**Nueva Versión**: ${result.newVersion}\n`;
    report += `**Fecha**: ${result.timestamp}\n\n`;

    report += `## Cambios Realizados\n\n`;
    report += `- ${result.packageJsonUpdated ? "✅" : "❌"} package.json actualizado\n`;
    report += `- ${result.changelogUpdated ? "✅" : "❌"} CHANGELOG.md actualizado\n`;
    report += `- ${result.gitTagCreated ? "✅" : "❌"} Tag de Git creado\n`;

    return report;
  }

  /**
   * Comparar versiones
   */
  compareVersions(v1: string, v2: string): number {
    const version1 = this.parseVersion(v1);
    const version2 = this.parseVersion(v2);

    // Comparar major
    if (version1.major !== version2.major) {
      return version1.major > version2.major ? 1 : -1;
    }

    // Comparar minor
    if (version1.minor !== version2.minor) {
      return version1.minor > version2.minor ? 1 : -1;
    }

    // Comparar patch
    if (version1.patch !== version2.patch) {
      return version1.patch > version2.patch ? 1 : -1;
    }

    // Versiones iguales
    return 0;
  }
}

/**
 * Instancia global
 */
let versioningServiceInstance: VersioningService | null = null;

export function getVersioningService(): VersioningService {
  if (!versioningServiceInstance) {
    versioningServiceInstance = new VersioningService();
  }
  return versioningServiceInstance;
}

