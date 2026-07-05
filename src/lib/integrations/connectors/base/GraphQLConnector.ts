// ==================== GRAPHQL CONNECTOR ====================
// Esqueleto base para conectores que usan GraphQL.

import { RestConnector } from "./RestConnector";
import type { ConnectorInit } from "../../BaseConnector";

export abstract class GraphQLConnector extends RestConnector {
  protected abstract graphQLEndpoint: string;

  constructor(init: ConnectorInit) {
    super(init);
  }

  async query<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<T> {
    return this.request<T>(this.graphQLEndpoint.replace(this.baseUrl, ""), {
      method: "POST",
      body: { query, variables },
    });
  }

  async mutate<T = unknown>(mutation: string, variables?: Record<string, unknown>): Promise<T> {
    return this.query<T>(mutation, variables);
  }
}
