// ==================== FIGMA CONNECTOR ====================
// Conector para listar e importar archivos de Figma.

import { BaseConnector } from "../BaseConnector";
import type {
  ConnectorCredentials,
  IntegrationSource,
  ListFilters,
  Resource,
  ResourceMetadata,
} from "../types";

interface FigmaFile {
  key: string;
  name: string;
  thumbnail_url: string;
  last_modified: string;
  created_at?: string;
  owner?: { id: string };
}

export class FigmaConnector extends BaseConnector {
  private baseUrl = "https://api.figma.com/v1";

  constructor(init: { source: IntegrationSource; userId: string; credentials: ConnectorCredentials }) {
    super(init);
  }

  private get headers(): Record<string, string> {
    const token = this.credentials.accessToken;
    if (!token) {
      throw new Error("No hay token de Figma configurado");
    }
    return {
      "X-Figma-Token": token,
      "Content-Type": "application/json",
    };
  }

  async authenticate(): Promise<void> {
    const data = (await this.makeRequest(
      "GET",
      `${this.baseUrl}/me`,
      undefined,
      this.headers
    )) as { id: string };

    if (!data.id) {
      throw new Error("Autenticación fallida en Figma");
    }
  }

  async listResources(filters?: ListFilters): Promise<Resource[]> {
    const limit = filters?.limit || 100;
    const data = (await this.makeRequest(
      "GET",
      `${this.baseUrl}/me/files?limit=${limit}`,
      undefined,
      this.headers
    )) as { files: FigmaFile[] };

    return data.files.map((file) => this.mapFileToResource(file));
  }

  async getResource(id: string): Promise<Resource> {
    const data = (await this.makeRequest(
      "GET",
      `${this.baseUrl}/files/${id}?depth=1`,
      undefined,
      this.headers
    )) as {
      key: string;
      name: string;
      thumbnailUrl: string;
      lastModified: string;
      created_at?: string;
      owner?: { id: string };
    };

    return this.mapFileToResource({
      key: data.key,
      name: data.name,
      thumbnail_url: data.thumbnailUrl,
      last_modified: data.lastModified,
      created_at: data.created_at,
      owner: data.owner,
    });
  }

  async search(query: string): Promise<Resource[]> {
    const resources = await this.listResources();
    return resources.filter((r) =>
      r.name.toLowerCase().includes(query.toLowerCase())
    );
  }

  private mapFileToResource(file: FigmaFile): Resource {
    const now = new Date();
    const modifiedAt = new Date(file.last_modified);
    const createdAt = file.created_at ? new Date(file.created_at) : modifiedAt;

    const metadata: ResourceMetadata = {
      createdAt,
      modifiedAt,
      owner: file.owner?.id || "unknown",
      shared: false,
      permissions: [],
      external: { key: file.key },
    };

    return {
      id: `figma_${file.key}`,
      name: file.name,
      type: "design",
      source: "figma",
      mimeType: "application/figma",
      size: 0,
      url: `https://figma.com/file/${file.key}`,
      thumbnailUrl: file.thumbnail_url,
      metadata,
      syncStatus: "synced",
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    };
  }
}
