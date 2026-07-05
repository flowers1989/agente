// ==================== AUDIT LOGGER ====================
// Registra llamadas a conectores para auditoría y debugging.

import { db } from "@/lib/db";
import type { IntegrationSource } from "../types";

export interface AuditEntry {
  userId: string;
  source: IntegrationSource;
  action: string;
  success: boolean;
  request?: unknown;
  response?: unknown;
  error?: string;
  durationMs: number;
}

export class AuditLogger {
  async log(entry: AuditEntry): Promise<void> {
    try {
      await db.connectorAuditLog.create({
        data: {
          userId: entry.userId,
          source: entry.source,
          action: entry.action,
          success: entry.success,
          request: JSON.stringify(entry.request ?? {}),
          response: JSON.stringify(entry.response ?? {}),
          error: entry.error ?? null,
          durationMs: entry.durationMs,
        },
      });
    } catch (error) {
      console.error("[AuditLogger] Failed to write audit log:", error);
    }
  }
}

export const auditLogger = new AuditLogger();
