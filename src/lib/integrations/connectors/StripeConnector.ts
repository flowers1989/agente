// ==================== STRIPE CONNECTOR ====================
// Plantilla para Stripe. Usa API key (sk_...).

import { RestConnector } from "./base/RestConnector";
import type { ConnectorInit } from "../BaseConnector";
import type { ConnectorActionResult, ConnectorCredentials, IntegrationSource, Resource, ListFilters } from "../types";

export class StripeConnector extends RestConnector {
  protected baseUrl = "https://api.stripe.com/v1";

  constructor(init: { source: IntegrationSource; userId: string; credentials: ConnectorCredentials }) {
    super(init as ConnectorInit);
  }

  protected getAuthHeaders(): Record<string, string> {
    const token = this.credentials.accessToken || this.credentials.apiKey;
    if (!token) throw new Error("No hay API key de Stripe configurada");
    return { Authorization: `Bearer ${token}` };
  }

  async authenticate(): Promise<void> {
    await this.request("/account");
  }

  async listResources(_filters?: ListFilters): Promise<Resource[]> { return []; }
  async getResource(id: string): Promise<Resource> { throw new Error(`Recurso no encontrado: ${id}`); }
  async search(_query: string): Promise<Resource[]> { return []; }

  async listCustomers(params: { limit?: number } = {}): Promise<ConnectorActionResult> {
    return this.executeAction("listCustomers", () =>
      this.request("/customers", { query: { limit: params.limit || 10 } })
    );
  }
}
