import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { getIdentifier } from "@/lib/api/auth";
import { validate } from "@/lib/api/validation";
import { z } from "zod";
import {
  generateDocument,
  detectDocumentFormat,
  type DocumentFormat,
} from "@/lib/services/document-generator";

// ==================== DOCUMENT GENERATION API ====================
// POST /api/documents/generate
// Genera un documento en el formato especificado (pdf, docx, xlsx, pptx, html, csv, json, txt, md)
// y lo devuelve como descarga binaria.

const GenerateSchema = z.object({
  content: z.string().min(1).max(500000),
  format: z
    .enum(["pdf", "docx", "xlsx", "pptx", "html", "csv", "json", "txt", "md"])
    .optional(),
  // Si no se pasa format, se detecta del userMessage
  userMessage: z.string().max(2000).optional(),
  title: z.string().max(200).optional(),
  author: z.string().max(200).optional(),
  subject: z.string().max(500).optional(),
  filename: z.string().max(200).optional(),
  sheetName: z.string().max(100).optional(),
  slideTheme: z.enum(["light", "dark", "corporate"]).optional(),
});

export async function POST(request: Request) {
  const rate = withRateLimit(getIdentifier(request, "doc:generate"), {
    windowMs: 60 * 1000,
    maxRequests: 20,
  });
  if (!rate.allowed) return rate.response;

  const body = await request.json().catch(() => ({}));
  const validation = validate(GenerateSchema, body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { content, format, userMessage, title, author, subject, filename, sheetName, slideTheme } =
    validation.data;

  // Determinar formato
  let finalFormat: DocumentFormat;
  if (format) {
    finalFormat = format;
  } else if (userMessage) {
    const detection = detectDocumentFormat(userMessage);
    if (!detection.format) {
      return NextResponse.json(
        {
          error:
            "No se pudo detectar el formato. Especifica uno: pdf, docx, xlsx, pptx, html, csv, json, txt, md",
        },
        { status: 400 }
      );
    }
    finalFormat = detection.format;
  } else {
    return NextResponse.json(
      { error: "Debes especificar 'format' o 'userMessage' para detectarlo" },
      { status: 400 }
    );
  }

  try {
    const doc = await generateDocument(finalFormat, content, {
      title,
      author,
      subject,
      filename,
      sheetName,
      slideTheme,
    });

    // Devolver como binario descargable
    return new NextResponse(doc.buffer, {
      status: 200,
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Disposition": `attachment; filename="${doc.filename}"`,
        "Content-Length": doc.size.toString(),
        "X-Document-Format": doc.format,
        "X-Document-Filename": doc.filename,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("[documents/generate] Error:", message);
    return NextResponse.json({ error: `Error generando documento: ${message}` }, { status: 500 });
  }
}

// GET /api/documents/generate?detect=... — solo detecta formato sin generar
export async function GET(request: Request) {
  const rate = withRateLimit(getIdentifier(request, "doc:detect"), {
    windowMs: 60 * 1000,
    maxRequests: 60,
  });
  if (!rate.allowed) return rate.response;

  const { searchParams } = new URL(request.url);
  const msg = searchParams.get("detect") || "";
  if (!msg) {
    return NextResponse.json({
      formats: ["pdf", "docx", "xlsx", "pptx", "html", "csv", "json", "txt", "md"],
    });
  }

  const detection = detectDocumentFormat(msg);
  return NextResponse.json(detection);
}
