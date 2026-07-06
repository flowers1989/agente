// ==================== CONNECTOR MANAGER ====================
// Registro, orquestación y ejecución de acciones de conectores externos.

import { credentialManager } from "./managers/CredentialManager";
import { auditLogger } from "./managers/AuditLogger";
import { BaseConnector } from "./BaseConnector";
import { OAuth2Connector } from "./connectors/base/OAuth2Connector";
import { SlackConnector } from "./connectors/SlackConnector";
import { GmailConnector } from "./connectors/GmailConnector";
import { GithubConnector } from "./connectors/GithubConnector";
import { NotionConnector } from "./connectors/NotionConnector";
import { GoogleSheetsConnector } from "./connectors/GoogleSheetsConnector";
import { GoogleDriveConnector } from "./connectors/GoogleDriveConnector";
import { DiscordConnector } from "./connectors/DiscordConnector";
import { TelegramConnector } from "./connectors/TelegramConnector";
import { ShopifyConnector } from "./connectors/ShopifyConnector";
import { StripeConnector } from "./connectors/StripeConnector";
import {
  PaypalConnector,
  WooCommerceConnector,
  SquareConnector,
  SalesforceConnector,
  HubspotConnector,
  MailchimpConnector,
  KlaviyoConnector,
  PipedriveConnector,
  GitlabConnector,
  JiraConnector,
  LinearConnector,
  VercelConnector,
  AsanaConnector,
  MondayConnector,
  CanvaConnector,
} from "./connectors/SecondaryConnectors";
import {
  CONNECTOR_DEFINITIONS,
  getConnectorDefinition,
  listConnectorDefinitions,
} from "./ConnectorRegistry";
import type {
  ConnectorActionRequest,
  ConnectorActionResult,
  ConnectorDefinition,
  ConnectorCredentials,
  IntegrationSource,
} from "./types";

type ConnectorClass = new (init: {
  source: IntegrationSource;
  userId: string;
  credentials: ConnectorCredentials;
}) => BaseConnector;

export class ConnectorManager {
  private connectors = new Map<IntegrationSource, ConnectorClass>();

  constructor() {
    this.registerConnector("slack", SlackConnector);
    this.registerConnector("gmail", GmailConnector);
    this.registerConnector("github", GithubConnector);
    this.registerConnector("notion", NotionConnector);
    this.registerConnector("google-sheets", GoogleSheetsConnector);
    this.registerConnector("google-drive", GoogleDriveConnector);
    this.registerConnector("discord", DiscordConnector);
    this.registerConnector("telegram", TelegramConnector);

    // Conectores secundarios
    this.registerConnector("shopify", ShopifyConnector);
    this.registerConnector("stripe", StripeConnector);
    this.registerConnector("paypal", PaypalConnector);
    this.registerConnector("woocommerce", WooCommerceConnector);
    this.registerConnector("square", SquareConnector);
    this.registerConnector("salesforce", SalesforceConnector);
    this.registerConnector("hubspot", HubspotConnector);
    this.registerConnector("mailchimp", MailchimpConnector);
    this.registerConnector("klaviyo", KlaviyoConnector);
    this.registerConnector("pipedrive", PipedriveConnector);
    this.registerConnector("gitlab", GitlabConnector);
    this.registerConnector("jira", JiraConnector);
    this.registerConnector("linear", LinearConnector);
    this.registerConnector("vercel", VercelConnector);
    this.registerConnector("asana", AsanaConnector);
    this.registerConnector("monday", MondayConnector);
    this.registerConnector("canva", CanvaConnector);
  }

  registerConnector(source: IntegrationSource, connectorClass: ConnectorClass): void {
    this.connectors.set(source, connectorClass);
  }

  listDefinitions(): ConnectorDefinition[] {
    return listConnectorDefinitions();
  }

  getDefinition(source: IntegrationSource): ConnectorDefinition {
    return getConnectorDefinition(source);
  }

  async listConnectorStatus(userId: string): Promise<
    Array<ConnectorDefinition & { connected: boolean; expiresAt?: Date | null }>
  > {
    const accounts = await credentialManager.listAccounts(userId);
    const accountMap = new Map(accounts.map((a) => [a.source, a]));

    return listConnectorDefinitions().map((def) => {
      const account = accountMap.get(def.source);
      return {
        ...def,
        connected: Boolean(account?.enabled),
        expiresAt: account?.expiresAt,
      };
    });
  }

  async getConnector(userId: string, source: IntegrationSource): Promise<BaseConnector> {
    const ConnectorClass = this.connectors.get(source);
    if (!ConnectorClass) {
      throw new Error(`Conector no encontrado: ${source}`);
    }

    const credentials = (await credentialManager.getCredentials(userId, source)) || {};
    const connector = new ConnectorClass({ source, userId, credentials });

    if (connector instanceof OAuth2Connector) {
      const appCreds = await credentialManager.getAppCredentials(source);
      if (appCreds) {
        connector.setAppCredentials(appCreds);
      }
    }

    return connector;
  }

  async executeAction(
    userId: string,
    source: IntegrationSource,
    request: ConnectorActionRequest
  ): Promise<ConnectorActionResult> {
    const start = Date.now();
    const connector = await this.getConnector(userId, source);
    const def = getConnectorDefinition(source);
    const actionDef = def.actions.find((a) => a.name === request.action);

    if (!actionDef) {
      throw new Error(`Acción no soportada: ${request.action}`);
    }

    // Validar parámetros requeridos
    for (const param of actionDef.params) {
      if (param.required && request.params?.[param.name] === undefined) {
        throw new Error(`Parámetro requerido faltante: ${param.name}`);
      }
    }

    let result: ConnectorActionResult;
    try {
      const connectorAny = connector as unknown as Record<string, (params: unknown) => Promise<ConnectorActionResult>>;
      const method = connectorAny[request.action];
      if (typeof method !== "function") {
        throw new Error(`El conector ${source} no implementa ${request.action}`);
      }
      result = await method.call(connector, request.params || {});
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result = { success: false, error: message };
    }

    const duration = Date.now() - start;
    await auditLogger.log({
      userId,
      source,
      action: request.action,
      success: result.success,
      request: request.params,
      response: result.data,
      error: result.error,
      durationMs: duration,
    });

    // Persistir tokens refrescados si el conector los actualizó
    if (connector instanceof OAuth2Connector) {
      const updated = connector.getCurrentCredentials();
      const current = await credentialManager.getCredentials(userId, source);
      if (
        current &&
        (updated.accessToken !== current.accessToken ||
          updated.refreshToken !== current.refreshToken ||
          updated.expiresAt?.getTime() !== current.expiresAt?.getTime())
      ) {
        await credentialManager.saveCredentials(userId, source, updated);
      }
    }

    return result;
  }

  async getOAuthUrl(userId: string, source: IntegrationSource, state: string): Promise<string> {
    const connector = (await this.getConnector(userId, source)) as OAuth2Connector;
    return connector.getAuthorizationUrl(state);
  }

  async handleOAuthCallback(
    source: IntegrationSource,
    code: string,
    userId: string
  ): Promise<void> {
    const connector = (await this.getConnector(userId, source)) as OAuth2Connector;
    const credentials = await connector.exchangeCode(code);
    await credentialManager.saveCredentials(userId, source, credentials);
  }

  async saveCredentials(
    userId: string,
    source: IntegrationSource,
    credentials: ConnectorCredentials,
    name?: string
  ): Promise<void> {
    await credentialManager.saveCredentials(userId, source, credentials, name);
  }

  async deleteCredentials(userId: string, source: IntegrationSource): Promise<void> {
    try {
      const connector = await this.getConnector(userId, source);
      if (connector instanceof OAuth2Connector) {
        await connector.revokeToken();
      }
    } catch (error) {
      console.error(`[ConnectorManager] Failed to revoke token for ${source}:`, error);
      // Continuamos borrando las credenciales locales aunque falle la revocación remota.
    }
    await credentialManager.deleteAccount(userId, source);
  }

  async validateConnection(userId: string, source: IntegrationSource): Promise<boolean> {
    try {
      const connector = await this.getConnector(userId, source);
      return await connector.validateConnection();
    } catch (error) {
      console.error(`[ConnectorManager] Validation failed for ${source}:`, error);
      return false;
    }
  }
}

export const connectorManager = new ConnectorManager();
