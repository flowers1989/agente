import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api/rate-limit-helper";
import { getIdentifier } from "@/lib/api/auth";

// ==================== ENDPOINT: /api/media/generate-image ====================
// Genera imágenes usando el proveedor disponible (OpenAI DALL-E o fallback SVG).
// Acepta: { prompt, style?, size?, quality? }
// Devuelve: { url?, base64?, provider, prompt }

type ImageSize = "256x256" | "512x512" | "1024x1024" | "1792x1024" | "1024x1792";
type ImageQuality = "standard" | "hd";

interface GenerateImageRequest {
  prompt: string;
  style?: "realistic" | "artistic" | "cartoon" | "sketch" | "minimal";
  size?: ImageSize;
  quality?: ImageQuality;
}

// Mapa de estilos a instrucciones para el prompt
const STYLE_MODIFIERS: Record<string, string> = {
  realistic: "photorealistic, high detail, professional photography",
  artistic: "artistic, painterly, expressive brushstrokes",
  cartoon: "cartoon style, flat colors, clean lines",
  sketch: "pencil sketch, black and white, hand-drawn",
  minimal: "minimalist, clean, simple shapes, flat design",
};

export async function POST(request: Request) {
  const rate = withRateLimit(getIdentifier(request, "media:generate-image"), {
    windowMs: 60 * 1000,
    maxRequests: 10,
  });
  if (!rate.allowed) return rate.response;

  try {
    const body = (await request.json().catch(() => ({}))) as Partial<GenerateImageRequest>;
    const { prompt, style = "realistic", size = "1024x1024", quality = "standard" } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
      return NextResponse.json({ error: "Parámetro 'prompt' requerido (mínimo 3 caracteres)" }, { status: 400 });
    }

    const styleModifier = STYLE_MODIFIERS[style] || STYLE_MODIFIERS.realistic;
    const enhancedPrompt = `${prompt.trim()}, ${styleModifier}`;

    // Intentar con OpenAI DALL-E si hay API key disponible
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      try {
        const dalleRes = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: enhancedPrompt,
            n: 1,
            size,
            quality,
            response_format: "url",
          }),
        });

        if (dalleRes.ok) {
          const dalleData = (await dalleRes.json()) as {
            data: { url: string; revised_prompt?: string }[];
          };
          const imageUrl = dalleData.data?.[0]?.url;
          const revisedPrompt = dalleData.data?.[0]?.revised_prompt;
          if (imageUrl) {
            return NextResponse.json({
              url: imageUrl,
              provider: "dall-e-3",
              prompt: revisedPrompt || enhancedPrompt,
              style,
              size,
            });
          }
        }
      } catch {
        // Continuar con fallback
      }
    }

    // Fallback: generar un SVG placeholder descriptivo
    const svgContent = generateDescriptiveSVG(prompt, style);
    const base64 = Buffer.from(svgContent).toString("base64");
    const dataUrl = `data:image/svg+xml;base64,${base64}`;

    return NextResponse.json({
      url: dataUrl,
      base64,
      provider: "svg-fallback",
      prompt: enhancedPrompt,
      style,
      size,
      note: "Imagen generada como SVG placeholder. Configura OPENAI_API_KEY para imágenes reales con DALL-E.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Genera un SVG descriptivo como placeholder cuando no hay proveedor real disponible.
 */
function generateDescriptiveSVG(prompt: string, style: string): string {
  const truncated = prompt.slice(0, 60);
  const colors: Record<string, string[]> = {
    realistic: ["#2d3748", "#4a5568", "#718096"],
    artistic: ["#553c9a", "#b794f4", "#e9d8fd"],
    cartoon: ["#3182ce", "#63b3ed", "#bee3f8"],
    sketch: ["#1a202c", "#4a5568", "#e2e8f0"],
    minimal: ["#1a202c", "#e2e8f0", "#a0aec0"],
  };
  const [bg, accent, text] = colors[style] || colors.realistic;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="${bg}"/>
  <rect x="80" y="80" width="864" height="864" rx="24" fill="none" stroke="${accent}" stroke-width="2" stroke-dasharray="12,6"/>
  <circle cx="512" cy="380" r="120" fill="${accent}" opacity="0.3"/>
  <polygon points="512,280 592,420 432,420" fill="${accent}" opacity="0.6"/>
  <rect x="312" y="500" width="400" height="8" rx="4" fill="${accent}" opacity="0.4"/>
  <rect x="362" y="530" width="300" height="8" rx="4" fill="${accent}" opacity="0.3"/>
  <text x="512" y="640" text-anchor="middle" font-family="system-ui,sans-serif" font-size="18" fill="${text}" opacity="0.9">${escapeXml(truncated)}</text>
  <text x="512" y="680" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" fill="${text}" opacity="0.5">Estilo: ${style}</text>
  <text x="512" y="960" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="${text}" opacity="0.3">Agente IA — Image Generation</text>
</svg>`;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
