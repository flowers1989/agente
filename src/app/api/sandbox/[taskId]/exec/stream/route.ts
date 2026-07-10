// ==================== SANDBOX EXEC SSE STREAM ====================
// Ejecuta un comando en el sandbox y transmite stdout/stderr en vivo vía SSE.
// El cliente consume con EventSource o fetch + ReadableStream:
//
//   const res = await fetch(`/api/sandbox/${taskId}/exec/stream`, {
//     method: "POST",
//     body: JSON.stringify({ command: "ls -la", timeoutMs: 30000 }),
//   });
//   const reader = res.body!.getReader();
//   // parser SSE línea por línea...

import { getSandboxManager } from "@/lib/sandbox/SandboxManager";
import { getUserId } from "@/lib/api/auth";

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { taskId } = await params;
  const userId = getUserId();
  const manager = getSandboxManager();

  if (!manager.belongsToUser(taskId, userId)) {
    return new Response(JSON.stringify({ error: "Sandbox no encontrado" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { command?: string; timeoutMs?: number; cwd?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.command || typeof body.command !== "string") {
    return new Response(JSON.stringify({ error: "command es requerido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const timeoutMs = Math.min(Math.max(body.timeoutMs ?? 30000, 1000), 300000);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      try {
        send("start", { taskId, command: body.command, at: new Date().toISOString() });

        const result = await manager.execStream(taskId, body.command!, {
          timeoutMs,
          cwd: body.cwd,
          onStdout: (text) => send("stdout", { text }),
          onStderr: (text) => send("stderr", { text }),
        });

        send("done", {
          exitCode: result.exitCode,
          durationMs: result.durationMs,
          timedOut: result.timedOut,
        });
      } catch (err) {
        send("error", {
          message: err instanceof Error ? err.message : "Error desconocido",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // desactivar buffering en nginx/Caddy
    },
  });
}
