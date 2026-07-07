// ==================== BROWSER SESSION ====================
// Sesión individual de Playwright para un usuario/conversación.

import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

export interface BrowserActionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  screenshot?: string; // base64
}

export interface DOMElement {
  id: number;
  tag: string;
  role?: string;
  name?: string;
  placeholder?: string;
  type?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  href?: string;
  interactive: boolean;
}

export interface BrowserSessionInfo {
  id: string;
  userId: string;
  url?: string;
  title?: string;
  createdAt: Date;
  lastActivityAt: Date;
  actions: string[];
}

export class BrowserSession {
  id: string;
  userId: string;
  private browser?: Browser;
  private context?: BrowserContext;
  private page?: Page;
  private closed = false;
  private timeoutMs: number;
  private timeoutHandle?: NodeJS.Timeout;
  private onExpire: () => void;
  private actionLog: string[] = [];
  createdAt: Date;
  lastActivityAt: Date;

  constructor(id: string, userId: string, options: { timeoutMs?: number; onExpire?: () => void } = {}) {
    this.id = id;
    this.userId = userId;
    this.timeoutMs = options.timeoutMs || 10 * 60 * 1000; // 10 minutos por defecto
    this.onExpire = options.onExpire || (() => {});
    this.createdAt = new Date();
    this.lastActivityAt = new Date();
  }

  async start(headless = true): Promise<void> {
    if (this.browser) return;
    this.browser = await chromium.launch({ headless });
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.0",
    });
    this.page = await this.context.newPage();
    this.resetTimeout();
  }

  async stop(): Promise<void> {
    this.closed = true;
    if (this.timeoutHandle) clearTimeout(this.timeoutHandle);
    try {
      await this.context?.close();
    } catch (error) {
      console.error("[BrowserSession] Error closing context:", error);
    }
    try {
      await this.browser?.close();
    } catch (error) {
      console.error("[BrowserSession] Error closing browser:", error);
    }
    this.context = undefined;
    this.page = undefined;
    this.browser = undefined;
  }

  isActive(): boolean {
    return !this.closed && !!this.page && !this.page.isClosed();
  }

  getInfo(): BrowserSessionInfo {
    return {
      id: this.id,
      userId: this.userId,
      url: this.page?.url(),
      title: this.page?.title ? undefined : undefined,
      createdAt: this.createdAt,
      lastActivityAt: this.lastActivityAt,
      actions: [...this.actionLog],
    };
  }

  private touch(): void {
    this.lastActivityAt = new Date();
    this.resetTimeout();
  }

  private resetTimeout(): void {
    if (this.timeoutHandle) clearTimeout(this.timeoutHandle);
    this.timeoutHandle = setTimeout(() => {
      console.log(`[BrowserSession] Session ${this.id} expired`);
      void this.stop();
      this.onExpire();
    }, this.timeoutMs);
  }

  private log(action: string): void {
    const entry = `${new Date().toISOString()} - ${action}`;
    this.actionLog.push(entry);
    if (this.actionLog.length > 200) this.actionLog.shift();
  }

  async navigate(url: string): Promise<BrowserActionResult> {
    if (!this.page) return { success: false, error: "Sesión no iniciada" };
    try {
      await this.page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      this.touch();
      this.log(`navigate ${url}`);
      return { success: true, data: { url: this.page.url(), title: await this.page.title() } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async click(x: number, y: number): Promise<BrowserActionResult> {
    if (!this.page) return { success: false, error: "Sesión no iniciada" };
    try {
      await this.page.mouse.click(x, y);
      this.touch();
      this.log(`click x=${x} y=${y}`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async clickBySelector(selector: string): Promise<BrowserActionResult> {
    if (!this.page) return { success: false, error: "Sesión no iniciada" };
    try {
      await this.page.click(selector);
      this.touch();
      this.log(`clickBySelector ${selector}`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async type(selector: string, text: string): Promise<BrowserActionResult> {
    if (!this.page) return { success: false, error: "Sesión no iniciada" };
    try {
      await this.page.fill(selector, text);
      this.touch();
      this.log(`type ${selector}="${text}"`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async scroll(direction: "up" | "down" | "left" | "right", amount = 300): Promise<BrowserActionResult> {
    if (!this.page) return { success: false, error: "Sesión no iniciada" };
    try {
      const deltas: Record<string, { x: number; y: number }> = {
        up: { x: 0, y: -amount },
        down: { x: 0, y: amount },
        left: { x: -amount, y: 0 },
        right: { x: amount, y: 0 },
      };
      const delta = deltas[direction] || deltas.down;
      await this.page.mouse.wheel(delta.x, delta.y);
      this.touch();
      this.log(`scroll ${direction} ${amount}`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async screenshot(): Promise<BrowserActionResult> {
    if (!this.page) return { success: false, error: "Sesión no iniciada" };
    try {
      const buffer = await this.page.screenshot({ type: "jpeg", quality: 80 });
      this.touch();
      this.log("screenshot");
      return { success: true, screenshot: buffer.toString("base64") };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async extractText(): Promise<BrowserActionResult> {
    if (!this.page) return { success: false, error: "Sesión no iniciada" };
    try {
      const text = await this.page.evaluate(() => document.body.innerText);
      this.touch();
      this.log("extractText");
      return { success: true, data: text };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async executeScript(script: string): Promise<BrowserActionResult> {
    if (!this.page) return { success: false, error: "Sesión no iniciada" };
    try {
      const result = await this.page.evaluate((code) => {
        return eval(code);
      }, script);
      this.touch();
      this.log("executeScript");
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async getDOMRepresentation(): Promise<BrowserActionResult> {
    if (!this.page) return { success: false, error: "Sesión no iniciada" };
    try {
      const elements = await this.page.evaluate(() => {
        const all = Array.from(document.querySelectorAll("*"));
        let idCounter = 0;
        const map = new Map<Element, number>();
        return all
          .filter((el) => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.left >= 0;
          })
          .map((el) => {
            const id = ++idCounter;
            map.set(el, id);
            const rect = el.getBoundingClientRect();
            const interactive = ["A", "BUTTON", "INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.getAttribute("role") === "button";
            return {
              id,
              tag: el.tagName.toLowerCase(),
              role: el.getAttribute("role") || undefined,
              name: el.getAttribute("aria-label") || (el as HTMLElement).innerText?.slice(0, 50) || undefined,
              placeholder: el.getAttribute("placeholder") || undefined,
              type: el.getAttribute("type") || undefined,
              x: Math.round(rect.left),
              y: Math.round(rect.top),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              text: (el as HTMLElement).innerText?.slice(0, 100) || undefined,
              href: el.getAttribute("href") || undefined,
              interactive,
            };
          });
      });
      this.touch();
      this.log("getDOMRepresentation");
      return { success: true, data: elements };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async runOAuthFlow(
    authUrl: string,
    callbackUrlPrefix: string,
    timeoutMs = 5 * 60 * 1000
  ): Promise<BrowserActionResult> {
    if (!this.page || !this.context) return { success: false, error: "Sesión no iniciada" };
    try {
      let capturedUrl: string | null = null;

      await this.context.route(`${callbackUrlPrefix}*`, async (route) => {
        capturedUrl = route.request().url();
        await route.fulfill({
          status: 200,
          contentType: "text/html; charset=utf-8",
          body: `<!doctype html><html><head><title>Conectado</title></head>
            <body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0a0a0a;color:#e5e5e5">
              <div style="text-align:center">
                <h2 style="margin:0 0 .5rem">✓ Conectado</h2>
                <p style="color:#9ca3af;margin:0">Puedes cerrar esta ventana.</p>
              </div>
              <script>setTimeout(()=>window.close(),1500);</script>
            </body></html>`,
        });
      });

      await this.page.goto(authUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      this.touch();
      this.log(`oauthFlow:navigate ${authUrl}`);

      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        if (capturedUrl) break;
        const current = this.page.url();
        if (current.startsWith(callbackUrlPrefix)) {
          capturedUrl = current;
          break;
        }
        await new Promise((r) => setTimeout(r, 400));
        this.touch();
      }

      if (!capturedUrl) {
        return {
          success: false,
          error: "Timeout esperando callback de OAuth en el navegador",
        };
      }

      const url = new URL(capturedUrl);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const errorParam = url.searchParams.get("error");

      if (errorParam) {
        return {
          success: false,
          error: `OAuth rechazado por el proveedor: ${errorParam}`,
        };
      }
      if (!code) {
        return { success: false, error: "No se recibió 'code' en el callback de OAuth" };
      }

      this.log(`oauthFlow:capture code`);
      return { success: true, data: { code, state, callbackUrl: capturedUrl } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
