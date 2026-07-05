// ==================== EXPORTAR REPORTES ====================
// Utilidades para descargar reportes en múltiples formatos.

import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export type ExportFormat = "markdown" | "pdf" | "html" | "txt" | "excel";

export function downloadMarkdown(content: string, filename = "reporte.md") {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  saveAs(blob, filename);
}

export function downloadText(content: string, filename = "reporte.txt") {
  const plain = markdownToPlainText(content);
  const blob = new Blob([plain], { type: "text/plain;charset=utf-8" });
  saveAs(blob, filename);
}

export function downloadHtml(content: string, filename = "reporte.html") {
  const html = markdownToHtml(content);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  saveAs(blob, filename);
}

export function downloadPdf(content: string, filename = "reporte.pdf") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const usableWidth = pageWidth - margin * 2;
  const lineHeight = 6; // mm por línea a fuente 11pt
  const linesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight);

  // Convertir el contenido a texto plano legible (sin símbolos de markdown)
  const plain = markdownToPlainText(content);

  doc.setFontSize(11);
  // Dividir cada línea respetando el ancho útil de página
  const wrapped: string[] = [];
  for (const rawLine of plain.split("\n")) {
    if (rawLine.trim() === "") {
      wrapped.push("");
      continue;
    }
    const split = doc.splitTextToSize(rawLine, usableWidth);
    for (const s of split) wrapped.push(s);
  }

  let y = margin;
  let lineCount = 0;
  for (const line of wrapped) {
    if (lineCount >= linesPerPage) {
      doc.addPage();
      y = margin;
      lineCount = 0;
    }
    // Líneas "vacías" solo avanzan el cursor
    if (line.trim() !== "") {
      doc.text(line, margin, y);
    }
    y += lineHeight;
    lineCount++;
  }

  doc.save(filename.replace(/\.md$/, ".pdf"));
}

// Convierte Markdown a texto plano legible, apto para PDF/TXT.
// Elimina símbolos de formato (#, **, *, `, |) manteniendo la estructura.
function markdownToPlainText(markdown: string): string {
  const lines = markdown.split("\n");

  const processed = lines.map((line) => {
    let l = line;

    // Separador de tabla (|---|---|) → se omite
    if (/^\s*\|?[\s:-]*-{3,}[\s:|-]*\|?\s*$/.test(l)) {
      return "";
    }

    // Encabezados: "## Título" → "TÍTULO" (sin símbolo, en mayúsculas para H1/H2)
    const headingMatch = l.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = cleanInline(headingMatch[2]);
      return level <= 2 ? text.toUpperCase() : text;
    }

    // Listas con "- " o "* " → viñeta "•  "
    l = l.replace(/^(\s*)[-*]\s+/, "$1•  ");

    // Blockquote: "> texto" → "" texto" (cita legible en texto plano)
    l = l.replace(/^>\s?/, '" ');

    // Listas numeradas "1. " se mantienen
    // Tabla: " | a | b | " → " a | b " (quita bordes laterales)
    if (l.trim().startsWith("|")) {
      const cells = l
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((c) => c.trim());
      return cells.join("  |  ");
    }

    // Bloques de código cercas (```) → se omiten
    if (/^\s*```/.test(l)) {
      return "";
    }

    return cleanInline(l);
  });

  // Compactar múltiples líneas vacías seguidas en una sola
  const result: string[] = [];
  let prevEmpty = false;
  for (const l of processed) {
    const isEmpty = l.trim() === "";
    if (isEmpty && prevEmpty) continue;
    result.push(l);
    prevEmpty = isEmpty;
  }

  return result.join("\n");
}

// Limpia formato inline: **bold**, *italic*, `code`, [text](url) → text
function cleanInline(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");
}

export function downloadExcelFromMarkdown(content: string, filename = "datos.xlsx") {
  const tables = extractMarkdownTables(content);
  const wb = XLSX.utils.book_new();

  if (tables.length === 0) {
    // Si no hay tablas, exportar como una hoja simple con el contenido
    const ws = XLSX.utils.aoa_to_sheet([[content]]);
    XLSX.utils.book_append_sheet(wb, ws, "Contenido");
  } else {
    tables.forEach((table, index) => {
      const ws = XLSX.utils.aoa_to_sheet(table);
      XLSX.utils.book_append_sheet(wb, ws, `Tabla ${index + 1}`);
    });
  }

  XLSX.writeFile(wb, filename.replace(/\.md$/, ".xlsx"));
}

function markdownToHtml(markdown: string): string {
  const lines = markdown.split("\n");
  const htmlParts: string[] = [];
  let i = 0;
  let inList = false;
  let inTable = false;

  const closeList = () => {
    if (inList) {
      htmlParts.push("</ul>");
      inList = false;
    }
  };
  const closeTable = () => {
    if (inTable) {
      htmlParts.push("</tbody></table>");
      inTable = false;
    }
  };

  while (i < lines.length) {
    let line = lines[i];
    const trimmed = line.trim();

    // Bloque de código cercado
    if (trimmed.startsWith("```")) {
      closeList();
      closeTable();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(lines[i]);
        i++;
      }
      htmlParts.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      i++;
      continue;
    }

    // Tabla: filas consecutivas que empiezan con |
    if (trimmed.startsWith("|")) {
      closeList();
      const cells = trimmed.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      // Separador de tabla (|---|---|)
      if (/^[-:\s|]+$/.test(trimmed)) {
        i++;
        continue;
      }
      if (!inTable) {
        htmlParts.push("<table><thead><tr>");
        htmlParts.push(cells.map((c) => `<th>${escapeHtml(c)}</th>`).join(""));
        htmlParts.push("</tr></thead><tbody>");
        inTable = true;
        // Saltar la siguiente línea si es separador
        if (i + 1 < lines.length && /^[-:\s|]+$/.test(lines[i + 1].trim())) i++;
        i++;
        continue;
      }
      htmlParts.push("<tr>" + cells.map((c) => `<td>${escapeHtml(c)}</td>`).join("") + "</tr>");
      i++;
      continue;
    }

    // Si llegamos aquí y estábamos en tabla, cerrarla
    closeTable();

    // Encabezados
    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      htmlParts.push(`<h${level}>${inlineHtml(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    // Línea horizontal
    if (/^[-*_]{3,}$/.test(trimmed)) {
      closeList();
      htmlParts.push("<hr>");
      i++;
      continue;
    }

    // Lista con viñeta
    const listMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (listMatch) {
      closeTable();
      if (!inList) {
        htmlParts.push("<ul>");
        inList = true;
      }
      htmlParts.push(`<li>${inlineHtml(listMatch[1])}</li>`);
      i++;
      continue;
    }

    // Lista numerada
    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      closeList();
      closeTable();
      htmlParts.push(`<p>• ${inlineHtml(orderedMatch[1])}</p>`);
      i++;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith(">")) {
      closeList();
      closeTable();
      htmlParts.push(`<blockquote>${inlineHtml(trimmed.replace(/^>\s?/, ""))}</blockquote>`);
      i++;
      continue;
    }

    // Línea vacía
    if (trimmed === "") {
      closeList();
      closeTable();
      i++;
      continue;
    }

    // Párrafo
    closeList();
    closeTable();
    htmlParts.push(`<p>${inlineHtml(trimmed)}</p>`);
    i++;
  }

  closeList();
  closeTable();

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Reporte</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 820px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #1a1a1a; }
    h1 { font-size: 1.9em; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; }
    h2 { font-size: 1.5em; margin-top: 1.4em; }
    h3 { font-size: 1.2em; margin-top: 1.2em; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; font-family: ui-monospace, monospace; }
    pre { background: #f6f6f6; padding: 12px; border-radius: 6px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid #d0d0d0; margin: 1em 0; padding-left: 12px; color: #555; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 0.92em; }
    th, td { border: 1px solid #d0d0d0; padding: 6px 10px; text-align: left; }
    th { background: #f0f0f0; }
    hr { border: none; border-top: 1px solid #e0e0e0; margin: 1.5em 0; }
    a { color: #2563eb; }
  </style>
</head>
<body>
  ${htmlParts.join("\n  ")}
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineHtml(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function extractMarkdownTables(markdown: string): string[][][] {
  const tables: string[][][] = [];
  const lines = markdown.split("\n");
  let currentTable: string[][] | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("|")) {
      const cells = trimmed
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c !== "");
      if (cells.length > 0) {
        if (!currentTable) currentTable = [];
        // Ignorar la línea separadora de tablas Markdown
        if (!/^[-:\s|]+$/.test(trimmed)) {
          currentTable.push(cells);
        }
      }
    } else {
      if (currentTable) {
        tables.push(currentTable);
        currentTable = null;
      }
    }
  }

  if (currentTable) tables.push(currentTable);
  return tables;
}

export function getFilenameForFormat(baseName: string, format: ExportFormat): string {
  const base = baseName.replace(/\.[^.]+$/, "");
  switch (format) {
    case "pdf":
      return `${base}.pdf`;
    case "html":
      return `${base}.html`;
    case "excel":
      return `${base}.xlsx`;
    case "txt":
      return `${base}.txt`;
    case "markdown":
    default:
      return `${base}.md`;
  }
}

export function exportReport(content: string, format: ExportFormat, baseName = "reporte") {
  const filename = getFilenameForFormat(baseName, format);
  switch (format) {
    case "pdf":
      downloadPdf(content, filename);
      break;
    case "html":
      downloadHtml(content, filename);
      break;
    case "excel":
      downloadExcelFromMarkdown(content, filename);
      break;
    case "txt":
      downloadText(content, filename);
      break;
    case "markdown":
    default:
      downloadMarkdown(content, filename);
      break;
  }
}
