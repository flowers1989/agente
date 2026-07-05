// ==================== TEMPLATE CONNECTOR ====================
// Plantilla reutilizable para conectores secundarios. Extiende según el tipo de auth.

import { OAuth2Connector } from "./base/OAuth2Connector";
import type { ConnectorInit } from "../BaseConnector";
import type { ConnectorActionResult, ConnectorCredentials, IntegrationSource, Resource, ListFilters } from "../types";

export interface TemplateConnectorConfig {
  source: IntegrationSource;
  name: string;
  baseUrl: string;
  authUrl?: string;
  tokenUrl?: string;
  defaultScopes?: string[];
  authHeader?: "bearer" | "token";
}

export class TemplateConnector extends OAuth2Connector {
  protected baseUrl: string;
  protected authUrl: string;
  protected tokenUrl: string;
  protected defaultScopes: string[];
  private config: TemplateConnectorConfig;

  constructor(init: { source: IntegrationSource; userId: string; credentials: ConnectorCredentials }, config: TemplateConnectorConfig) {
    super(init as ConnectorInit);
    this.config = config;
    this.baseUrl = config.baseUrl;
    this.authUrl = config.authUrl || "";
    this.tokenUrl = config.tokenUrl || "";
    this.defaultScopes = config.defaultScopes || [];
  }

  protected async getAuthHeaders(): Promise<Record<string, string>> {
    await this.ensureValidToken();
    const token = this.credentials.accessToken;
    if (!token) throw new Error(`No hay token para ${this.source}`);
    if (this.config.authHeader === "token") {
      return { Authorization: `Token ${token}` };
    }
    return { Authorization: `Bearer ${token}` };
  }

  async authenticate(): Promise<void> {
    // Por defecto valida con una petición a /me o similar.
    // Las subclases pueden sobrescribir.
  }

  async listResources(_filters?: ListFilters): Promise<Resource[]> {
    return [];
  }

  async getResource(id: string): Promise<Resource> {
    throw new Error(`Recurso no encontrado: ${id}`);
  }

  async search(_query: string): Promise<Resource[]> {
    return [];
  }

  async healthCheck(): Promise<ConnectorActionResult> {
    return this.executeAction("healthCheck", async () => {
      await this.authenticate();
      return { ok: true };
    });
  }
}
