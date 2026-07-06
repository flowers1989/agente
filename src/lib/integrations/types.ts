// ==================== TIPOS DEL SISTEMA DE INTEGRACIÓN ====================

export type IntegrationSource =
  | "figma"
  | "onedrive"
  | "google-drive"
  | "local"
  | "skill"
  | "slack"
  | "gmail"
  | "github"
  | "notion"
  | "google-sheets"
  | "discord"
  | "telegram"
  | "shopify"
  | "stripe"
  | "paypal"
  | "woocommerce"
  | "square"
  | "salesforce"
  | "hubspot"
  | "mailchimp"
  | "klaviyo"
  | "pipedrive"
  | "gitlab"
  | "jira"
  | "linear"
  | "vercel"
  | "asana"
  | "monday"
  | "canva";

export type ConnectorType = "oauth2" | "rest" | "bot" | "webhook" | "graphql";

export type ResourceType =
  | "file"
  | "folder"
  | "design"
  | "skill"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "pdf"
  | "image"
  | "video"
  | "audio";

export type SyncStatus = "synced" | "syncing" | "pending" | "error";

export interface ResourcePermission {
  userId: string;
  role: "owner" | "editor" | "viewer";
  grantedAt: Date;
}

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  source: IntegrationSource;
  mimeType?: string;
  size: number;
  url?: string;
  localPath?: string;
  thumbnailUrl?: string;
  content?: string;
  metadata: ResourceMetadata;
  syncStatus: SyncStatus;
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResourceMetadata {
  createdAt: Date;
  modifiedAt: Date;
  owner: string;
  shared: boolean;
  permissions: ResourcePermission[];
  external?: Record<string, unknown>;
}

export interface IntegrationConfig {
  source: IntegrationSource;
  apiKey?: string;
  refreshToken?: string;
  accessToken?: string;
  expiresAt?: Date;
  scopes?: string[];
  enabled: boolean;
}

export interface ConnectorCredentials {
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  expiresAt?: Date;
  scopes?: string[];
  tokenType?: string;
  accountId?: string;
  metadata?: Record<string, unknown>;
}

export interface OAuth2AppCredentials {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  scopes?: string[];
}

export interface ListFilters {
  query?: string;
  type?: ResourceType;
  limit?: number;
  offset?: number;
}

// ==================== TIPOS DEL SISTEMA DE CONECTORES (FASE 2) ====================

export interface ConnectorActionParam {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  required?: boolean;
  description?: string;
}

export interface ConnectorActionDefinition {
  name: string;
  description: string;
  params: ConnectorActionParam[];
}

export interface ConnectorActionRequest {
  action: string;
  params?: Record<string, unknown>;
}

export interface ConnectorActionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface ConnectorDefinition {
  source: IntegrationSource;
  name: string;
  description: string;
  type: ConnectorType;
  icon?: string;
  priority: "high" | "medium" | "low";
  scopes: string[];
  actions: ConnectorActionDefinition[];
  supportsOAuth: boolean;
  supportsApiKey: boolean;
  authUrl?: string;
  tokenUrl?: string;
}
