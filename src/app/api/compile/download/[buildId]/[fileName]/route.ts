import { NextResponse } from "next/server";
import { buildManager } from "@/lib/compilation/BuildManager";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { getIdentifier } from "@/lib/api/auth";
import * as fs from "fs";
import * as path from "path";

interface RouteParams {
  params: Promise<{ buildId: string; fileName: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { buildId, fileName } = await params;
  const rate = withRateLimit(getIdentifier(request, `compile:download:${buildId}`), { windowMs: 60 * 1000, maxRequests: 30 });
  if (!rate.allowed) return rate.response;

  try {
    // Sanitizar fileName para evitar path traversal.
    const safeFileName = path.basename(fileName);
    if (safeFileName !== fileName) {
      return NextResponse.json({ error: "Nombre de archivo no válido" }, { status: 400 });
    }

    const artifactPath = buildManager.getArtifactPath(buildId, safeFileName);

    if (!artifactPath || !fs.existsSync(artifactPath)) {
      return NextResponse.json({ error: "Artefacto no encontrado" }, { status: 404 });
    }

    const resolvedArtifact = path.resolve(artifactPath);
    const buildsDir = path.resolve(buildManager["buildsDir"] || path.join(process.cwd(), "uploads", "builds"));
    if (!resolvedArtifact.startsWith(buildsDir)) {
      return NextResponse.json({ error: "Acceso no permitido" }, { status: 403 });
    }

    const file = fs.readFileSync(resolvedArtifact);
    const headers = new Headers();
    headers.set("Content-Disposition", `attachment; filename="${safeFileName}"`);
    headers.set("Content-Type", "application/octet-stream");

    return new NextResponse(file, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
