import { OAuth2Connector } from "./base/OAuth2Connector";
import type { ConnectorInit } from "../BaseConnector";
import type { ConnectorActionResult, ConnectorCredentials, IntegrationSource, Resource, ListFilters } from "../types";

export class GoogleDriveConnector extends OAuth2Connector {
  constructor(init: ConnectorInit) {
    super(init, {
      source: "google-drive",
      name: "Google Drive",
      baseUrl: "https://www.googleapis.com/drive/v3",
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      defaultScopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });
  }

  protected getAuthHeaders(): Record<string, string> {
    const accessToken = this.credentials.accessToken;
    if (!accessToken) throw new Error("Access token not found for Google Drive");
    return { Authorization: `Bearer ${accessToken}` };
  }

  async authenticate(): Promise<void> {
    // Test authentication by making a simple request to get user info
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

    const response = await this.request("/files", { method: "GET", query: queryParams });
    const files = response.files as Array<any>;

    return files.map((file) => ({
      id: file.id,
      name: file.name,
      type: file.mimeType.startsWith("application/vnd.google-apps.folder") ? "folder" : "file",
      mimeType: file.mimeType,
      url: file.webViewLink,
      lastModified: file.modifiedTime,
      metadata: file,
    }));
  }

  async getResource(id: string): Promise<Resource> {
    await this.ensureValidToken();
    const response = await this.request(`/files/${id}`, { method: "GET", query: { fields: "id, name, mimeType, modifiedTime, webViewLink, exportLinks" } });
    
    let content = '';
    // Attempt to export content for common document types
    if (response.mimeType.startsWith('application/vnd.google-apps')) {
      const exportLink = response.exportLinks?.['application/pdf'] || response.exportLinks?.['text/plain'];
      if (exportLink) {
        const exportResponse = await this.request(exportLink, { method: 'GET', rawUrl: true });
        content = exportResponse; // Assuming raw content for now
      }
    }

    return {
      id: response.id,
      name: response.name,
      type: response.mimeType.startsWith("application/vnd.google-apps.folder") ? "folder" : "file",
      mimeType: response.mimeType,
      url: response.webViewLink,
      lastModified: response.modifiedTime,
      content: content,
      metadata: response,
    };
  }

  // You can add uploadFile, deleteFile, etc. here following a similar pattern

  async readFile(id: string): Promise<string> {
    await this.ensureValidToken();
    const response = await this.request(`/files/${id}`, { method: "GET", query: { fields: "id, name, mimeType, exportLinks" } });

    let exportLink = response.exportLinks?.["text/plain"];
    if (!exportLink) {
      // Fallback for other document types, try PDF if text/plain is not available
      exportLink = response.exportLinks?.["application/pdf"];
    }

    if (exportLink) {
      const content = await this.request(exportLink, { method: "GET", rawUrl: true, responseType: "text" });
      return content;
    } else if (response.mimeType.startsWith("text/") || response.mimeType === "application/json") {
      // Direct download for plain text or JSON files
      const content = await this.request(`/files/${id}?alt=media`, { method: "GET", responseType: "text" });
      return content;
    } else {
      throw new Error(`No se puede leer el contenido del archivo con MIME type: ${response.mimeType}. No hay enlace de exportación o no es un tipo de texto/json.`);
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
