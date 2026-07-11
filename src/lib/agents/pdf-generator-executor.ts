/**
 * PDF Generator Executor
 * Genera archivos PDF a partir de contenido Markdown o HTML
 * Permite que los agentes creen y entreguen documentos PDF
 */

import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, readFileSync, unlinkSync } from "fs";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

const execAsync = promisify(exec);

export interface PDFGenerationParams {
  content: string; // Contenido Markdown o HTML
  title?: string;
  author?: string;
  subject?: string;
  format?: "markdown" | "html";
  orientation?: "portrait" | "landscape";
  pageSize?: "A4" | "letter" | "A3";
}

export interface PDFResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
}

/**
 * Ejecutor de generación de PDF
 */
export class PDFGeneratorExecutor {
  private outputDir = "/tmp/generated-pdfs";

  constructor() {
    this.ensureOutputDir();
  }

  /**
   * Asegurar que el directorio de salida existe
   */
  private ensureOutputDir(): void {
    try {
      const fs = require("fs");
      if (!fs.existsSync(this.outputDir)) {
        fs.mkdirSync(this.outputDir, { recursive: true });
      }
    } catch (error) {
      console.error("[PDFGenerator] Error creando directorio de salida:", error);
    }
  }

  /**
   * Generar PDF a partir de Markdown
   */
  async generateFromMarkdown(params: PDFGenerationParams): Promise<PDFResult> {
    try {
      const fileName = `${uuidv4()}.pdf`;
      const filePath = join(this.outputDir, fileName);

      // Crear archivo Markdown temporal
      const mdFileName = `${uuidv4()}.md`;
      const mdFilePath = join(this.outputDir, mdFileName);

      writeFileSync(mdFilePath, params.content, "utf-8");

      // Usar manus-md-to-pdf si está disponible
      try {
        const { stdout, stderr } = await execAsync(
          `manus-md-to-pdf "${mdFilePath}" "${filePath}"`
        );

        if (stderr) {
          console.warn("[PDFGenerator] Warning:", stderr);
        }

        // Verificar que el archivo se creó
        const fs = require("fs");
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);

          // Limpiar archivo temporal
          unlinkSync(mdFilePath);

          return {
            success: true,
            filePath,
            fileName,
            fileSize: stats.size,
          };
        }
      } catch (error) {
        console.warn("[PDFGenerator] manus-md-to-pdf no disponible, intentando alternativa...");
        // Continuar con método alternativo
      }

      // Método alternativo: usar weasyprint o similar
      return await this.generateFromMarkdownAlternative(params, filePath, mdFilePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[PDFGenerator] Error generando PDF:", message);

      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Método alternativo para generar PDF (usando Python)
   */
  private async generateFromMarkdownAlternative(
    params: PDFGenerationParams,
    filePath: string,
    mdFilePath: string
  ): Promise<PDFResult> {
    try {
      // Crear script Python para convertir Markdown a PDF
      const pythonScript = `
import markdown
from weasyprint import HTML, CSS
import sys

# Leer Markdown
with open('${mdFilePath}', 'r', encoding='utf-8') as f:
    md_content = f.read()

# Convertir a HTML
html_content = markdown.markdown(md_content, extensions=['tables', 'fenced_code'])

# Envolver en HTML completo
full_html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${params.title || "Documento"}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        h1 {{ color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }}
        h2 {{ color: #555; margin-top: 20px; }}
        table {{ border-collapse: collapse; width: 100%; margin: 10px 0; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background-color: #f2f2f2; }}
        code {{ background-color: #f4f4f4; padding: 2px 5px; border-radius: 3px; }}
        pre {{ background-color: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }}
    </style>
</head>
<body>
    {html_content}
</body>
</html>
"""

# Generar PDF
HTML(string=full_html).write_pdf('${filePath}')
print("PDF generado exitosamente")
`;

      const pythonScriptPath = join(this.outputDir, `${uuidv4()}.py`);
      writeFileSync(pythonScriptPath, pythonScript, "utf-8");

      // Ejecutar script Python
      const { stdout, stderr } = await execAsync(`python3 "${pythonScriptPath}"`);

      if (stderr && !stderr.includes("warning")) {
        throw new Error(stderr);
      }

      // Verificar que el archivo se creó
      const fs = require("fs");
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);

        // Limpiar archivos temporales
        unlinkSync(mdFilePath);
        unlinkSync(pythonScriptPath);

        return {
          success: true,
          filePath,
          fileName: filePath.split("/").pop(),
          fileSize: stats.size,
        };
      }

      throw new Error("PDF no fue generado");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[PDFGenerator] Error en método alternativo:", message);

      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Generar PDF a partir de HTML
   */
  async generateFromHTML(params: PDFGenerationParams): Promise<PDFResult> {
    try {
      const fileName = `${uuidv4()}.pdf`;
      const filePath = join(this.outputDir, fileName);

      // Crear archivo HTML temporal
      const htmlFileName = `${uuidv4()}.html`;
      const htmlFilePath = join(this.outputDir, htmlFileName);

      writeFileSync(htmlFilePath, params.content, "utf-8");

      // Usar weasyprint o similar
      const pythonScript = `
from weasyprint import HTML
HTML('${htmlFilePath}').write_pdf('${filePath}')
print("PDF generado exitosamente")
`;

      const pythonScriptPath = join(this.outputDir, `${uuidv4()}.py`);
      writeFileSync(pythonScriptPath, pythonScript, "utf-8");

      const { stdout, stderr } = await execAsync(`python3 "${pythonScriptPath}"`);

      // Verificar que el archivo se creó
      const fs = require("fs");
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);

        // Limpiar archivos temporales
        unlinkSync(htmlFilePath);
        unlinkSync(pythonScriptPath);

        return {
          success: true,
          filePath,
          fileName,
          fileSize: stats.size,
        };
      }

      throw new Error("PDF no fue generado");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[PDFGenerator] Error generando PDF desde HTML:", message);

      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Limpiar archivos PDF antiguos
   */
  cleanupOldFiles(maxAgeHours: number = 24): void {
    try {
      const fs = require("fs");
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000;

      const files = fs.readdirSync(this.outputDir);
      for (const file of files) {
        const filePath = join(this.outputDir, file);
        const stats = fs.statSync(filePath);
        const fileAge = now - stats.mtimeMs;

        if (fileAge > maxAge) {
          fs.unlinkSync(filePath);
          console.log(`[PDFGenerator] Archivo antiguo eliminado: ${file}`);
        }
      }
    } catch (error) {
      console.error("[PDFGenerator] Error limpiando archivos:", error);
    }
  }
}

/**
 * Instancia global del generador de PDF
 */
let pdfGeneratorInstance: PDFGeneratorExecutor | null = null;

export function getPDFGenerator(): PDFGeneratorExecutor {
  if (!pdfGeneratorInstance) {
    pdfGeneratorInstance = new PDFGeneratorExecutor();
  }
  return pdfGeneratorInstance;
}

