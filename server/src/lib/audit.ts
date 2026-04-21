import type { Request } from 'express';
import pool from '../db/pool.js';

interface AuditEntry {
  adminId: string;
  action: 'view' | 'search' | 'export';
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget audit log write. Never throws — a logging failure
 * should never cause the primary request to fail.
 */
export function logAudit(entry: AuditEntry, req: Request): void {
  const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
    ?? req.socket?.remoteAddress
    ?? null;

  pool.query(
    `INSERT INTO audit_log (admin_id, action, resource_type, resource_id, ip_address, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [entry.adminId, entry.action, entry.resourceType, entry.resourceId, ip, entry.metadata ?? null]
  ).catch((err: unknown) => {
    console.error('[audit] write failed:', err);
  });
}
