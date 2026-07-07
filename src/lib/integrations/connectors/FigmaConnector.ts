import { BaseConnector } from "../BaseConnector";
import type {
  ConnectorActionResult,
  ConnectorCredentials,
  IntegrationSource,
  ListFilters,
  Resource,
  ResourceMetadata,
} from "../types";

interface FigmaFile {
  key: string;
  name: string;
  thumbnail_url?: string;
  last_modified: string;
  created_at?: string;
  owner?: { id?: string; email?: string; handle?: string };
}

export class FigmaConnector extends BaseConnector {
  private baseUrl = "https://api.figma.com/v1";

  constructor(init: {
    source: IntegrationSource;
    userId: string;
    credentials: ConnectorCredentials;
  }) {
    super(init);
  }

  private get teamId(): string | undefined {
    const meta = this.credentials.metadata as { teamId?: string } | undefined;
    return meta?.teamId;
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
    const data = await this.makeRequest(
      "GET",
      `${this.baseUrl}/me`,
      undefined,
      this.headers
    );
    if (!(data as { id?: string }).id) {
      throw new Error("Autenticación fallida en Figma");
    }
  }

  async listResources(filters?: ListFilters): Promise<Resource[]> {
    if (!this.teamId) {
      // Figma no expone "listar todos mis archivos". Necesitamos un team_id.
      // Si no está configurado devolvemos lista vacía; el UI debería
      // indicar al usuario que configure su team_id.
      return [];
    }
    const limit = filters?.limit || 100;
    const data = (await this.makeRequest(
      "GET",
      `${this.baseUrl}/teams/${encodeURIComponent(this.teamId)}/files?limit=${limit}`,
      undefined,
      this.headers
    )) as { files?: FigmaFile[]; error?: boolean; status?: number };

    if (data.error) {
      if (data.status === 401) {
        throw new Error("Token de Figma inválido o expirado");
      }
      if (data.status === 403) {
        throw new Error(
          "El token de Figma no tiene acceso al team indicado. Verifica el Team ID."
        );
      }
      if (data.status === 404) {
        throw new Error(`Team ID de Figma no encontrado: ${this.teamId}`);
      }
      throw new Error(`Error de la API de Figma (status ${data.status})`);
    }

    const files = data.files || [];
    return files.map((file) => this.mapFileToResource(file));
  }

  async getResource(id: string): Promise<Resource> {
    const data = await this.makeRequest(
      "GET",
      `${this.baseUrl}/files/${encodeURIComponent(id)}?depth=1`,
      undefined,
      this.headers
    );
    return this.mapFileToResource({
      key: (data as { key?: string }).key || id,
      name: (data as { name?: string }).name || id,
      thumbnail_url: (data as { thumbnailUrl?: string }).thumbnailUrl,
      last_modified: (data as { lastModified?: string }).lastModified || new Date().toISOString(),
      created_at: (data as { created_at?: string }).created_at,
      owner: (data as { owner?: { id?: string } }).owner,
    });
  }

  async search(query: string): Promise<Resource[]> {
    const resources = await this.listResources();
    const q = query.toLowerCase();
    return resources.filter((r) => r.name.toLowerCase().includes(q));
  }

  async listFiles(params: { teamId?: string; limit?: number } = {}): Promise<ConnectorActionResult> {
    if (params.teamId) {
      (this.credentials.metadata = {
        ...((this.credentials.metadata as object) || {}),
        teamId: params.teamId,
      });
    }
    return this.executeAction("listFiles", () =>
      this.listResources({ limit: params.limit })
    );
  }

  async getFile(params: { fileKey: string }): Promise<ConnectorActionResult> {
    return this.executeAction("getFile", () =>
      this.getResource(params.fileKey)
    );
  }

  async listTeamProjects(params: { teamId?: string } = {}): Promise<ConnectorActionResult> {
    return this.executeAction("listTeamProjects", async () => {
      const teamId = params.teamId || this.teamId;
      if (!teamId) {
        throw new Error(
          "Se requiere un Team ID de Figma. Configura 'Team ID' en el diálogo de Figma."
        );
      }
      return this.makeRequest(
        "GET",
        `${this.baseUrl}/teams/${encodeURIComponent(teamId)}/projects`,
        undefined,
        this.headers
      );
    });
  }

  async listProjectFiles(params: { projectId: string }): Promise<ConnectorActionResult> {
    return this.executeAction("listProjectFiles", () =>
      this.makeRequest(
        "GET",
        `${this.baseUrl}/projects/${encodeURIComponent(params.projectId)}/files`,
        undefined,
        this.headers
      )
    );
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.authenticate();
      return true;
    } catch (error) {
      console.error("[FigmaConnector] Validation failed:", error);
      return false;
    }
  }

  private async executeAction<T = unknown>(
    actionName: string,
    fn: () => Promise<T>
  ): Promise<ConnectorActionResult> {
    try {
      const data = await fn();
      return { success: true, data };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[figma] Action ${actionName} failed:`, error);
      return { success: false, error: message };
    }
  }

  private mapFileToResource(file: FigmaFile): Resource {
    const now = new Date();
    const modifiedAt = new Date(file.last_modified);
    const createdAt = file.created_at ? new Date(file.created_at) : modifiedAt;

    const metadata: ResourceMetadata = {
      createdAt,
      modifiedAt,
      owner: file.owner?.id || file.owner?.handle || "unknown",
      shared: false,
      permissions: [],
      external: file as unknown as Record<string, unknown>,
    };

    return {
      id: file.key,
      name: file.name,
      type: "design",
      source: "figma" as IntegrationSource,
      mimeType: "application/figma",
      size: 0,
      url: `https://figma.com/file/${file.key}`,
      thumbnailUrl: file.thumbnail_url,
      metadata,
      syncStatus: "synced",
      lastSyncedAt: now,
      createdAt,
      updatedAt: modifiedAt,
    };
  }
}