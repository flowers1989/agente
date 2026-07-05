import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { getIdentifier } from "@/lib/api/auth";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".json": "application/json",
  ".js": "application/javascript",
  ".ts": "application/typescript",
  ".tsx": "application/typescript",
  ".html": "text/html",
  ".css": "text/css",
};

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

interface RouteParams {
  params: Promise<{ path: string[] }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const rate = withRateLimit(getIdentifier(request, "uploads:serve"), { windowMs: 60 * 1000, maxRequests: 120 });
  if (!rate.allowed) return rate.response;

  try {
    const { path: pathSegments } = await params;
    const filename = pathSegments.join("/");
    const uploadDir = process.env.UPLOAD_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), "upload");
    const filePath = path.join(uploadDir, filename);

    const resolvedPath = path.resolve(filePath);
    const resolvedUploadDir = path.resolve(uploadDir);
    if (!resolvedPath.startsWith(resolvedUploadDir)) {
      return NextResponse.json({ error: "Acceso no permitido" }, { status: 403 });
    }

    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    const stats = fs.statSync(resolvedPath);
    if (!stats.isFile()) {
      return NextResponse.json({ error: "Ruta no válida" }, { status: 400 });
    }

    const fileBuffer = fs.readFileSync(resolvedPath);
    const contentType = getContentType(resolvedPath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
