// ==================== INTEGRATION MANAGER ====================
// Orquestador central del sistema de integración multi-fuente.

import { db } from "@/lib/db";
import { BaseConnector } from "./BaseConnector";
import { credentialManager } from "./managers/CredentialManager";
import { cacheManager } from "./managers/CacheManager";
import { LocalFileConnector } from "./connectors/LocalFileConnector";
import { FigmaConnector } from "./connectors/FigmaConnector";
import { GithubConnector } from "./connectors/GithubConnector";
import { GoogleDriveConnector } from "./connectors/GoogleDriveConnector";
import type {
  IntegrationSource,
  ListFilters,
  Resource,
  ConnectorCredentials,
} from "./types";

export class IntegrationManager {
  private connectors = new Map<IntegrationSource, new (init: {
    source: IntegrationSource;
    userId: string;
    credentials: ConnectorCredentials;
  }) => BaseConnector>();

  constructor() {
    this.registerConnector("local", LocalFileConnector);
    this.registerConnector("figma", FigmaConnector);
    this.registerConnector("github", GithubConnector);
    this.registerConnector("google-drive", GoogleDriveConnector);
  }

  registerConnector(
    source: IntegrationSource,
    connectorClass: new (init: {
      source: IntegrationSource;
      userId: string;
      credentials: ConnectorCredentials;
    }) => BaseConnector
  ): void {
    this.connectors.set(source, connectorClass);
  }

  async listConnectedSources(userId: string): Promise<IntegrationSource[]> {
    const accounts = await credentialManager.listAccounts(userId);
    return accounts
      .filter((a) => a.enabled)
      .map((a) => a.source as IntegrationSource);
  }

  async getConnector(
    userId: string,
    source: IntegrationSource
  ): Promise<BaseConnector> {
    const ConnectorClass = this.connectors.get(source);
    if (!ConnectorClass) {
      throw new Error(`Conector no encontrado: ${source}`);
    }

    const credentials = (await credentialManager.getCredentials(userId, source)) || {};
    return new ConnectorClass({ source, userId, credentials });
  }

  async listResources(
    userId: string,
    source: IntegrationSource,
    filters?: ListFilters
  ): Promise<Resource[]> {
    const cached = cacheManager.get<Resource[]>(`resources:${source}:${userId}`, filters);
    if (cached) return cached;

    const connector = await this.getConnector(userId, source);
    const resources = await connector.listResources(filters);

    const enriched = await Promise.all(
      resources.map((r) => this.enrichAndPersistResource(r, userId))
    );

    cacheManager.set(`resources:${source}:${userId}`, filters, enriched);
    return enriched;
  }

  async addResource(
    userId: string,
    source: IntegrationSource,
    resourceId: string
  ): Promise<Resource> {
    const connector = await this.getConnector(userId, source);
    const resource = await connector.getResource(resourceId);
    const enriched = await this.enrichAndPersistResource(resource, userId);
    cacheManager.invalidate(`resources:${source}:${userId}`);
    return enriched;
  }

  async uploadLocalFile(userId: string, file: File): Promise<Resource> {
    const connector = await this.getConnector(userId, "local");
    const resource = await connector.uploadResource(file);
    const enriched = await this.enrichAndPersistResource(resource, userId);
    cacheManager.invalidate(`resources:local:${userId}`);
    return enriched;
  }

  async searchResources(userId: string, query: string): Promise<Resource[]> {
    const sources = Array.from(this.connectors.keys());
    const results = await Promise.all(
      sources.map(async (source) => {
        try {
          const connector = await this.getConnector(userId, source);
          return await connector.search(query);
        } catch (error) {
          console.error(`[IntegrationManager] Error buscando en ${source}:`, error);
          return [];
        }
      })
    );
    return results.flat();
  }

  async getRecentResources(userId: string, limit = 10): Promise<Resource[]> {
    const rows = await db.resource.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return rows.map((row) => this.rowToResource(row));
  }

  async saveCredentials(
    userId: string,
    source: IntegrationSource,
    credentials: ConnectorCredentials,
    name?: string
  ): Promise<void> {
    await credentialManager.saveCredentials(userId, source, credentials, name);
  }

  async deleteResource(userId: string, id: string): Promise<void> {
    const resource = await db.resource.findFirst({
      where: { id, userId },
    });
    if (!resource) throw new Error("Recurso no encontrado");

    if (resource.source === "local" && resource.localPath) {
      try {
        const fs = await import("fs");
        if (fs.existsSync(resource.localPath)) {
          fs.unlinkSync(resource.localPath);
        }
      } catch (error) {
        console.error("Error eliminando archivo local:", error);
      }
    }

    await db.resource.delete({ where: { id } });
    cacheManager.invalidate(`resources:${resource.source}:${userId}`);
  }

  private async enrichAndPersistResource(
    resource: Resource,
    userId: string
  ): Promise<Resource> {
    const now = new Date();
    const enriched: Resource = {
      ...resource,
      syncStatus: "synced",
      lastSyncedAt: now,
    };

    await db.resource.upsert({
      where: {
        id: enriched.id,
      },
      create: {
        id: enriched.id,
        userId,
        source: enriched.source,
        externalId: enriched.id,
        name: enriched.name,
        type: enriched.type,
        mimeType: enriched.mimeType || null,
        size: enriched.size,
        url: enriched.url || null,
        localPath: enriched.localPath || null,
        thumbnailUrl: enriched.thumbnailUrl || null,
        metadata: JSON.stringify(enriched.metadata),
        syncStatus: enriched.syncStatus,
        lastSyncedAt: enriched.lastSyncedAt,
      },
      update: {
        name: enriched.name,
        type: enriched.type,
        mimeType: enriched.mimeType || null,
        size: enriched.size,
        url: enriched.url || null,
        localPath: enriched.localPath || null,
        thumbnailUrl: enriched.thumbnailUrl || null,
        metadata: JSON.stringify(enriched.metadata),
        syncStatus: enriched.syncStatus,
        lastSyncedAt: enriched.lastSyncedAt,
        updatedAt: now,
      },
    });

    return enriched;
  }

  private rowToResource(row: {
    id: string;
    source: string;
    externalId: string | null;
    name: string;
    type: string;
    mimeType: string | null;
    size: number;
    url: string | null;
    localPath: string | null;
    thumbnailUrl: string | null;
    metadata: string;
    syncStatus: string;
    lastSyncedAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }): Resource {
    return {
      id: row.id,
      source: row.source as IntegrationSource,
      name: row.name,
      type: row.type as Resource["type"],
      mimeType: row.mimeType || undefined,
      size: row.size,
      url: row.url || undefined,
      localPath: row.localPath || undefined,
      thumbnailUrl: row.thumbnailUrl || undefined,
      metadata: JSON.parse(row.metadata) as Resource["metadata"],
      syncStatus: row.syncStatus as Resource["syncStatus"],
      lastSyncedAt: row.lastSyncedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

export const integrationManager = new IntegrationManager();
