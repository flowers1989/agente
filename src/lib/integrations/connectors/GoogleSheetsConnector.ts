// ==================== GOOGLE SHEETS CONNECTOR ====================
// Conector para Google Sheets: lectura/escritura de rangos.

import { OAuth2Connector } from "./base/OAuth2Connector";
import type { ConnectorInit } from "../BaseConnector";
import type { ConnectorActionResult, ConnectorCredentials, IntegrationSource, Resource, ListFilters } from "../types";

export class GoogleSheetsConnector extends OAuth2Connector {
  protected baseUrl = "https://sheets.googleapis.com/v4";
  protected authUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  protected tokenUrl = "https://oauth2.googleapis.com/token";
  protected defaultScopes = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.readonly",
  ];

  constructor(init: { source: IntegrationSource; userId: string; credentials: ConnectorCredentials }) {
    super(init as ConnectorInit);
  }

  async authenticate(): Promise<void> {
    await this.request("/v4/spreadsheets?fields=kind&pageSize=1");
  }

  async listResources(_filters?: ListFilters): Promise<Resource[]> {
    const result = await this.listSpreadsheets({ limit: 100 });
    if (!result.success) throw new Error(result.error);
    const files = (result.data as { files?: Array<{ id: string; name: string; mimeType: string; webViewLink?: string }> }).files || [];
    return files.map((file) => ({
      id: `gsheets_${file.id}`,
      name: file.name,
      type: "spreadsheet" as const,
      source: "google-sheets",
      url: file.webViewLink,
      size: 0,
      metadata: { createdAt: new Date(), modifiedAt: new Date(), owner: "", shared: true, permissions: [], external: file },
      syncStatus: "synced" as const,
      lastSyncedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  async getResource(id: string): Promise<Resource> {
    const resources = await this.listResources();
    const found = resources.find((r) => r.id === id);
    if (!found) throw new Error(`Recurso no encontrado: ${id}`);
    return found;
  }

  async search(query: string): Promise<Resource[]> {
    const resources = await this.listResources();
    return resources.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()));
  }

  async listSpreadsheets(params: { limit?: number } = {}): Promise<ConnectorActionResult> {
    // Usamos Drive API para listar hojas de cálculo
    return this.executeAction("listSpreadsheets", () =>
      fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
          "mimeType='application/vnd.google-apps.spreadsheet'"
        )}&pageSize=${params.limit || 100}`,
        {
          headers: { Authorization: `Bearer ${this.credentials.accessToken}` },
        }
      ).then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
    );
  }

  async readRange(params: { spreadsheetId: string; range: string }): Promise<ConnectorActionResult> {
    return this.executeAction("readRange", () =>
      this.request<{ values: unknown[][] }>(`/spreadsheets/${params.spreadsheetId}/values/${encodeURIComponent(params.range)}`)
    );
  }

  async writeRange(params: { spreadsheetId: string; range: string; values: unknown[][] }): Promise<ConnectorActionResult> {
    return this.executeAction("writeRange", () =>
      this.request<{ updatedRange: string; updatedRows: number }>(
        `/spreadsheets/${params.spreadsheetId}/values/${encodeURIComponent(params.range)}`,
        {
          method: "PUT",
          body: { values: params.values },
          query: { valueInputOption: "USER_ENTERED" },
        }
      )
    );
  }

  async revokeToken(): Promise<void> {
    const token = this.credentials.accessToken;
    if (!token) return;
    await this.postRevoke("https://oauth2.googleapis.com/revoke", new URLSearchParams({ token }));
  }
}
