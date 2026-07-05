import { NextResponse } from "next/server";
import { integrationManager } from "@/lib/integrations/IntegrationManager";
import type { IntegrationSource } from "@/lib/integrations/types";

function getUserId(): string {
  // TODO: reemplazar por autenticación real (next-auth)
  return "user";
}

interface RouteParams {
  params: Promise<{ source: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const userId = getUserId();
    const { source } = await params;

    const resources = await integrationManager.listResources(
      userId,
      source as IntegrationSource
    );

    return NextResponse.json({ resources });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const userId = getUserId();
    const { source } = await params;
    const body = await request.json();
    const { resourceId } = body;

    if (!resourceId) {
      return NextResponse.json({ error: "resourceId es requerido" }, { status: 400 });
    }

    const resource = await integrationManager.addResource(
      userId,
      source as IntegrationSource,
      resourceId
    );

    return NextResponse.json({ resource });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
