// ==================== SHOPIFY CONNECTOR ====================
// Plantilla para Shopify. Requiere shopDomain y accessToken/API key.

import { RestConnector } from "./base/RestConnector";
import type { ConnectorInit } from "../BaseConnector";
import type { ConnectorActionResult, ConnectorCredentials, IntegrationSource, Resource, ListFilters } from "../types";

export class ShopifyConnector extends RestConnector {
  protected baseUrl = "";

  constructor(init: { source: IntegrationSource; userId: string; credentials: ConnectorCredentials }) {
    super(init as ConnectorInit);
    const shopDomain = this.credentials.metadata?.shopDomain as string | undefined;
    this.baseUrl = shopDomain ? `https://${shopDomain}.myshopify.com/admin/api/2024-04` : "";
  }

  protected getAuthHeaders(): Record<string, string> {
    const token = this.credentials.accessToken || this.credentials.apiKey;
    if (!token) throw new Error("No hay token de Shopify configurado");
    return { "X-Shopify-Access-Token": token };
  }

  async authenticate(): Promise<void> {
    if (!this.baseUrl) throw new Error("shopDomain no configurado en metadata");
    await this.request("/shop.json");
  }

  async listResources(_filters?: ListFilters): Promise<Resource[]> { return []; }
  async getResource(id: string): Promise<Resource> { throw new Error(`Recurso no encontrado: ${id}`); }
  async search(_query: string): Promise<Resource[]> { return []; }

  async listProducts(params: { limit?: number } = {}): Promise<ConnectorActionResult> {
    return this.executeAction("listProducts", () =>
      this.request("/products.json", { query: { limit: params.limit || 50 } })
    );
  }
}
