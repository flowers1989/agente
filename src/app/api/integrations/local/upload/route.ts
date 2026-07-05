import { NextResponse } from "next/server";
import { integrationManager } from "@/lib/integrations/IntegrationManager";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { getIdentifier, getUserId } from "@/lib/api/auth";

const MAX_FILE_SIZE_MB = 50;

export async function POST(request: Request) {
  const rate = withRateLimit(getIdentifier(request, "integrations:upload"), { windowMs: 60 * 1000, maxRequests: 20 });
  if (!rate.allowed) return rate.response;

  try {
    const userId = getUserId();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "file es requerido" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `El archivo excede el límite de ${MAX_FILE_SIZE_MB}MB` }, { status: 413 });
    }

    const resource = await integrationManager.uploadLocalFile(userId, file);
    return NextResponse.json({ resource });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
