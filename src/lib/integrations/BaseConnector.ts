// ==================== BASE CONNECTOR ====================
// Clase abstracta que deben implementar todos los conectores de integración.

import type {
  ConnectorCredentials,
  IntegrationSource,
  ListFilters,
  Resource,
} from "./types";

export interface ConnectorInit {
  source: IntegrationSource;
  userId: string;
  credentials: ConnectorCredentials;
}

export abstract class BaseConnector {
  protected source: IntegrationSource;
  protected userId: string;
  protected credentials: ConnectorCredentials;

  constructor(init: ConnectorInit) {
    this.source = init.source;
    this.userId = init.userId;
    this.credentials = init.credentials;
  }

  abstract authenticate(): Promise<void>;
  abstract listResources(filters?: ListFilters): Promise<Resource[]>;
  abstract getResource(id: string): Promise<Resource>;
  abstract search(query: string): Promise<Resource[]>;

  // Opcionales: no todas las fuentes soportan upload/delete
  async uploadResource(file: File, folderId?: string): Promise<Resource> {
    throw new Error(`Upload no soportado para ${this.source}`);
  }

  async deleteResource(id: string): Promise<void> {
    throw new Error(`Delete no soportado para ${this.source}`);
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.authenticate();
      return true;
    } catch (error) {
      console.error(`[${this.source}] Connection validation failed:`, error);
      return false;
    }
  }

  protected async makeRequest(
    method: string,
    url: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<unknown> {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "Unknown error");
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    if (response.status === 204) return null;
    return response.json();
  }
}
