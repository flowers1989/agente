/**
 * Web Preview Service
 * Servicio que permite previsualizar sitios web generados en tiempo real
 * Similar al Workspace de Manus IA
 */

import { writeFileSync, readFileSync, unlinkSync } from "fs";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface WebPreviewConfig {
  html: string;
  css?: string;
  javascript?: string;
  title?: string;
  port?: number;
}

export interface PreviewSession {
  sessionId: string;
  previewUrl: string;
  localPath: string;
  createdAt: string;
  port: number;
  status: "running" | "stopped" | "error";
  error?: string;
}

/**
 * Servicio de previsualización web
 */
export class WebPreviewService {
  private sessions: Map<string, PreviewSession> = new Map();
  private baseDir = "/tmp/web-previews";
  private basePort = 8000;
  private portCounter = 0;

  constructor() {
    this.ensureBaseDir();
  }

  /**
   * Asegurar que el directorio base existe
   */
  private ensureBaseDir(): void {
    try {
      const fs = require("fs");
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
    } catch (error) {
      console.error("[WebPreviewService] Error creando directorio base:", error);
    }
  }

  /**
   * Crear una sesión de previsualización
   */
  async createPreview(config: WebPreviewConfig): Promise<PreviewSession> {
    const sessionId = uuidv4();
    const port = this.basePort + this.portCounter++;
    const sessionDir = join(this.baseDir, sessionId);

    try {
      // Crear directorio de sesión
      const fs = require("fs");
      fs.mkdirSync(sessionDir, { recursive: true });

      // Crear archivo HTML
      const htmlContent = this.generateHTMLFile(config);
      const htmlPath = join(sessionDir, "index.html");
      writeFileSync(htmlPath, htmlContent, "utf-8");

      // Si hay CSS externo, crear archivo
      if (config.css) {
        const cssPath = join(sessionDir, "styles.css");
        writeFileSync(cssPath, config.css, "utf-8");
      }

      // Si hay JavaScript externo, crear archivo
      if (config.javascript) {
        const jsPath = join(sessionDir, "script.js");
        writeFileSync(jsPath, config.javascript, "utf-8");
      }

      // Iniciar servidor HTTP simple
      const previewUrl = await this.startLocalServer(sessionDir, port);

      const session: PreviewSession = {
        sessionId,
        previewUrl,
        localPath: htmlPath,
        createdAt: new Date().toISOString(),
        port,
        status: "running",
      };

      this.sessions.set(sessionId, session);

      return session;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[WebPreviewService] Error creando preview:", message);

      return {
        sessionId,
        previewUrl: "",
        localPath: "",
        createdAt: new Date().toISOString(),
        port,
        status: "error",
        error: message,
      };
    }
  }

  /**
   * Generar archivo HTML completo
   */
  private generateHTMLFile(config: WebPreviewConfig): string {
    const cssLink = config.css ? '<link rel="stylesheet" href="styles.css">' : "";
    const jsScript = config.javascript ? '<script src="script.js"><\/script>' : "";

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.title || "Vista Previa"}</title>
    ${cssLink}
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #f5f5f5;
        }
    </style>
</head>
<body>
    ${config.html}
    ${jsScript}
</body>
</html>`;
  }

  /**
   * Iniciar servidor HTTP local
   */
  private async startLocalServer(dir: string, port: number): Promise<string> {
    try {
      // Usar Python para servir archivos estáticos
      const pythonScript = `
import http.server
import socketserver
import os

os.chdir('${dir}')

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

with socketserver.TCPServer(("", ${port}), MyHTTPRequestHandler) as httpd:
    print(f"Servidor en http://localhost:${port}")
    httpd.serve_forever()
`;

      const scriptPath = join(this.baseDir, `server-${port}.py`);
      writeFileSync(scriptPath, pythonScript, "utf-8");

      // Iniciar servidor en background
      execAsync(`python3 "${scriptPath}" &`).catch((error) => {
        console.warn("[WebPreviewService] Warning iniciando servidor:", error);
      });

      // Esperar a que el servidor esté listo
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return `http://localhost:${port}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[WebPreviewService] Error iniciando servidor:", message);
      throw error;
    }
  }

  /**
   * Obtener una sesión de previsualización
   */
  getPreview(sessionId: string): PreviewSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Actualizar contenido de una previsualización
   */
  async updatePreview(sessionId: string, config: WebPreviewConfig): Promise<PreviewSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    try {
      const sessionDir = join(this.baseDir, sessionId);

      // Actualizar HTML
      const htmlContent = this.generateHTMLFile(config);
      writeFileSync(session.localPath, htmlContent, "utf-8");

      // Actualizar CSS si existe
      if (config.css) {
        const cssPath = join(sessionDir, "styles.css");
        writeFileSync(cssPath, config.css, "utf-8");
      }

      // Actualizar JavaScript si existe
      if (config.javascript) {
        const jsPath = join(sessionDir, "script.js");
        writeFileSync(jsPath, config.javascript, "utf-8");
      }

      session.status = "running";
      return session;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[WebPreviewService] Error actualizando preview:", message);

      session.status = "error";
      session.error = message;
      return session;
    }
  }

  /**
   * Cerrar una sesión de previsualización
   */
  closePreview(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    try {
      const sessionDir = join(this.baseDir, sessionId);
      const fs = require("fs");

      // Eliminar directorio de sesión
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }

      // Detener servidor
      execAsync(`lsof -ti:${session.port} | xargs kill -9`).catch(() => {
        // Ignorar errores
      });

      this.sessions.delete(sessionId);
      return true;
    } catch (error) {
      console.error("[WebPreviewService] Error cerrando preview:", error);
      return false;
    }
  }

  /**
   * Obtener todas las sesiones activas
   */
  getActiveSessions(): PreviewSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.status === "running");
  }

  /**
   * Limpiar sesiones antiguas
   */
  cleanupOldSessions(maxAgeMinutes: number = 60): void {
    const now = Date.now();
    const maxAge = maxAgeMinutes * 60 * 1000;

    for (const [sessionId, session] of this.sessions.entries()) {
      const sessionAge = now - new Date(session.createdAt).getTime();
      if (sessionAge > maxAge) {
        this.closePreview(sessionId);
        console.log(`[WebPreviewService] Sesión antigua eliminada: ${sessionId}`);
      }
    }
  }

  /**
   * Generar reporte de sesiones
   */
  generateSessionReport(): string {
    const sessions = this.getActiveSessions();

    let report = `# Reporte de Sesiones de Previsualización Web\n\n`;
    report += `**Total de sesiones activas**: ${sessions.length}\n\n`;

    if (sessions.length === 0) {
      report += `No hay sesiones activas en este momento.\n`;
      return report;
    }

    report += `## Sesiones Activas\n\n`;
    for (const session of sessions) {
      report += `### ${session.sessionId}\n`;
      report += `- **URL**: ${session.previewUrl}\n`;
      report += `- **Puerto**: ${session.port}\n`;
      report += `- **Creada**: ${session.createdAt}\n`;
      report += `- **Estado**: ${session.status}\n\n`;
    }

    return report;
  }
}

/**
 * Instancia global del servicio
 */
let webPreviewServiceInstance: WebPreviewService | null = null;

export function getWebPreviewService(): WebPreviewService {
  if (!webPreviewServiceInstance) {
    webPreviewServiceInstance = new WebPreviewService();
  }
  return webPreviewServiceInstance;
}
