import { OAuth2Connector } from "./base/OAuth2Connector";
import type { ConnectorInit } from "../BaseConnector";
import type { Resource, ListFilters, ResourceMetadata, SyncStatus } from "../types";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink: string;
  exportLinks?: Record<string, string>;
}

interface DriveListResponse {
  files: DriveFile[];
}

function driveFileToResource(file: DriveFile, source: string): Resource {
  const meta: ResourceMetadata = {
    createdAt: new Date(file.modifiedTime),
    modifiedAt: new Date(file.modifiedTime),
    owner: "",
    shared: false,
    permissions: [],
    external: file as unknown as Record<string, unknown>,
  };
  return {
    id: file.id,
    name: file.name,
    type: file.mimeType.startsWith("application/vnd.google-apps.folder") ? "folder" : "file",
    source: source as import("../types").IntegrationSource,
    mimeType: file.mimeType,
    size: 0,
    url: file.webViewLink,
    metadata: meta,
    syncStatus: "synced" as SyncStatus,
    lastSyncedAt: new Date(),
    createdAt: new Date(file.modifiedTime),
    updatedAt: new Date(file.modifiedTime),
  };
}

export class GoogleDriveConnector extends OAuth2Connector {
  protected authUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  protected tokenUrl = "https://oauth2.googleapis.com/token";
  protected defaultScopes = ["https://www.googleapis.com/auth/drive.readonly"];
  protected baseUrl = "https://www.googleapis.com/drive/v3";

  constructor(init: ConnectorInit) {
    super(init);
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
    const queryParams: Record<string, string> = {
      q: "trashed = false",
      fields: "files(id, name, mimeType, modifiedTime, webViewLink)",
      pageSize: String(filters?.limit || 10),
    };
    if (filters?.query) {
      queryParams.q += ` and name contains '${filters.query}'`;
    }
    const response = await this.request<DriveListResponse>("/files", { method: "GET", query: queryParams });
    return response.files.map((f) => driveFileToResource(f, "google-drive"));
  }

  async getResource(id: string): Promise<Resource> {
    await this.ensureValidToken();
    const response = await this.request<DriveFile>(`/files/${id}`, {
      method: "GET",
      query: { fields: "id, name, mimeType, modifiedTime, webViewLink, exportLinks" },
    });
    let content = "";
    if (response.mimeType.startsWith("application/vnd.google-apps") && response.exportLinks) {
      const exportLink =
        response.exportLinks["application/pdf"] || response.exportLinks["text/plain"];
      if (exportLink) {
        content = await this.request<string>(exportLink, { method: "GET", rawUrl: true, responseType: "text" });
      }
    }
    const resource = driveFileToResource(response, "google-drive");
    return { ...resource, content };
  }

  async search(query: string): Promise<Resource[]> {
    return this.listResources({ query });
  }

  async readFile(id: string): Promise<string> {
    await this.ensureValidToken();
    const response = await this.request<DriveFile>(`/files/${id}`, {
      method: "GET",
      query: { fields: "id, name, mimeType, exportLinks" },
    });
    let exportLink = response.exportLinks?.["text/plain"];
    if (!exportLink) {
      exportLink = response.exportLinks?.["application/pdf"];
    }
    if (exportLink) {
      return this.request<string>(exportLink, { method: "GET", rawUrl: true, responseType: "text" });
    } else if (response.mimeType.startsWith("text/") || response.mimeType === "application/json") {
      return this.request<string>(`/files/${id}?alt=media`, { method: "GET", responseType: "text" });
    } else {
      throw new Error(
        `No se puede leer el archivo con MIME type: ${response.mimeType}. Sin enlace de exportación.`
      );
    }
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
