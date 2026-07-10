import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { getIdentifier } from "@/lib/api/auth";
import { validate } from "@/lib/api/validation";
import { z } from "zod";
import { getBuildService } from "@/lib/services/build-service";

// ==================== BUILD API ====================
// POST /api/build/jobs
// Crea y ejecuta un trabajo de compilación multiplataforma.
// Soporta: android, ios, android-tv, windows, macos, linux, web

const CreateBuildSchema = z.object({
  projectName: z.string().min(1).max(100),
  projectType: z.enum(["web", "mobile", "desktop", "hybrid"]),
  targetPlatforms: z.array(
    z.enum(["android", "ios", "android-tv", "windows", "macos", "linux", "web"])
  ).min(1),
  buildType: z.enum(["debug", "release"]).optional(),
  includeSourceCode: z.boolean().optional(),
  sourceCode: z.string().max(500000).optional(),
  packageName: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  version: z.string().max(20).optional(),
  features: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  const rate = withRateLimit(getIdentifier(request, "build:create"), {
    windowMs: 60 * 1000,
    maxRequests: 5, // builds son costosos
  });
  if (!rate.allowed) return rate.response;

  const body = await request.json().catch(() => ({}));
  const validation = validate(CreateBuildSchema, body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const service = getBuildService();
  const job = await service.createBuildJob({
    projectId: `build-${Date.now()}`,
    projectName: validation.data.projectName,
    projectType: validation.data.projectType,
    targetPlatforms: validation.data.targetPlatforms,
    buildType: validation.data.buildType,
    includeSourceCode: validation.data.includeSourceCode,
    sourceCode: validation.data.sourceCode,
    packageName: validation.data.packageName,
    description: validation.data.description,
    version: validation.data.version,
    features: validation.data.features,
  });

  // Ejecutar en background (no bloquear la respuesta)
  service.executeBuildJob(job.jobId).catch((err) => {
    console.error(`[build/jobs] Error en job ${job.jobId}:`, err);
  });

  return NextResponse.json({
    jobId: job.jobId,
    status: job.status,
    message: "Compilación iniciada. Usa GET /api/build/jobs/:jobId para verificar el estado.",
  });
}

export async function GET(request: Request) {
  const rate = withRateLimit(getIdentifier(request, "build:list"), {
    windowMs: 60 * 1000,
    maxRequests: 30,
  });
  if (!rate.allowed) return rate.response;

  const service = getBuildService();
  return NextResponse.json({ jobs: service.listJobs() });
}
