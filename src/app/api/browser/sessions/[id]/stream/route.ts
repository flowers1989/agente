import { browserControlConnector } from "@/lib/browser/BrowserControlConnector";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { getIdentifier, getUserId } from "@/lib/api/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const rate = withRateLimit(getIdentifier(request, `browser:session:${id}:stream`), { windowMs: 60 * 1000, maxRequests: 60 });
  if (!rate.allowed) return rate.response;

  const userId = getUserId();
  if (!browserControlConnector.belongsToUser(id, userId)) {
    return new Response("Sesión no encontrada", { status: 404 });
  }

  const session = browserControlConnector.getSession(id);
  if (!session || !session.isActive()) {
    return new Response("Sesión no encontrada", { status: 404 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode("event: connected\ndata: {}\n\n"));

      let active = true;
      request.signal.addEventListener("abort", () => {
        active = false;
        controller.close();
      });

      while (active) {
        try {
          const result = await session.screenshot();
          if (result.success && result.screenshot) {
            const payload = JSON.stringify({ screenshot: result.screenshot, timestamp: Date.now() });
            controller.enqueue(encoder.encode(`event: screenshot\ndata: ${payload}\n\n`));
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: message })}\n\n`));
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Connection: "keep-alive",
    },
  });
}
