// ==================== DOCUMENT GENERATOR SERVICE ====================
// Servicio unificado para generar documentos en múltiples formatos:
// PDF, DOCX (Word), XLSX (Excel), PPTX (PowerPoint), HTML, CSV, JSON, TXT, MD
//
// Todos los métodos reciben contenido (Markdown o estructurado) y devuelven
// un Buffer listo para descargar o guardar en el sandbox.
//
// Dependencias:
//   - jspdf      (ya instalado) → PDF en cliente
//   - pdfkit     ( nuevo)       → PDF en servidor (más robusto)
//   - docx       ( nuevo)       → Word .docx
//   - exceljs    ( nuevo)       → Excel .xlsx
//   - pptxgenjs  ( nuevo)       → PowerPoint .pptx

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";
import ExcelJS from "exceljs";
import pptxgen from "pptxgenjs";
import { marked } from "marked";

export type DocumentFormat =
  | "pdf"
  | "docx"
  | "xlsx"
  | "pptx"
  | "html"
  | "csv"
  | "json"
  | "txt"
  | "md";

export interface DocumentOptions {
  title?: string;
  author?: string;
  subject?: string;
  filename?: string;
  // Para XLSX: nombre de la hoja
  sheetName?: string;
  // Para PPTX: diseño
  slideTheme?: "light" | "dark" | "corporate";
}

export interface GeneratedDocument {
  buffer: Buffer;
  format: DocumentFormat;
  filename: string;
  mimeType: string;
  size: number;
}

// ==================== UTILIDADES ====================

const MIME_TYPES: Record<DocumentFormat, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  html: "text/html",
  csv: "text/csv",
  json: "application/json",
  txt: "text/plain",
  md: "text/markdown",
};

function sanitizeFilename(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_\. ]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 100);
}

// Convierte Markdown a AST usando marked
function parseMarkdown(md: string): any[] {
  const tokens = marked.lexer(md);
  return tokens as any[];
}

// ==================== PDF ====================
// Usa jsPDF (que ya está instalado y funciona en servidor standalone)
// en lugar de pdfkit que requiere assets externos.

import { jsPDF } from "jspdf";

export async function generatePDF(
  content: string,
  options: DocumentOptions = {}
): Promise<GeneratedDocument> {
  const filename = sanitizeFilename(options.filename || options.title || "documento") + ".pdf";

  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  // Helper: añadir texto con wrap y paginación
  const addText = (text: string, fontSize: number, fontStyle: "normal" | "bold" | "italic" = "normal", color: [number, number, number] = [0, 0, 0]) => {
    doc.setFont("helvetica", fontStyle);
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, maxWidth);
    for (const line of lines) {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += fontSize * 0.5;
    }
    y += 2;
  };

  // Título
  if (options.title) {
    addText(options.title, 22, "bold", [108, 92, 231]);
    y += 4;
  }

  // Metadata
  if (options.author) {
    addText(`Por: ${options.author}`, 9, "italic", [120, 120, 120]);
    y += 2;
  }

  // Parsear markdown y renderizar
  const tokens = parseMarkdown(content);
  for (const token of tokens) {
    switch (token.type) {
      case "heading": {
        const sizes = [20, 16, 14, 12, 11, 10];
        const size = sizes[Math.min(token.depth - 1, 5)];
        addText(token.text, size, "bold", [40, 40, 40]);
        break;
      }
      case "paragraph": {
        addText(token.text, 11, "normal", [30, 30, 30]);
        break;
      }
      case "list": {
        for (const item of (token as any).items) {
          const prefix = token.ordered ? `${(token as any).start}. ` : "• ";
          addText(`${prefix}${item.text}`, 11, "normal", [50, 50, 50]);
        }
        y += 1;
        break;
      }
      case "code": {
        addText(token.text, 9, "normal", [60, 60, 60]);
        break;
      }
      case "blockquote": {
        addText(token.text, 11, "italic", [90, 90, 90]);
        break;
      }
      case "hr": {
        if (y > pageHeight - margin - 5) {
          doc.addPage();
          y = margin;
        }
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;
        break;
      }
      case "space": {
        y += 3;
        break;
      }
      case "table": {
        const table = token as any;
        // Header
        const colCount = table.header.length;
        const colWidth = maxWidth / colCount;
        if (y > pageHeight - margin - 20) {
          doc.addPage();
          y = margin;
        }
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, y - 4, maxWidth, 8, "F");
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        table.header.forEach((cell: string, i: number) => {
          doc.text(cell, margin + i * colWidth + 1, y);
        });
        y += 8;
        // Rows
        doc.setFont("helvetica", "normal");
        table.rows.forEach((row: string[]) => {
          if (y > pageHeight - margin) {
            doc.addPage();
            y = margin;
          }
          row.forEach((cell, i) => {
            const lines = doc.splitTextToSize(cell, colWidth - 2);
            doc.text(lines, margin + i * colWidth + 1, y);
          });
          y += 6;
        });
        y += 3;
        break;
      }
      default: {
        const text = (token as any).text || "";
        if (text) addText(text, 11, "normal", [30, 30, 30]);
      }
    }
  }

  const arrayBuffer = doc.output("arraybuffer");
  const buffer = Buffer.from(arrayBuffer);
  return {
    buffer,
    format: "pdf",
    filename,
    mimeType: MIME_TYPES.pdf,
    size: buffer.length,
  };
}

// ==================== DOCX (Word) ====================

export async function generateDOCX(
  content: string,
  options: DocumentOptions = {}
): Promise<GeneratedDocument> {
  const filename = sanitizeFilename(options.filename || options.title || "documento") + ".docx";

  const children: (Paragraph | Table)[] = [];

  // Título
  if (options.title) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: options.title, bold: true, size: 48 })],
      })
    );
    children.push(new Paragraph({ text: "" }));
  }

  // Metadata
  if (options.author) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ text: `Por: ${options.author}`, italics: true, color: "666666", size: 18 }),
        ],
      })
    );
    children.push(new Paragraph({ text: "" }));
  }

  // Parsear markdown → párrafos docx
  const tokens = parseMarkdown(content);
  for (const token of tokens) {
    const paragraphOrTable = renderMarkdownToDOCX(token);
    if (Array.isArray(paragraphOrTable)) {
      children.push(...paragraphOrTable);
    } else if (paragraphOrTable) {
      children.push(paragraphOrTable);
    }
  }

  const doc = new Document({
    creator: options.author || "Agente IA",
    title: options.title || "Documento",
    description: options.subject || "",
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return {
    buffer,
    format: "docx",
    filename,
    mimeType: MIME_TYPES.docx,
    size: buffer.length,
  };
}

function renderMarkdownToDOCX(token: any): Paragraph | Table | (Paragraph | Table)[] | null {
  switch (token.type) {
    case "heading": {
      const headingMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
        4: HeadingLevel.HEADING_4,
        5: HeadingLevel.HEADING_5,
        6: HeadingLevel.HEADING_6,
      };
      return new Paragraph({
        heading: headingMap[token.depth] || HeadingLevel.HEADING_6,
        children: [new TextRun({ text: token.text, bold: true })],
      });
    }
    case "paragraph": {
      // Parsear inline (bold, italic, code)
      const runs = parseInlineMarkdown(token.text);
      return new Paragraph({ children: runs });
    }
    case "list": {
      const listToken = token as any;
      return listToken.items.map((item, i) => {
        const prefix = listToken.ordered ? `${(listToken.start || 1) + i}. ` : "• ";
        return new Paragraph({
          children: [new TextRun({ text: `${prefix}${item.text}` })],
          indent: { left: 360 },
        });
      });
    }
    case "code": {
      return new Paragraph({
        children: [new TextRun({ text: token.text, font: "Courier New", size: 18 })],
        shading: { type: "solid", color: "F4F4F4", fill: "F4F4F4" },
        spacing: { before: 100, after: 100 },
      });
    }
    case "blockquote": {
      return new Paragraph({
        children: [new TextRun({ text: token.text, italics: true, color: "555555" })],
        indent: { left: 720 },
        border: {
          left: { style: BorderStyle.SINGLE, size: 24, color: "999999", space: 10 },
        },
      });
    }
    case "hr": {
      return new Paragraph({
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC", space: 1 },
        },
      });
    }
    case "space": {
      return new Paragraph({ text: "" });
    }
    case "table": {
      const tableToken = token as any;
      const rows: TableRow[] = [];
      // Header
      rows.push(
        new TableRow({
          tableHeader: true,
          children: tableToken.header.map(
            (cell) =>
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: cell.text, bold: true })] })],
                shading: { type: "solid", color: "EEEEEE", fill: "EEEEEE" },
                width: { size: Math.floor(100 / tableToken.header.length), type: WidthType.PERCENTAGE },
              })
          ),
        })
      );
      // Body
      for (const row of tableToken.rows) {
        rows.push(
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  children: [new Paragraph({ children: parseInlineMarkdown(cell.text) })],
                  width: { size: Math.floor(100 / row.length), type: WidthType.PERCENTAGE },
                })
            ),
          })
        );
      }
      return new Table({
        rows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      });
    }
    default: {
      const text = (token as { text?: string }).text || "";
      if (text) return new Paragraph({ children: [new TextRun({ text })] });
      return null;
    }
  }
}

function parseInlineMarkdown(text: string): TextRun[] {
  // Parser inline simple: **bold**, *italic*, `code`, [text](url)
  const runs: TextRun[] = [];
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push(new TextRun({ text: text.slice(lastIndex, match.index) }));
    }
    if (match[2]) runs.push(new TextRun({ text: match[2], bold: true }));
    else if (match[3]) runs.push(new TextRun({ text: match[3], italics: true }));
    else if (match[4]) runs.push(new TextRun({ text: match[4], font: "Courier New" }));
    else if (match[5])
      runs.push(
        new TextRun({
          text: match[5],
          color: "0563C1",
          underline: {},
        })
      );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    runs.push(new TextRun({ text: text.slice(lastIndex) }));
  }
  return runs.length ? runs : [new TextRun({ text })];
}

// ==================== XLSX (Excel) ====================

export async function generateXLSX(
  content: string,
  options: DocumentOptions = {}
): Promise<GeneratedDocument> {
  const filename = sanitizeFilename(options.filename || options.title || "documento") + ".xlsx";

  const workbook = new ExcelJS.Workbook();
  workbook.creator = options.author || "Agente IA";
  workbook.created = new Date();

  // Si el contenido es Markdown con tablas, extraer las tablas
  const tables = extractMarkdownTables(content);

  if (tables.length === 0) {
    // Sin tablas: crear una hoja con el contenido como texto
    const sheet = workbook.addWorksheet(options.sheetName || "Hoja 1");
    const lines = content.split("\n").filter((l) => l.trim());
    lines.forEach((line, i) => {
      const row = sheet.getRow(i + 1);
      row.getCell(1).value = line;
    });
    sheet.getColumn(1).width = 80;
  } else {
    // Una hoja por cada tabla
    tables.forEach((table, idx) => {
      const sheet = workbook.addWorksheet(options.sheetName || `Tabla ${idx + 1}`);
      // Header
      const headerRow = sheet.getRow(1);
      table.header.forEach((cell, colIdx) => {
        const cellObj = headerRow.getCell(colIdx + 1);
        cellObj.value = cell;
        cellObj.font = { bold: true };
        cellObj.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFEEEEEE" },
        };
        cellObj.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
      // Body
      table.rows.forEach((row, rowIdx) => {
        const excelRow = sheet.getRow(rowIdx + 2);
        row.forEach((cell, colIdx) => {
          const cellObj = excelRow.getCell(colIdx + 1);
          // Intentar convertir a número si aplica
          const num = Number(cell);
          cellObj.value = !isNaN(num) && cell.trim() !== "" ? num : cell;
          cellObj.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      });
      // Auto-ancho
      sheet.columns.forEach((col) => {
        col.width = 20;
      });
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const buf = Buffer.from(buffer);
  return {
    buffer: buf,
    format: "xlsx",
    filename,
    mimeType: MIME_TYPES.xlsx,
    size: buf.length,
  };
}

function extractMarkdownTables(md: string): { header: string[]; rows: string[][] }[] {
  const tables: { header: string[]; rows: string[][] }[] = [];
  const lines = md.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Detectar inicio de tabla: línea con pipes
    if (line.includes("|") && line.trim().startsWith("|")) {
      const header = line
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());
      // Siguiente línea debe ser separador: |---|---|
      if (i + 1 < lines.length && /^\|[\s-:|]+\|$/.test(lines[i + 1].trim())) {
        i += 2;
        const rows: string[][] = [];
        while (i < lines.length && lines[i].trim().startsWith("|")) {
          const row = lines[i]
            .split("|")
            .slice(1, -1)
            .map((c) => c.trim());
          rows.push(row);
          i++;
        }
        tables.push({ header, rows });
        continue;
      }
    }
    i++;
  }
  return tables;
}

// ==================== PPTX (PowerPoint) ====================

export async function generatePPTX(
  content: string,
  options: DocumentOptions = {}
): Promise<GeneratedDocument> {
  const filename = sanitizeFilename(options.filename || options.title || "presentacion") + ".pptx";

  const pptx = new pptxgen();
  pptx.author = options.author || "Agente IA";
  pptx.title = options.title || "Presentación";

  // Tema
  const themeColors =
    options.slideTheme === "dark"
      ? { bg: "1A1A2E", text: "FFFFFF", accent: "E94560" }
      : options.slideTheme === "corporate"
      ? { bg: "FFFFFF", text: "2C3E50", accent: "3498DB" }
      : { bg: "FFFFFF", text: "333333", accent: "6C5CE7" };

  // Slide de título
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: themeColors.bg };
  titleSlide.addText(options.title || "Presentación", {
    x: 0.5,
    y: 2,
    w: 9,
    h: 1.5,
    fontSize: 40,
    bold: true,
    color: themeColors.text,
    align: "center",
  });
  if (options.author) {
    titleSlide.addText(`Por: ${options.author}`, {
      x: 0.5,
      y: 4,
      w: 9,
      h: 0.5,
      fontSize: 16,
      color: themeColors.accent,
      align: "center",
    });
  }

  // Parsear markdown y crear slides por cada heading h1/h2
  const tokens = parseMarkdown(content);
  let currentSlide: pptxgen.Slide | null = null;
  let bulletBuffer: { text: string; level: number }[] = [];

  const flushBullets = () => {
    if (currentSlide && bulletBuffer.length > 0) {
      currentSlide.addText(
        bulletBuffer.map((b) => ({
          text: b.text,
          options: { bullet: { indent: b.level * 20 }, fontSize: 18, color: themeColors.text },
        })),
        { x: 0.5, y: 1.5, w: 9, h: 4, valign: "top" }
      );
      bulletBuffer = [];
    }
  };

  for (const token of tokens) {
    if (token.type === "heading" && (token.depth === 1 || token.depth === 2)) {
      flushBullets();
      currentSlide = pptx.addSlide();
      currentSlide.background = { color: themeColors.bg };
      currentSlide.addText(token.text, {
        x: 0.5,
        y: 0.3,
        w: 9,
        h: 1,
        fontSize: token.depth === 1 ? 32 : 28,
        bold: true,
        color: themeColors.accent,
      });
    } else if (token.type === "heading" && token.depth >= 3 && currentSlide) {
      flushBullets();
      currentSlide.addText(token.text, {
        x: 0.5,
        y: 1.2,
        w: 9,
        h: 0.5,
        fontSize: 22,
        bold: true,
        color: themeColors.text,
      });
    } else if (token.type === "list" && currentSlide) {
      for (const item of (token as any).items) {
        bulletBuffer.push({ text: item.text, level: (item as any).depth || 0 });
      }
    } else if (token.type === "paragraph" && currentSlide) {
      bulletBuffer.push({ text: token.text, level: 0 });
    } else if (token.type === "code" && currentSlide) {
      flushBullets();
      currentSlide.addText(token.text, {
        x: 0.5,
        y: 1.5,
        w: 9,
        h: 3,
        fontSize: 12,
        fontFace: "Courier New",
        color: "F8F8F2",
        fill: { color: "282A36" },
        valign: "top",
      });
    }
  }
  flushBullets();

  const buffer = await (pptx as any).write({ outputType: "nodebuffer" });
  const buf = Buffer.from(buffer as ArrayBuffer);
  return {
    buffer: buf,
    format: "pptx",
    filename,
    mimeType: MIME_TYPES.pptx,
    size: buf.length,
  };
}

// ==================== HTML ====================

export async function generateHTML(
  content: string,
  options: DocumentOptions = {}
): Promise<GeneratedDocument> {
  const filename = sanitizeFilename(options.filename || options.title || "documento") + ".html";

  const htmlBody = marked.parse(content);
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(options.title || "Documento")}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 800px; margin: 2rem auto; padding: 1rem; color: #1a1a1a; line-height: 1.6; }
  h1 { color: #6C5CE7; border-bottom: 2px solid #6C5CE7; padding-bottom: 0.3em; }
  h2 { color: #2C3E50; }
  h3 { color: #34495E; }
  code { background: #f4f4f4; padding: 0.2em 0.4em; border-radius: 3px; font-family: "Courier New", monospace; }
  pre { background: #2d2d2d; color: #f8f8f2; padding: 1em; border-radius: 8px; overflow-x: auto; }
  pre code { background: transparent; color: inherit; padding: 0; }
  blockquote { border-left: 4px solid #6C5CE7; margin: 1em 0; padding: 0.5em 1em; background: #f9f9f9; color: #555; font-style: italic; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  th, td { border: 1px solid #ddd; padding: 0.5em; text-align: left; }
  th { background: #f4f4f4; font-weight: bold; }
  a { color: #3498DB; }
  hr { border: none; border-top: 1px solid #ddd; margin: 2em 0; }
</style>
</head>
<body>
${options.title ? `<h1>${escapeHtml(options.title)}</h1>` : ""}
${options.author ? `<p><em>Por: ${escapeHtml(options.author)}</em></p>` : ""}
${htmlBody}
</body>
</html>`;

  const buf = Buffer.from(html, "utf-8");
  return {
    buffer: buf,
    format: "html",
    filename,
    mimeType: MIME_TYPES.html,
    size: buf.length,
  };
}

// ==================== CSV ====================

export async function generateCSV(
  content: string,
  options: DocumentOptions = {}
): Promise<GeneratedDocument> {
  const filename = sanitizeFilename(options.filename || options.title || "datos") + ".csv";

  const tables = extractMarkdownTables(content);
  let csv = "";

  if (tables.length > 0) {
    const table = tables[0]; // Primera tabla
    csv += table.header.map(csvEscape).join(",") + "\n";
    for (const row of table.rows) {
      csv += row.map(csvEscape).join(",") + "\n";
    }
  } else {
    // Sin tabla: poner cada línea como una fila con una columna
    const lines = content.split("\n").filter((l) => l.trim());
    csv += "Contenido\n";
    for (const line of lines) {
      csv += csvEscape(line) + "\n";
    }
  }

  const buf = Buffer.from(csv, "utf-8");
  return {
    buffer: buf,
    format: "csv",
    filename,
    mimeType: MIME_TYPES.csv,
    size: buf.length,
  };
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ==================== JSON ====================

export async function generateJSON(
  content: string,
  options: DocumentOptions = {}
): Promise<GeneratedDocument> {
  const filename = sanitizeFilename(options.filename || options.title || "datos") + ".json";

  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch {
    // Si no es JSON válido, estructurarlo
    data = {
      title: options.title || "Documento",
      author: options.author,
      content,
      generatedAt: new Date().toISOString(),
    };
  }

  const json = JSON.stringify(data, null, 2);
  const buf = Buffer.from(json, "utf-8");
  return {
    buffer: buf,
    format: "json",
    filename,
    mimeType: MIME_TYPES.json,
    size: buf.length,
  };
}

// ==================== TXT y MD ====================

export async function generateTXT(
  content: string,
  options: DocumentOptions = {}
): Promise<GeneratedDocument> {
  const filename = sanitizeFilename(options.filename || options.title || "documento") + ".txt";
  // Strip markdown
  const text = stripMarkdown(content);
  const finalText = (options.title ? `${options.title}\n${"=".repeat(options.title.length)}\n\n` : "") + text;
  const buf = Buffer.from(finalText, "utf-8");
  return {
    buffer: buf,
    format: "txt",
    filename,
    mimeType: MIME_TYPES.txt,
    size: buf.length,
  };
}

export async function generateMD(
  content: string,
  options: DocumentOptions = {}
): Promise<GeneratedDocument> {
  const filename = sanitizeFilename(options.filename || options.title || "documento") + ".md";
  const finalContent = (options.title ? `# ${options.title}\n\n${options.author ? `*Por: ${options.author}*\n\n` : ""}` : "") + content;
  const buf = Buffer.from(finalContent, "utf-8");
  return {
    buffer: buf,
    format: "md",
    filename,
    mimeType: MIME_TYPES.md,
    size: buf.length,
  };
}

// ==================== GENERADOR PRINCIPAL ====================

export async function generateDocument(
  format: DocumentFormat,
  content: string,
  options: DocumentOptions = {}
): Promise<GeneratedDocument> {
  switch (format) {
    case "pdf":
      return generatePDF(content, options);
    case "docx":
      return generateDOCX(content, options);
    case "xlsx":
      return generateXLSX(content, options);
    case "pptx":
      return generatePPTX(content, options);
    case "html":
      return generateHTML(content, options);
    case "csv":
      return generateCSV(content, options);
    case "json":
      return generateJSON(content, options);
    case "txt":
      return generateTXT(content, options);
    case "md":
      return generateMD(content, options);
    default:
      throw new Error(`Formato no soportado: ${format}`);
  }
}

// ==================== HELPERS ====================

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/^---+$/gm, "")
    .replace(/\n{3,}/g, "\n\n");
}

// ==================== DETECCIÓN DE FORMATO ====================

export interface FormatDetectionResult {
  format: DocumentFormat | null;
  confidence: number;
  matchedKeyword: string;
}

// Detecta el formato solicitado a partir de texto del usuario
export function detectDocumentFormat(userMessage: string): FormatDetectionResult {
  const msg = userMessage.toLowerCase();

  // Patrones por formato
  const patterns: { format: DocumentFormat; keywords: string[] }[] = [
    {
      format: "pdf",
      keywords: ["pdf", "documento pdf", "en pdf", "formato pdf", ".pdf", "guardar como pdf", "exportar a pdf", "dame un pdf", "haz un pdf", "genera un pdf", "crea un pdf", "convierte a pdf"],
    },
    {
      format: "docx",
      keywords: ["docx", "word", ".docx", "documento word", "en word", "formato word", "guardar como word", "exportar a word", "dame un word", "haz un word", "genera un word", "crea un word"],
    },
    {
      format: "xlsx",
      keywords: ["xlsx", "excel", ".xlsx", "hoja de calculo", "hoja de cálculo", "en excel", "formato excel", "guardar como excel", "exportar a excel", "dame un excel", "haz un excel", "genera un excel", "crea un excel", "libro de excel"],
    },
    {
      format: "pptx",
      keywords: ["pptx", "powerpoint", "power point", ".pptx", "presentación", "presentacion", "diapositivas", "slides", "dame una presentacion", "haz una presentacion", "genera una presentacion", "crea una presentacion", "dame un powerpoint"],
    },
    {
      format: "html",
      keywords: ["html", ".html", "página web", "pagina web", "en html", "formato html"],
    },
    {
      format: "csv",
      keywords: ["csv", ".csv", "valores separados por comas", "en csv", "formato csv"],
    },
    {
      format: "json",
      keywords: ["json", ".json", "en json", "formato json"],
    },
    {
      format: "txt",
      keywords: ["txt", "texto plano", "texto simple", ".txt", "en txt", "formato txt", "archivo de texto"],
    },
    {
      format: "md",
      keywords: ["markdown", ".md", "en markdown", "formato markdown", "archivo md"],
    },
  ];

  let bestMatch: FormatDetectionResult = { format: null, confidence: 0, matchedKeyword: "" };

  for (const { format, keywords } of patterns) {
    for (const kw of keywords) {
      if (msg.includes(kw)) {
        // Calcular confianza basada en longitud del keyword (más largo = más específico)
        const confidence = Math.min(0.99, 0.5 + kw.length / 50);
        if (confidence > bestMatch.confidence) {
          bestMatch = { format, confidence, matchedKeyword: kw };
        }
      }
    }
  }

  return bestMatch;
}
