import { OAuth2Connector } from "./base/OAuth2Connector";
import type { ConnectorInit } from "../BaseConnector";
import type {
  Resource,
  ListFilters,
  ResourceMetadata,
  SyncStatus,
  ConnectorActionResult,
  IntegrationSource,
} from "../types";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  createdTime?: string;
  webViewLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
  exportLinks?: Record<string, string>;
  parents?: string[];
  size?: string;
}

interface DriveListResponse {
  files: DriveFile[];
  nextPageToken?: string;
}

function driveFileToResource(file: DriveFile, source: IntegrationSource): Resource {
  const modified = file.modifiedTime ? new Date(file.modifiedTime) : new Date();
  const created = file.createdTime ? new Date(file.createdTime) : modified;
  const meta: ResourceMetadata = {
    createdAt: created,
    modifiedAt: modified,
    owner: "",
    shared: false,
    permissions: [],
    external: file as unknown as Record<string, unknown>,
  };
  return {
    id: file.id,
    name: file.name,
    type: file.mimeType === "application/vnd.google-apps.folder" ? "folder" : "file",
    source,
    mimeType: file.mimeType,
    size: file.size ? Number(file.size) : 0,
    url: file.webViewLink,
    thumbnailUrl: file.thumbnailLink,
    metadata: meta,
    syncStatus: "synced" as SyncStatus,
    lastSyncedAt: new Date(),
    createdAt: created,
    updatedAt: modified,
  };
}

export class GoogleDriveConnector extends OAuth2Connector {
  protected authUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  protected tokenUrl = "https://oauth2.googleapis.com/token";
  // drive.file permite crear/escribir archivos creados por la app;
  // añadimos drive.metadata.readonly para listados y appdata para configuración.
  protected defaultScopes = [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive.metadata.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
  ];
  protected baseUrl = "https://www.googleapis.com/drive/v3";
  protected uploadUrl = "https://www.googleapis.com/upload/drive/v3";

  constructor(init: ConnectorInit) {
    super(init);
  }

  protected getAuthorizationUrlParams(): Record<string, string> {
    return {
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
    };
  }

  protected async getAuthHeaders(): Promise<Record<string, string>> {
    await this.ensureValidToken();
    const accessToken = this.credentials.accessToken;
    if (!accessToken) throw new Error("Access token not found for Google Drive");
    return { Authorization: `Bearer ${accessToken}` };
  }

  async authenticate(): Promise<void> {
    await this.request("/about", { method: "GET", query: { fields: "user" } });
  }

  async listResources(filters?: ListFilters): Promise<Resource[]> {
    await this.ensureValidToken();
    const qParts = ["trashed = false"];
    if (filters?.query) {
      const escaped = filters.query.replace(/['\\]/g, "\\$&");
      qParts.push(`name contains '${escaped}'`);
    }
    const queryParams: Record<string, string> = {
      q: qParts.join(" and "),
      fields:
        "files(id, name, mimeType, modifiedTime, createdTime, webViewLink, thumbnailLink, iconLink, size, parents)",
      pageSize: String(filters?.limit || 50),
      orderBy: "modifiedByMeTime desc",
    };
    const response = await this.request<DriveListResponse>("/files", {
      method: "GET",
      query: queryParams,
    });
    return response.files.map((f) => driveFileToResource(f, this.source));
  }

  async getResource(id: string): Promise<Resource> {
    await this.ensureValidToken();
    const response = await this.request<DriveFile>(`/files/${id}`, {
      method: "GET",
      query: {
        fields:
          "id, name, mimeType, modifiedTime, createdTime, webViewLink, thumbnailLink, iconLink, exportLinks, size, parents",
      },
    });
    let content = "";
    if (
      response.mimeType.startsWith("application/vnd.google-apps") &&
      response.exportLinks
    ) {
      const exportLink =
        response.exportLinks["text/plain"] ||
        response.exportLinks["application/pdf"];
      if (exportLink) {
        content = await this.request<string>(exportLink, {
          method: "GET",
          rawUrl: true,
          responseType: "text",
        });
      }
    } else if (
      response.mimeType.startsWith("text/") ||
      response.mimeType === "application/json" ||
      response.mimeType === "application/xml"
    ) {
      content = await this.request<string>(`/files/${id}`, {
        method: "GET",
        responseType: "text",
        query: { alt: "media" },
      });
    }
    return { ...driveFileToResource(response, this.source), content };
  }

  async search(query: string): Promise<Resource[]> {
    return this.listResources({ query });
  }

  async readFile(id: string): Promise<string> {
    await this.ensureValidToken();
    const meta = await this.request<DriveFile>(`/files/${id}`, {
      method: "GET",
      query: { fields: "id, name, mimeType, exportLinks" },
    });

    if (meta.mimeType.startsWith("application/vnd.google-apps")) {
      const exportLink =
        meta.exportLinks?.["text/plain"] ||
        meta.exportLinks?.["application/pdf"] ||
        meta.exportLinks?.["application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
      if (exportLink) {
        return this.request<string>(exportLink, {
          method: "GET",
          rawUrl: true,
          responseType: "text",
        });
      }
      throw new Error(
        `No se puede leer el documento Google (mimeType=${meta.mimeType}) sin enlace de exportación.`
      );
    }

    if (
      meta.mimeType.startsWith("text/") ||
      meta.mimeType === "application/json" ||
      meta.mimeType === "application/xml"
    ) {
      return this.request<string>(`/files/${id}`, {
        method: "GET",
        responseType: "text",
        query: { alt: "media" },
      });
    }

    throw new Error(
      `No se puede leer el archivo con MIME type: ${meta.mimeType}.`
    );
  }

  private async uploadMultipart(
    name: string,
    content: string,
    mimeType: string,
    folderId?: string,
    fileId?: string
  ): Promise<DriveFile> {
    await this.ensureValidToken();
    const metadata: Record<string, unknown> = { name, mimeType };
    if (folderId) metadata.parents = [folderId];
    const boundary = "opencode-" + Math.random().toString(36).slice(2);
    const body =
      `--${boundary}\r\n` +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      `\r\n--${boundary}\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n` +
      content +
      `\r\n--${boundary}--`;

    const method = fileId ? "PATCH" : "POST";
    const url = fileId
      ? `${this.uploadUrl}/files/${fileId}?uploadType=multipart&fields=id,name,mimeType,modifiedTime,webViewLink`
      : `${this.uploadUrl}/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,webViewLink`;

    const authHeaders = await this.getAuthHeaders();
    const response = await fetch(url, {
      method,
      headers: {
        ...authHeaders,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "Unknown error");
      throw new Error(`HTTP ${response.status} subiendo archivo: ${text}`);
    }
    return (await response.json()) as DriveFile;
  }

  async listFiles(params: { limit?: number; query?: string } = {}): Promise<ConnectorActionResult> {
    return this.executeAction("listFiles", () =>
      this.listResources({ limit: params.limit, query: params.query })
    );
  }

  async createFile(params: {
    name: string;
    content: string;
    mimeType?: string;
    folderId?: string;
  }): Promise<ConnectorActionResult> {
    return this.executeAction("createFile", async () => {
      const created = await this.uploadMultipart(
        params.name,
        params.content,
        params.mimeType || "text/plain",
        params.folderId
      );
      return driveFileToResource(created, this.source);
    });
  }

  async updateFile(params: {
    id: string;
    content: string;
    mimeType?: string;
  }): Promise<ConnectorActionResult> {
    return this.executeAction("updateFile", async () => {
      const updated = await this.uploadMultipart(
        "",
        params.content,
        params.mimeType || "text/plain",
        undefined,
        params.id
      );
      // La API de Drive no devuelve metadata en PATCH de upload múltiple si
      // las cabeceras cambian; recuperamos el recurso completo para datos fiables.
      try {
        return await this.getResource(params.id);
      } catch {
        return driveFileToResource(updated, this.source);
      }
    });
  }

  async deleteFile(params: { id: string }): Promise<ConnectorActionResult> {
    return this.executeAction("deleteFile", async () => {
      await this.request<void>(`/files/${params.id}`, { method: "DELETE" });
      return { id: params.id };
    });
  }

  async createFolder(params: {
    name: string;
    parentId?: string;
  }): Promise<ConnectorActionResult> {
    return this.executeAction("createFolder", async () => {
      const created = await this.request<DriveFile>(`/files`, {
        method: "POST",
        body: {
          name: params.name,
          mimeType: "application/vnd.google-apps.folder",
          parents: params.parentId ? [params.parentId] : undefined,
        },
        query: {
          fields: "id,name,mimeType,modifiedTime,createdTime,webViewLink",
        },
      });
      return driveFileToResource(created, this.source);
    });
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.authenticate();
      return true;
    } catch (error) {
      console.error("[GoogleDriveConnector] Validation failed:", error);
      return false;
    }
  }
}