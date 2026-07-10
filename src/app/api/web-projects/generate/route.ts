import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { getIdentifier } from "@/lib/api/auth";
import { validate } from "@/lib/api/validation";
import { z } from "zod";
import {
  generateWebProject,
  detectFramework,
  listWebFrameworks,
  type WebFramework,
} from "@/lib/services/web-project-generator";

// ==================== WEB PROJECT GENERATION API ====================
// POST /api/web-projects/generate
// Genera un proyecto web completo con framework moderno (Next.js, Vite, Vue, Astro, SvelteKit)

const GenerateSchema = z.object({
  projectName: z.string().min(1).max(100),
  framework: z
    .enum(["nextjs", "vite-react", "vite-vue", "astro", "sveltekit"])
    .optional(),
  // Si no se pasa framework, se detecta del userMessage
  userMessage: z.string().max(2000).optional(),
  description: z.string().max(500).optional(),
  projectType: z
    .enum(["landing", "dashboard", "blog", "ecommerce", "portfolio", "admin", "custom"])
    .optional(),
  styling: z.enum(["tailwind", "css-modules", "styled-components", "plain-css"]).optional(),
  features: z.array(z.string()).optional(),
  customCode: z.string().max(500000).optional(),
  typescript: z.boolean().optional(),
});

export async function POST(request: Request) {
  const rate = withRateLimit(getIdentifier(request, "web:generate"), {
    windowMs: 60 * 1000,
    maxRequests: 10,
  });
  if (!rate.allowed) return rate.response;

  const body = await request.json().catch(() => ({}));
  const validation = validate(GenerateSchema, body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { framework, userMessage, ...rest } = validation.data;

  // Determinar framework
  let finalFramework: WebFramework;
  if (framework) {
    finalFramework = framework;
  } else if (userMessage) {
    finalFramework = detectFramework(userMessage);
  } else {
    finalFramework = "vite-react"; // default
  }

  try {
    const project = await generateWebProject({
      ...rest,
      framework: finalFramework,
    });

    return NextResponse.json({
      projectId: project.projectId,
      projectPath: project.projectPath,
      framework: project.framework,
      frameworkLabel: listWebFrameworks().find((f) => f.id === project.framework)?.label,
      filesCount: project.files.length,
      installCommand: project.installCommand,
      devCommand: project.devCommand,
      buildCommand: project.buildCommand,
      devPort: project.devPort,
      files: project.files.map((f) => ({ path: f.path, size: f.content.length })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("[web-projects/generate] Error:", message);
    return NextResponse.json({ error: `Error generando proyecto: ${message}` }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    frameworks: listWebFrameworks(),
  });
}
