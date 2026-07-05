// ==================== OAUTH2 CONNECTOR ====================
// Conector base con flujo OAuth2, refresh token y manejo de expiración.

import { RestConnector } from "./RestConnector";
import type { ConnectorInit } from "../../BaseConnector";
import type { ConnectorCredentials, OAuth2AppCredentials } from "../../types";

export interface OAuth2TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

export abstract class OAuth2Connector extends RestConnector {
  protected abstract authUrl: string;
  protected abstract tokenUrl: string;
  protected abstract defaultScopes: string[];
  protected appCredentials: OAuth2AppCredentials = {};

  constructor(init: ConnectorInit) {
    super(init);
  }

  setAppCredentials(credentials: OAuth2AppCredentials): void {
    this.appCredentials = credentials;
  }

  getAuthorizationUrl(state: string): string {
    if (!this.appCredentials.clientId || !this.appCredentials.redirectUri) {
      throw new Error(`OAuth2 no configurado para ${this.source}`);
    }

    const scopes = this.appCredentials.scopes?.length
      ? this.appCredentials.scopes
      : this.defaultScopes;

    const params = new URLSearchParams({
      client_id: this.appCredentials.clientId,
      redirect_uri: this.appCredentials.redirectUri,
      response_type: "code",
      scope: scopes.join(" "),
      state,
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<ConnectorCredentials> {
    if (!this.appCredentials.clientId || !this.appCredentials.clientSecret || !this.appCredentials.redirectUri) {
      throw new Error(`OAuth2 no configurado para ${this.source}`);
    }

    const response = await fetch(this.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: this.appCredentials.clientId,
        client_secret: this.appCredentials.clientSecret,
        redirect_uri: this.appCredentials.redirectUri,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "Unknown error");
      throw new Error(`OAuth2 exchange failed: ${text}`);
    }

    const tokenData = (await response.json()) as OAuth2TokenResponse;
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : undefined;

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt,
      tokenType: tokenData.token_type || "bearer",
      scopes: tokenData.scope?.split(/[\s,]+/) || this.defaultScopes,
    };
  }

  async refreshAccessToken(): Promise<ConnectorCredentials> {
    if (!this.credentials.refreshToken) {
      throw new Error(`No hay refresh token para ${this.source}`);
    }
    if (!this.appCredentials.clientId || !this.appCredentials.clientSecret) {
      throw new Error(`OAuth2 no configurado para ${this.source}`);
    }

    const response = await fetch(this.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.credentials.refreshToken,
        client_id: this.appCredentials.clientId,
        client_secret: this.appCredentials.clientSecret,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "Unknown error");
      throw new Error(`OAuth2 refresh failed: ${text}`);
    }

    const tokenData = (await response.json()) as OAuth2TokenResponse;
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : undefined;

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || this.credentials.refreshToken,
      expiresAt,
      tokenType: tokenData.token_type || "bearer",
      scopes: tokenData.scope?.split(/[\s,]+/) || this.credentials.scopes,
    };
  }

  async ensureValidToken(): Promise<void> {
    if (!this.credentials.expiresAt) return;
    const bufferMs = 60 * 1000; // 1 minuto de margen
    if (new Date() >= new Date(this.credentials.expiresAt.getTime() - bufferMs)) {
      const refreshed = await this.refreshAccessToken();
      this.credentials = { ...this.credentials, ...refreshed };
      // Nota: el caller debe persistir los nuevos tokens.
    }
  }

  getCurrentCredentials(): ConnectorCredentials {
    return { ...this.credentials };
  }

  protected async getAuthHeaders(): Promise<Record<string, string>> {
    await this.ensureValidToken();
    const token = this.credentials.accessToken;
    if (!token) {
      throw new Error(`No hay access token para ${this.source}`);
    }
    const tokenType = this.credentials.tokenType || "Bearer";
    return { Authorization: `${tokenType} ${token}` };
  }

  async revokeToken(): Promise<void> {
    // Implementar en subclases si el proveedor lo soporta.
  }

  protected async postRevoke(url: string, body: URLSearchParams | string, headers?: Record<string, string>): Promise<void> {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", ...headers },
      body,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "Unknown error");
      throw new Error(`Token revocation failed: ${text}`);
    }
  }
}
