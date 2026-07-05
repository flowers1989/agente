// ==================== WEBHOOK CONNECTOR ====================
// Esqueleto base para conectores que reciben eventos vía webhooks.

import { RestConnector } from "./RestConnector";
import type { ConnectorInit } from "../../BaseConnector";

export abstract class WebhookConnector extends RestConnector {
  protected abstract webhookSecret?: string;

  constructor(init: ConnectorInit) {
    super(init);
  }

  abstract registerWebhook(url: string, events: string[]): Promise<{ id: string; url: string }>;
  abstract unregisterWebhook(id: string): Promise<void>;

  verifySignature(payload: string, signature: string, secret?: string): boolean {
    // Implementación por defecto: comparación simple. Las subclases deben
    // sobreescribir este método con HMAC si el proveedor lo requiere.
    const expected = secret || this.webhookSecret || "";
    return signature === expected;
  }
}
