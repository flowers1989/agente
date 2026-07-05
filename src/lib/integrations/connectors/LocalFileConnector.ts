// ==================== LOCAL FILE CONNECTOR ====================
// Gestiona archivos subidos localmente por el usuario.

import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { BaseConnector } from "../BaseConnector";
import type {
  ConnectorCredentials,
  IntegrationSource,
  ListFilters,
  Resource,
  ResourceMetadata,
} from "../types";

export class LocalFileConnector extends BaseConnector {
  private uploadDir: string;

  constructor(init: { source: IntegrationSource; userId: string; credentials: ConnectorCredentials }) {
    super(init);
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "upload");
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async authenticate(): Promise<void> {
    // No requiere autenticación
  }

  async listResources(filters?: ListFilters): Promise<Resource[]> {
    const rows = await this.getDb().resource.findMany({
      where: { userId: this.userId, source: "local" },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => this.rowToResource(row));
  }

  async getResource(id: string): Promise<Resource> {
    const row = await this.getDb().resource.findFirst({
      where: { id, userId: this.userId, source: "local" },
    });

    if (!row) {
      throw new Error(`Recurso no encontrado: ${id}`);
    }

    return this.rowToResource(row);
  }

  async uploadResource(file: File): Promise<Resource> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `${timestamp}_${safeName}`;
    const filepath = path.join(this.uploadDir, filename);

    fs.writeFileSync(filepath, buffer);

    const thumbnailName = `${filename}_thumb.jpg`;
    let thumbnailUrl: string | undefined;
    if (file.type.startsWith("image/")) {
      try {
        thumbnailUrl = await this.generateThumbnail(filepath, thumbnailName);
      } catch (error) {
        console.error("Error generando thumbnail:", error);
      }
    }

    const now = new Date();
    const metadata: ResourceMetadata = {
      createdAt: now,
      modifiedAt: now,
      owner: this.userId,
      shared: false,
      permissions: [],
    };

    return {
      id: `local_${timestamp}`,
      name: file.name,
      type: this.getFileType(file.type),
      source: "local",
      mimeType: file.type,
      size: file.size,
      url: `/api/uploads/${filename}`,
      localPath: filepath,
      thumbnailUrl: thumbnailUrl ? `/api/uploads/${thumbnailName}` : undefined,
      metadata,
      syncStatus: "synced",
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    };
  }

  async deleteResource(id: string): Promise<void> {
    const resource = await this.getResource(id);
    if (resource.localPath && fs.existsSync(resource.localPath)) {
      fs.unlinkSync(resource.localPath);
    }
    await this.getDb().resource.delete({ where: { id } });
  }

  async search(query: string): Promise<Resource[]> {
    const rows = await this.getDb().resource.findMany({
      where: {
        userId: this.userId,
        source: "local",
        name: { contains: query, mode: "insensitive" },
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => this.rowToResource(row));
  }

  private getFileType(mimeType: string): Resource["type"] {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    if (mimeType.includes("pdf")) return "pdf";
    if (mimeType.includes("document") || mimeType.includes("word")) return "document";
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "spreadsheet";
    return "file";
  }

  private async generateThumbnail(filepath: string, thumbnailName: string): Promise<string> {
    const sharp = await import("sharp");
    const thumbnailPath = path.join(this.uploadDir, thumbnailName);

    await sharp.default(filepath)
      .resize(200, 200, { fit: "cover" })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    return `/api/uploads/${thumbnailName}`;
  }

  private getDb() {
    return db;
  }

  private rowToResource(row: {
    id: string;
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
      source: "local",
      name: row.name,
      type: row.type as Resource["type"],
      mimeType: row.mimeType || undefined,
      size: row.size,
      url: row.url || undefined,
      localPath: row.localPath || undefined,
      thumbnailUrl: row.thumbnailUrl || undefined,
      metadata: JSON.parse(row.metadata) as ResourceMetadata,
      syncStatus: row.syncStatus as Resource["syncStatus"],
      lastSyncedAt: row.lastSyncedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
