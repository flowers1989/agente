import { NextResponse } from "next/server";
import { connectorManager } from "@/lib/integrations/ConnectorManager";
import { credentialManager } from "@/lib/integrations/managers/CredentialManager";
import { browserControlConnector } from "@/lib/browser/BrowserControlConnector";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { getIdentifier, getUserId } from "@/lib/api/auth";
import type { IntegrationSource } from "@/lib/integrations/types";

interface RouteParams {
  params: Promise<{ connector: string }>;
}

interface BrowserFlowBody {
  sessionId?: string;
  headless?: boolean;
  timeoutMs?: number;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { connector } = await params;
  const rate = withRateLimit(getIdentifier(request, `connectors:oauth-browser:${connector}`), {
    windowMs: 60 * 1000,
    maxRequests: 5,
  });
  if (!rate.allowed) return rate.response;

  try {
    const userId = getUserId();
    const source = connector as IntegrationSource;
    const body = (await request.json().catch(() => ({}))) as BrowserFlowBody;

    const appCreds = await credentialManager.getAppCredentials(source);
    const redirectUri = appCreds?.redirectUri;
    if (!redirectUri) {
      return NextResponse.json(
        {
          error:
            "No hay redirect URI configurado para este conector. Antes de usar el flujo por navegador configura OAuth (Client ID, Client Secret y Redirect URI).",
        },
        { status: 400 }
      );
    }

    const state = Buffer.from(`${userId}:${connector}:${Date.now()}`).toString("base64url");
    let authUrl: string;
    try {
      authUrl = await connectorManager.getOAuthUrl(userId, source, state);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "No se pudo construir la URL de OAuth" },
        { status: 400 }
      );
    }

    const timeoutMs = Math.min(Math.max(body.timeoutMs || 5 * 60 * 1000, 30 * 1000), 30 * 60 * 1000);
    const headless = body.headless !== undefined ? Boolean(body.headless) : false;

    let needsClose = false;
    let session = body.sessionId
      ? browserControlConnector.getSession(body.sessionId)
      : undefined;
    if (!session || !session.isActive() || !browserControlConnector.belongsToUser(body.sessionId || "", userId)) {
      try {
        session = await browserControlConnector.createSession(userId, {
          timeoutMs: timeoutMs + 60 * 1000,
          headless,
        });
        needsClose = true;
      } catch (error) {
        return NextResponse.json(
          {
            error:
              "No se pudo abrir una sesión de navegador para el flujo OAuth. " +
              (error instanceof Error ? error.message : ""),
            hint: "Ejecuta `npx playwright install chromium` y asegúrate de tener una sesión gráfica (DISPLAY) si usas headless=false.",
          },
          { status: 500 }
        );
      }
    }

    const result = await session.runOAuthFlow(authUrl, redirectUri, timeoutMs);

    if (needsClose) {
      void browserControlConnector.closeSession(session.id);
    }

    if (!result.success || !result.data) {
      return NextResponse.json({ success: false, error: result.error || "Flujo OAuth fallido" }, { status: 502 });
    }

    const data = result.data as { code: string; state?: string | null };
    await connectorManager.handleOAuthCallback(source, data.code, userId);

    return NextResponse.json({ success: true, source });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}