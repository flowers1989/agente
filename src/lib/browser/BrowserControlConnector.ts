// ==================== BROWSER CONTROL CONNECTOR ====================
// Orquesta sesiones de Playwright para control de navegador.

import { BrowserSession, type BrowserActionResult, type BrowserSessionInfo } from "./BrowserSession";

export class BrowserControlConnector {
  private sessions = new Map<string, BrowserSession>();

  async createSession(userId: string, options: { timeoutMs?: number } = {}): Promise<BrowserSession> {
    const id = `browser-${userId}-${Date.now()}`;
    const session = new BrowserSession(id, userId, {
      ...options,
      onExpire: () => this.sessions.delete(id),
    });
    await session.start();
    this.sessions.set(id, session);
    return session;
  }

  getSession(sessionId: string): BrowserSession | undefined {
    return this.sessions.get(sessionId);
  }

  belongsToUser(sessionId: string, userId: string): boolean {
    const session = this.sessions.get(sessionId);
    return Boolean(session && session.userId === userId);
  }

  async getOrCreateSession(userId: string, sessionId?: string): Promise<BrowserSession> {
    if (sessionId) {
      const existing = this.getSession(sessionId);
      if (existing && existing.isActive()) return existing;
    }
    return this.createSession(userId);
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      await session.stop();
      this.sessions.delete(sessionId);
    }
  }

  listSessions(userId: string): BrowserSessionInfo[] {
    return Array.from(this.sessions.values())
      .filter((s) => s.userId === userId && s.isActive())
      .map((s) => s.getInfo());
  }

  async executeAction(
    sessionId: string,
    action: string,
    params: Record<string, unknown>
  ): Promise<BrowserActionResult> {
    const session = this.getSession(sessionId);
    if (!session || !session.isActive()) {
      return { success: false, error: "Sesión no encontrada o expirada" };
    }

    switch (action) {
      case "navigate":
        return session.navigate(String(params.url));
      case "click":
        return session.click(Number(params.x), Number(params.y));
      case "clickBySelector":
        return session.clickBySelector(String(params.selector));
      case "type":
        return session.type(String(params.selector), String(params.text));
      case "scroll":
        return session.scroll(params.direction as "up" | "down" | "left" | "right", Number(params.amount || 300));
      case "screenshot":
        return session.screenshot();
      case "extractText":
        return session.extractText();
      case "executeScript":
        return session.executeScript(String(params.script));
      case "getDOMRepresentation":
        return session.getDOMRepresentation();
      default:
        return { success: false, error: `Acción no soportada: ${action}` };
    }
  }
}

export const browserControlConnector = new BrowserControlConnector();
