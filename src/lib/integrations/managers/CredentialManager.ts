// ==================== CREDENTIAL MANAGER ====================
// Gestiona el almacenamiento encriptado de credenciales de integraciones
// y de configuración OAuth2 a nivel de aplicación.

import crypto from "crypto";
import { db } from "@/lib/db";
import type { ConnectorCredentials, IntegrationSource, OAuth2AppCredentials } from "../types";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

export class CredentialManager {
  // Lazy: la clave se deriva la primera vez que se necesita, no en el constructor.
  // Esto evita que el build de Next.js falle si ENCRYPTION_KEY no está configurada
  // en el entorno de build (solo se necesita en runtime).
  private _encryptionKey: Buffer | null = null;

  private get encryptionKey(): Buffer {
    if (this._encryptionKey) return this._encryptionKey;
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      console.warn(
        "[CredentialManager] ENCRYPTION_KEY no configurada. " +
        "Agrega ENCRYPTION_KEY a .env.local para persistir credenciales entre reinicios."
      );
    }
    const effectiveKey = key ?? "dev-default-encryption-key-change-in-prod";
    this._encryptionKey = crypto.scryptSync(effectiveKey, "opencode-integration-salt", 32);
    return this._encryptionKey;
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const combined = Buffer.concat([iv, authTag, encrypted]);
    return combined.toString("base64");
  }

  private decrypt(encryptedText: string): string {
    const combined = Buffer.from(encryptedText, "base64");
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  }

  async saveCredentials(
    userId: string,
    source: IntegrationSource,
    credentials: ConnectorCredentials,
    name?: string
  ): Promise<void> {
    const existing = await db.integrationAccount.findFirst({
      where: { userId, source },
    });

    const data: Record<string, string | null | undefined> = {};

    if (credentials.accessToken !== undefined) {
      data.accessToken = credentials.accessToken
        ? this.encrypt(credentials.accessToken)
        : null;
    }
    if (credentials.refreshToken !== undefined) {
      data.refreshToken = credentials.refreshToken
        ? this.encrypt(credentials.refreshToken)
        : null;
    }

    // apiKey se trata como accessToken para simplificar el schema
    if (credentials.apiKey !== undefined) {
      data.accessToken = credentials.apiKey ? this.encrypt(credentials.apiKey) : null;
    }

    if (existing) {
      await db.integrationAccount.update({
        where: { id: existing.id },
        data: {
          ...data,
          name: name || existing.name,
          accountId: credentials.accountId ?? existing.accountId,
          tokenType: credentials.tokenType ?? existing.tokenType,
          expiresAt: credentials.expiresAt,
          scopes: credentials.scopes?.join(","),
          metadata: credentials.metadata
            ? JSON.stringify(credentials.metadata)
            : existing.metadata,
          updatedAt: new Date(),
        },
      });
    } else {
      await db.integrationAccount.create({
        data: {
          userId,
          source,
          name: name || source,
          accountId: credentials.accountId,
          accessToken: data.accessToken || null,
          refreshToken: data.refreshToken || null,
          tokenType: credentials.tokenType,
          expiresAt: credentials.expiresAt,
          scopes: credentials.scopes?.join(","),
          metadata: credentials.metadata ? JSON.stringify(credentials.metadata) : "{}",
          enabled: true,
        },
      });
    }
  }

  async getCredentials(
    userId: string,
    source: IntegrationSource
  ): Promise<ConnectorCredentials | null> {
    const account = await db.integrationAccount.findFirst({
      where: { userId, source },
    });

    if (!account) return null;

    return {
      accessToken: account.accessToken ? this.decrypt(account.accessToken) : undefined,
      refreshToken: account.refreshToken ? this.decrypt(account.refreshToken) : undefined,
      accountId: account.accountId || undefined,
      tokenType: account.tokenType || undefined,
      expiresAt: account.expiresAt || undefined,
      scopes: account.scopes ? account.scopes.split(",") : undefined,
      metadata: account.metadata ? (JSON.parse(account.metadata) as Record<string, unknown>) : undefined,
    };
  }

  async listAccounts(userId: string) {
    return db.integrationAccount.findMany({
      where: { userId },
      select: {
        id: true,
        source: true,
        name: true,
        enabled: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async deleteAccount(userId: string, source: IntegrationSource): Promise<void> {
    await db.integrationAccount.deleteMany({
      where: { userId, source },
    });
  }

  // ==================== App-level OAuth2 credentials ====================

  async saveAppCredentials(
    source: IntegrationSource,
    credentials: OAuth2AppCredentials
  ): Promise<void> {
    const existing = await db.connectorCredential.findUnique({ where: { source } });
    const data = {
      clientId: credentials.clientId ? this.encrypt(credentials.clientId) : null,
      clientSecret: credentials.clientSecret ? this.encrypt(credentials.clientSecret) : null,
      redirectUri: credentials.redirectUri,
      scopes: credentials.scopes?.join(","),
      updatedAt: new Date(),
    };

    if (existing) {
      await db.connectorCredential.update({ where: { source }, data });
    } else {
      await db.connectorCredential.create({
        data: { source, ...data, enabled: true },
      });
    }
  }

  async getAppCredentials(source: IntegrationSource): Promise<OAuth2AppCredentials | null> {
    const row = await db.connectorCredential.findUnique({ where: { source } });
    if (!row) return null;

    return {
      clientId: row.clientId ? this.decrypt(row.clientId) : undefined,
      clientSecret: row.clientSecret ? this.decrypt(row.clientSecret) : undefined,
      redirectUri: row.redirectUri || undefined,
      scopes: row.scopes ? row.scopes.split(",") : undefined,
    };
  }

  async listAppCredentials(): Promise<Array<{ source: IntegrationSource; redirectUri?: string; scopes?: string[] }>> {
    const rows = await db.connectorCredential.findMany({
      where: { enabled: true },
      select: { source: true, redirectUri: true, scopes: true },
    });
    return rows.map((row) => ({
      source: row.source as IntegrationSource,
      redirectUri: row.redirectUri || undefined,
      scopes: row.scopes ? row.scopes.split(",") : undefined,
    }));
  }
}

export const credentialManager = new CredentialManager();
