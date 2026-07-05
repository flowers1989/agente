// ==================== BÚSQUEDA WEB ====================
// Lógica de búsqueda web reutilizable (servidor). Usada por el endpoint
// /api/search y por el ToolRegistry cuando el orquestador corre en backend.

import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

const DUCKDUCKGO_URL = "https://html.duckduckgo.com/html/";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function searchWeb(query: string, limit: number): Promise<SearchResult[]> {
  // 1. Intentar Brave Search API si hay API key configurada
  const braveKey = process.env.BRAVE_API_KEY;
  if (braveKey) {
    try {
      const results = await searchBrave(query, limit, braveKey);
      if (results.length > 0) return results;
    } catch (error) {
      console.warn("[Search] Brave Search failed:", error);
    }
  }

  // 2. Bing vía Playwright (funciona sin API key y es más estable que DuckDuckGo)
  try {
    const results = await searchBingBrowser(query, limit);
    if (results.length > 0) return results;
  } catch (error) {
    console.warn("[Search] Bing browser failed:", error);
  }

  // 3. Intentar DuckDuckGo vía HTTP
  try {
    const results = await searchDuckDuckGoHttp(query, limit);
    if (results.length > 0) return results;
  } catch (error) {
    console.warn("[Search] DuckDuckGo HTTP failed:", error);
  }

  // 4. DuckDuckGo vía Playwright como último recurso
  return searchDuckDuckGoBrowser(query, limit);
}

async function searchBrave(query: string, limit: number, apiKey: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q: query, count: String(limit) });
  const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Brave Search error ${response.status}`);
  }

  const data = (await response.json()) as { web?: { results?: Array<{ title: string; url: string; description: string }> } };
  return (data.web?.results || []).map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.description,
  }));
}

async function searchDuckDuckGoHttp(query: string, limit: number): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q: query, kl: "us-en" });
  const response = await fetch(`${DUCKDUCKGO_URL}?${params.toString()}`, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo error ${response.status}`);
  }

  const html = await response.text();
  if (html.includes("anomaly-modal") || html.includes("Unfortunately, bots use DuckDuckGo too")) {
    throw new Error("DuckDuckGo CAPTCHA detected");
  }

  const results = parseDuckDuckGoResults(html, limit);
  if (results.length === 0) {
    throw new Error("No DuckDuckGo results");
  }
  return results;
}

async function searchDuckDuckGoBrowser(query: string, limit: number): Promise<SearchResult[]> {
  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  let page: Page | undefined;

  try {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: USER_AGENT,
    });
    page = await context.newPage();

    const params = new URLSearchParams({ q: query, kl: "us-en" });
    await page.goto(`${DUCKDUCKGO_URL}?${params.toString()}`, { waitUntil: "domcontentloaded", timeout: 30000 });

    await page.waitForTimeout(2000);

    const html = await page.content();
    if (html.includes("anomaly-modal") || html.includes("Unfortunately, bots use DuckDuckGo too")) {
      throw new Error("DuckDuckGo CAPTCHA detected via browser");
    }

    const results = parseDuckDuckGoResults(html, limit);
    if (results.length === 0) {
      throw new Error("No DuckDuckGo results via browser");
    }
    return results;
  } finally {
    await page?.close().catch(() => {});
    await context?.close().catch(() => {});
    await browser?.close().catch(() => {});
  }
}

async function searchBingBrowser(query: string, limit: number): Promise<SearchResult[]> {
  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  let page: Page | undefined;

  try {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: USER_AGENT,
    });
    page = await context.newPage();

    const params = new URLSearchParams({ q: query });
    await page.goto(`https://www.bing.com/search?${params.toString()}`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await page.waitForTimeout(3000);

    const results = await page.evaluate((maxResults) => {
      const items: Array<{ title: string; url: string; snippet: string }> = [];
      const blocks = document.querySelectorAll(".b_algo");
      blocks.forEach((block) => {
        if (items.length >= maxResults) return;
        const titleEl = block.querySelector("h2 a");
        const snippetEl = block.querySelector("p");
        if (titleEl) {
          items.push({
            title: titleEl.textContent || "",
            url: (titleEl as HTMLAnchorElement).href || "",
            snippet: snippetEl?.textContent || "",
          });
        }
      });
      return items;
    }, limit);

    if (results.length === 0) {
      throw new Error("No Bing results via browser");
    }

    return results.map((r) => ({
      ...r,
      url: decodeBingUrl(r.url),
    }));
  } finally {
    await page?.close().catch(() => {});
    await context?.close().catch(() => {});
    await browser?.close().catch(() => {});
  }
}

export function parseDuckDuckGoResults(html: string, limit: number): SearchResult[] {
  const results: SearchResult[] = [];
  const blocks = html.split(/<div class="result(?:\s+[^"]*)?"[^>]*>/i).slice(1);

  for (const block of blocks) {
    if (results.length >= limit) break;

    const titleMatch = block.match(/<a[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>/);
    const urlMatch = block.match(/<a[^>]*class="result__a"[^>]*href="([^"]+)"/);
    const snippetMatch = block.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);

    if (titleMatch && urlMatch) {
      const rawUrl = urlMatch[1];
      const url = decodeDuckDuckGoUrl(rawUrl);
      results.push({
        title: stripHtml(titleMatch[1]),
        url,
        snippet: snippetMatch ? stripHtml(snippetMatch[1]) : "",
      });
    }
  }

  return results;
}

export function decodeBingUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const encoded = parsed.searchParams.get("u");
    if (encoded && encoded.length > 2) {
      const base64 = encoded.slice(2);
      const decoded = Buffer.from(base64, "base64").toString("utf-8");
      if (decoded.startsWith("http")) return decoded;
    }
  } catch {
    // Ignore decoding errors
  }
  return url;
}

function decodeDuckDuckGoUrl(url: string): string {
  try {
    const cleanUrl = url.replace(/&amp;/g, "&");
    const parsed = new URL(cleanUrl.startsWith("http") ? cleanUrl : `https:${cleanUrl}`);
    const realUrl = parsed.searchParams.get("uddg");
    if (realUrl) return decodeURIComponent(realUrl);
  } catch {
    // Ignore decoding errors
  }
  return url;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
