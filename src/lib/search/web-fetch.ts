// ==================== WEB FETCH (server-side) ====================
// Descarga el HTML de una URL y lo convierte en texto limpio legible para el LLM.
// También extrae título, meta description y enlaces relevantes.

export interface WebFetchResult {
  url: string;
  finalUrl: string;
  status: number;
  title: string;
  description: string;
  text: string;
  links: Array<{ text: string; href: string }>;
  contentLength: number;
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_TEXT_LENGTH = 20000;
const MAX_LINKS = 50;

export async function fetchUrl(url: string, options: { timeoutMs?: number } = {}): Promise<WebFetchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 20000);

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("URL debe ser http o https");
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml,text/plain,application/json,*/*;q=0.8",
        "Accept-Language": "es,es-ES;q=0.9,en;q=0.8",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    const finalUrl = response.url || url;
    const status = response.status;
    const contentType = response.headers.get("content-type") || "";

    let raw: string;
    if (contentType.includes("application/json")) {
      raw = await response.text();
      return {
        url,
        finalUrl,
        status,
        title: parsed.pathname.slice(-50) || parsed.hostname,
        description: "",
        text: raw.slice(0, MAX_TEXT_LENGTH),
        links: [],
        contentLength: raw.length,
      };
    }
    if (contentType.includes("text/plain")) {
      raw = await response.text();
      return {
        url,
        finalUrl,
        status,
        title: parsed.hostname,
        description: "",
        text: raw.slice(0, MAX_TEXT_LENGTH),
        links: [],
        contentLength: raw.length,
      };
    }

    raw = await response.text();

    const titleMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const descMatch = raw.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    const title = titleMatch ? stripTags(titleMatch[1]).trim() : parsed.hostname;
    const description = descMatch ? descMatch[1].trim() : "";

    const links = extractLinks(raw, finalUrl);
    const text = htmlToText(raw).slice(0, MAX_TEXT_LENGTH);

    return {
      url,
      finalUrl,
      status,
      title,
      description,
      text,
      links,
      contentLength: raw.length,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function htmlToText(html: string): string {
  // Quitar scripts, styles, svg, noscript
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "");

  // Convertir saltos de línea de bloque en nueva línea
  cleaned = cleaned.replace(/<\/(p|div|section|article|header|footer|nav|li|h[1-6]|tr|table|br)>/gi, "\n");
  cleaned = cleaned.replace(/<br\s*\/?>/gi, "\n");

  // Quitar el resto de tags
  cleaned = cleaned.replace(/<[^>]+>/g, "");

  // Entidades HTML comunes
  cleaned = cleaned
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&hellip;/g, "...")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–");

  return cleaned
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

export function extractLinks(html: string, baseUrl: string): Array<{ text: string; href: string }> {
  const links: Array<{ text: string; href: string }> = [];
  const re = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && links.length < MAX_LINKS) {
    const href = m[1];
    if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:")) continue;
    let resolved: string;
    try {
      resolved = new URL(href, baseUrl).toString();
    } catch {
      continue;
    }
    const text = stripTags(m[2]).slice(0, 120);
    if (!text) continue;
    links.push({ text, href: resolved });
  }
  return links;
}