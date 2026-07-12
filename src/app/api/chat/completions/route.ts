import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { ChatCompletionSchema, validate } from "@/lib/api/validation";
import { getIdentifier } from "@/lib/api/auth";

const OPENCODE_ENDPOINT = "https://opencode.ai/zen/go/v1/chat/completions";

// Algunos proveedores (Moonshot AI / Kimi) restringen temperature y top_p.
function normalizeModelParams(model: string, params: { temperature: number; max_tokens: number; top_p: number }) {
  const isKimi = /kimi/i.test(model);
  return {
    ...params,
    temperature: isKimi ? 1 : params.temperature,
    top_p: isKimi ? 0.95 : params.top_p,
  };
}

export async function POST(request: Request) {
  const rate = withRateLimit(getIdentifier(request, "chat:completions"), {
    windowMs: 60 * 1000,
    maxRequests: 30,
  });
  if (!rate.allowed) return rate.response;

  try {
    const apiKey = request.headers.get("x-api-key")?.trim();
    if (!apiKey || apiKey.length < 10) {
      return NextResponse.json({ error: "API key inválida o no proporcionada" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const validation = validate(ChatCompletionSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const payload = validation.data;
    const modelParams = normalizeModelParams(payload.model, {
      temperature: payload.temperature,
      max_tokens: payload.max_tokens,
      top_p: payload.top_p,
    });

    const upstreamResponse = await fetch(OPENCODE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Accept: payload.stream ? "text/event-stream" : "application/json",
      },
      body: JSON.stringify({
        model: payload.model,
        messages: payload.messages,
        ...modelParams,
        stream: payload.stream,
        // Pasar tools y tool_choice si vienen (function-calling nativo)
        ...(payload.tools ? { tools: payload.tools } : {}),
        ...(payload.tool_choice ? { tool_choice: payload.tool_choice } : {}),
      }),
    });

    if (!upstreamResponse.ok) {
      const text = await upstreamResponse.text().catch(() => "Unknown error");
      return NextResponse.json(
        { error: `OpenCode Go error ${upstreamResponse.status}: ${text}` },
        { status: upstreamResponse.status }
      );
    }

    // Si es streaming, reenviamos el cuerpo tal cual.
    if (payload.stream && upstreamResponse.body) {
      return new Response(upstreamResponse.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const data = (await upstreamResponse.json()) as unknown;
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
