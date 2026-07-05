// ==================== CONECTORES SECUNDARIOS ====================
// Plantillas/esqueletos para conectores de terceros.

import { TemplateConnector } from "./TemplateConnector";
import { RestConnector } from "./base/RestConnector";
import type { ConnectorInit } from "../BaseConnector";
import type { ConnectorActionResult, ConnectorCredentials, IntegrationSource, Resource, ListFilters } from "../types";

// --- eCommerce ---

export class PaypalConnector extends TemplateConnector {
  constructor(init: { source: IntegrationSource; userId: string; credentials: ConnectorCredentials }) {
    super(init, {
      source: "paypal",
      name: "PayPal",
      baseUrl: "https://api.paypal.com/v1",
      authUrl: "https://www.paypal.com/signin/authorize",
      tokenUrl: "https://api.paypal.com/v1/oauth2/token",
      defaultScopes: ["openid", "profile", "email"],
    });
  }
}

export class WooCommerceConnector extends RestConnector {
  protected baseUrl = "";

  constructor(init: { source: IntegrationSource; userId: string; credentials: ConnectorCredentials }) {
    super(init as ConnectorInit);
    this.baseUrl = (this.credentials.metadata?.baseUrl as string) || "";
  }

  protected getAuthHeaders(): Record<string, string> {
    const consumerKey = this.credentials.accessToken;
    const consumerSecret = this.credentials.refreshToken;
    if (!consumerKey || !consumerSecret) throw new Error("Faltan credenciales de WooCommerce");
    const encoded = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    return { Authorization: `Basic ${encoded}` };
  }

  async authenticate(): Promise<void> {
    if (!this.baseUrl) throw new Error("baseUrl no configurado en metadata");
    await this.request("/wp-json/wc/v3/products", { query: { per_page: 1 } });
  }

  async listResources(_filters?: ListFilters): Promise<Resource[]> { return []; }
  async getResource(id: string): Promise<Resource> { throw new Error(`Recurso no encontrado: ${id}`); }
  async search(_query: string): Promise<Resource[]> { return []; }
}

export class SquareConnector extends TemplateConnector {
  constructor(init: { source: IntegrationSource; userId: string; credentials: ConnectorCredentials }) {
    super(init, {
      source: "square",
      name: "Square",
      baseUrl: "https://connect.squareup.com/v2",
      authUrl: "https://connect.squareup.com/oauth2/authorize",
      tokenUrl: "https://connect.squareup.com/oauth2/token",
      defaultScopes: ["ITEMS_READ", "ORDERS_READ", "CUSTOMERS_READ"],
    });
  }
}

// --- CRM / Marketing ---

export class SalesforceConnector extends TemplateConnector {
  constructor(init: { source: IntegrationSource; userId: string; credentials: ConnectorCredentials }) {
    super(init, {
      source: "salesforce",
      name: "Salesforce",
      baseUrl: "https://login.salesforce.com/services/data/v59.0",
      authUrl: "https://login.salesforce.com/services/oauth2/authorize",
      tokenUrl: "https://login.salesforce.com/services/oauth2/token",
      defaultScopes: ["api", "refresh_token"],
    });
  }
}

export class HubspotConnector extends TemplateConnector {
  constructor(init: { source: IntegrationSource; userId: string; credentials: ConnectorCredentials }) {
    super(init, {
      source: "hubspot",
      name: "HubSpot",
      baseUrl: "https://api.hubapi.com",
      authUrl: "https://app.hubspot.com/oauth/authorize",
      tokenUrl: "https://api.hubapi.com/oauth/v1/token",
      defaultScopes: ["crm.objects.contacts.read", "crm.objects.contacts.write"],
    });
  }
}

export class MailchimpConnector extends TemplateConnector {
  constructor(init: { source: IntegrationSource; userId: string; credentials: ConnectorCredentials }) {
    super(init, {
      source: "mailchimp",
      name: "Mailchimp",
      baseUrl: "https://us1.api.mailchimp.com/3.0",
      authUrl: "https://login.mailchimp.com/oauth2/authorize",
      tokenUrl: "https://login.mailchimp.com/oauth2/token",
      defaultScopes: [],
    });
  }
}

export class KlaviyoConnector extends TemplateConnector {
  constructor(init: { source: IntegrationSource; userId: string; credentials: ConnectorCredentials }) {
    super(init, {
      source: "klaviyo",
      name: "Klaviyo",
      baseUrl: "https://a.klaviyo.com/api",
      authUrl: "https://www.klaviyo.com/oauth/authorize",
      tokenUrl: "https://a.klaviyo.com/oauth/token",
      defaultScopes: ["accounts:read", "lists:read", "profiles:read"],
    });
  }
}

export class PipedriveConnector extends TemplateConnector {
  constructor(init: { source: IntegrationSource; userId: string; credentials: ConnectorCredentials }) {
    super(init, {
      source: "pipedrive",
      name: "Pipedrive",
      baseUrl: "https://api.pipedrive.com/v1",
      authUrl: "https://oauth.pipedrive.com/oauth/authorize",
      tokenUrl: "https://oauth.pipedrive.com/oauth/token",
      defaultScopes: ["base", "deals:full", "contacts:full"],
    });
  }
}

// --- Dev / Project Management ---

export class GitlabConnector extends TemplateConnector {
  constructor(init: { source: IntegrationSource; userId: string; credentials: ConnectorCredentials }) {
    super(init, {
      source: "gitlab",
      name: "GitLab",
      baseUrl: "https://gitlab.com/api/v4",
      authUrl: "https://gitlab.com/oauth/authorize",
      tokenUrl: "https://gitlab.com/oauth/token",
      defaultScopes: ["api", "read_user"],
    });
  }
}

export class JiraConnector extends TemplateConnector {
  constructor(init: { source: IntegrationSource; userId: string; credentials: ConnectorCredentials }) {
    super(init, {
      source: "jira",
      name: "Jira",
      baseUrl: "https://api.atlassian.com",
      authUrl: "https://auth.atlassian.com/authorize",
      tokenUrl: "https://auth.atlassian.com/oauth/token",
      defaultScopes: ["read:jira-work", "write:jira-work", "read:me"],
    });
  }
}

export class LinearConnector extends TemplateConnector {
  constructor(init: { source: IntegrationSource; userId: string; credentials: ConnectorCredentials }) {
    super(init, {
      source: "linear",
      name: "Linear",
      baseUrl: "https://api.linear.app/graphql",
      authUrl: "https://linear.app/oauth/authorize",
      tokenUrl: "https://api.linear.app/oauth/token",
      defaultScopes: ["read", "write"],
    });
  }
}

export class VercelConnector extends TemplateConnector {
  constructor(init: { source: IntegrationSource; userId: string; credentials: ConnectorCredentials }) {
    super(init, {
      source: "vercel",
      name: "Vercel",
      baseUrl: "https://api.vercel.com",
      authUrl: "https://vercel.com/integrations/new",
      tokenUrl: "https://api.vercel.com/v2/oauth/access_token",
      defaultScopes: ["projects", "deployments"],
    });
  }
}

// --- Productivity ---

export class AsanaConnector extends TemplateConnector {
  constructor(init: { source: IntegrationSource; userId: string; credentials: ConnectorCredentials }) {
    super(init, {
      source: "asana",
      name: "Asana",
      baseUrl: "https://app.asana.com/api/1.0",
      authUrl: "https://app.asana.com/-/oauth_authorize",
      tokenUrl: "https://app.asana.com/-/oauth_token",
      defaultScopes: ["default"],
    });
  }
}

export class MondayConnector extends TemplateConnector {
  constructor(init: { source: IntegrationSource; userId: string; credentials: ConnectorCredentials }) {
    super(init, {
      source: "monday",
      name: "Monday.com",
      baseUrl: "https://api.monday.com/v2",
      authUrl: "https://auth.monday.com/oauth2/authorize",
      tokenUrl: "https://auth.monday.com/oauth2/token",
      defaultScopes: ["boards:read", "boards:write", "users:read"],
    });
  }
}

export class CanvaConnector extends TemplateConnector {
  constructor(init: { source: IntegrationSource; userId: string; credentials: ConnectorCredentials }) {
    super(init, {
      source: "canva",
      name: "Canva",
      baseUrl: "https://api.canva.com/rest/v1",
      authUrl: "https://www.canva.com/api/oauth/authorize",
      tokenUrl: "https://api.canva.com/rest/v1/oauth/token",
      defaultScopes: ["design:read", "design:write"],
    });
  }
}
