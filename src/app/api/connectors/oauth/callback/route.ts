import { NextResponse } from "next/server";
import { connectorManager } from "@/lib/integrations/ConnectorManager";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { getIdentifier, getUserId } from "@/lib/api/auth";
import type { IntegrationSource } from "@/lib/integrations/types";

interface ParsedState {
  userId: string;
  source: string;
  nonce: string;
}

function parseState(state: string | null): ParsedState | null {
  if (!state) return null;
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const [userId, source, nonce] = decoded.split(":");
    if (!userId || !source) return null;
    return { userId, source, nonce: nonce ?? "" };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const rate = withRateLimit(getIdentifier(request, "connectors:oauth-callback"), { windowMs: 60 * 1000, maxRequests: 30 });
  if (!rate.allowed) return rate.response;

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const sourceParam = searchParams.get("source");

    if (!code) {
      return NextResponse.json({ error: "code es requerido" }, { status: 400 });
    }

    const parsed = parseState(state);
    const source = (parsed?.source || sourceParam) as IntegrationSource | null;

    if (!source) {
      return NextResponse.json(
        { error: "No se pudo determinar el conector: state inválido y source ausente" },
        { status: 400 }
      );
    }

    const userId = parsed?.userId || getUserId();

    await connectorManager.handleOAuthCallback(source, code, userId);

    const html = `<!doctype html><html><head><title>Conexión exitosa</title></head>
      <body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0a0a0a;color:#e5e5e5">
        <div style="text-align:center">
          <h2 style="margin:0 0 .5rem">✓ Conexión exitosa</h2>
          <p style="color:#9ca3af;margin:0">Puedes cerrar esta ventana.</p>
        </div>
        <script>window.setTimeout(function(){window.close()},1500);</script>
      </body></html>`;

    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    const html = `<!doctype html><html><body style="font-family:system-ui;background:#0a0a0a;color:#fecaca;padding:2rem">
      <h2>Error al conectar</h2><pre>${message}</pre></body></html>`;
    return new NextResponse(html, {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}