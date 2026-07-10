import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { getIdentifier } from "@/lib/api/auth";
import { getBuildService } from "@/lib/services/build-service";
import { readFileSync, existsSync } from "fs";

// ==================== BUILD JOB STATUS & DOWNLOAD ====================
// GET /api/build/jobs/:jobId → estado del job
// GET /api/build/jobs/:jobId?download=binaries → descargar ZIP de binarios
// GET /api/build/jobs/:jobId?download=source → descargar ZIP de código fuente

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { jobId } = await params;
  const rate = withRateLimit(getIdentifier(request, `build:${jobId}`), {
    windowMs: 60 * 1000,
    maxRequests: 60,
  });
  if (!rate.allowed) return rate.response;

  const service = getBuildService();
  const job = service.getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Trabajo no encontrado" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const download = searchParams.get("download");

  if (download === "binaries" && job.zipPath && existsSync(job.zipPath)) {
    const buffer = readFileSync(job.zipPath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${jobId}-binaries.zip"`,
      },
    });
  }

  if (download === "source" && job.sourceCodeZipPath && existsSync(job.sourceCodeZipPath)) {
    const buffer = readFileSync(job.sourceCodeZipPath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${jobId}-source.zip"`,
      },
    });
  }

  // Si pide descargar pero no hay archivo
  if (download && (!job.zipPath || !existsSync(job.zipPath))) {
    return NextResponse.json({
      error: `Archivo no disponible. Estado del job: ${job.status}`,
      jobStatus: job.status,
      results: job.results.map((r) => ({ platform: r.platform, status: r.status })),
    }, { status: 404 });
  }

  // Devolver estado del job
  return NextResponse.json({
    jobId: job.jobId,
    status: job.status,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    results: job.results,
    totalSize: job.totalSize,
    previewUrl: job.previewUrl,
    hasBinaries: !!job.zipPath,
    hasSourceCode: !!job.sourceCodeZipPath,
    error: job.error,
  });
}
