// ==================== REST CONNECTOR ====================
// Conector base para APIs REST con reintentos, rate-limit básico y logging.

import { BaseConnector, type ConnectorInit } from "../../BaseConnector";
import type { ConnectorActionResult } from "../../types";

export interface RestRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  retries?: number;
}

export abstract class RestConnector extends BaseConnector {
  protected abstract baseUrl: string;

  constructor(init: ConnectorInit) {
    super(init);
  }

  protected abstract getAuthHeaders(): Promise<Record<string, string>> | Record<string, string>;

  protected buildQueryString(query?: Record<string, string | number | boolean | undefined>): string {
    if (!query) return "";
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    }
    return params.toString() ? `?${params.toString()}` : "";
  }

  protected async request<T = unknown>(path: string, options: RestRequestOptions = {}): Promise<T> {
    const { method = "GET", headers = {}, body, query, retries = 1 } = options;
    const queryString = this.buildQueryString(query);
    const url = `${this.baseUrl}${path}${queryString}`;
    const authHeaders = await this.getAuthHeaders();

    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...authHeaders,
            ...headers,
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
          const text = await response.text().catch(() => "Unknown error");
          throw new Error(`HTTP ${response.status}: ${text}`);
        }

        if (response.status === 204) return null as T;
        return (await response.json()) as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    throw lastError;
  }

  protected async executeAction<T = unknown>(
    actionName: string,
    fn: () => Promise<T>
  ): Promise<ConnectorActionResult> {
    const start = Date.now();
    try {
      const data = await fn();
      return { success: true, data };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[${this.source}] Action ${actionName} failed:`, error);
      return { success: false, error: message };
    }
  }
}
