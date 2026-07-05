// ==================== WEBHOOK MANAGER ====================
// Recibe, verifica y almacena eventos de webhooks de conectores externos.

import crypto from "crypto";
import { db } from "@/lib/db";
import { credentialManager } from "./CredentialManager";
import type { IntegrationSource } from "../types";

export interface WebhookPayload {
  source: IntegrationSource;
  eventType?: string;
  payload: Record<string, unknown>;
  signature?: string;
  headers: Record<string, string>;
}

export class WebhookManager {
  async processWebhook(source: IntegrationSource, request: Request): Promise<{ received: boolean; verified: boolean }> {
    const rawBody = await request.text();
    const payload = this.safeParseJson(rawBody);
    const signature = this.extractSignature(request.headers, source);

    const verified = await this.verifySignature(source, rawBody, signature);

    await db.connectorWebhookEvent.create({
      data: {
        source,
        eventType: this.extractEventType(payload, source),
        payload: rawBody,
        signature: signature || null,
        verified,
        processed: false,
      },
    });

    // Aquí se podría despachar el evento a handlers registrados por conector.
    return { received: true, verified };
  }

  private extractSignature(headers: Headers, source: IntegrationSource): string | undefined {
    const headerName = this.getSignatureHeader(source);
    return headers.get(headerName) || undefined;
  }

  private getSignatureHeader(source: IntegrationSource): string {
    switch (source) {
      case "slack":
        return "x-slack-signature";
      case "github":
        return "x-hub-signature-256";
      case "discord":
        return "x-signature-ed25519";
      default:
        return "x-webhook-signature";
    }
  }

  private async verifySignature(source: IntegrationSource, rawBody: string, signature?: string): Promise<boolean> {
    if (!signature) return false;

    const appCreds = await credentialManager.getAppCredentials(source);
    const secret = appCreds?.clientSecret;
    if (!secret) return false;

    switch (source) {
      case "slack": {
        const timestamp = ""; // Slack requiere timestamp; placeholder para verificación real
        const expected = "v0=" + crypto.createHmac("sha256", secret).update(`v0:${timestamp}:${rawBody}`).digest("hex");
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
      }
      case "github": {
        const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
      }
      default:
        return false;
    }
  }

  private extractEventType(payload: Record<string, unknown>, source: IntegrationSource): string | undefined {
    if (source === "slack" && typeof payload.type === "string") return payload.type;
    if (typeof payload.event === "object" && payload.event !== null && typeof (payload.event as Record<string, unknown>).type === "string") {
      return (payload.event as Record<string, unknown>).type as string;
    }
    if (typeof payload.action === "string") return payload.action;
    return undefined;
  }

  private safeParseJson(text: string): Record<string, unknown> {
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}

export const webhookManager = new WebhookManager();
