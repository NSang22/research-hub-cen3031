import { PoolClient } from 'pg';
import pool from '../db/pool.js';
import type { Request } from 'express';

export type AuditAction = 'view' | 'export' | 'search';
export type AuditResourceType = 'student_profile' | 'application';

interface AuditEntry {
  adminId: string;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export function logAudit(
  entry: AuditEntry,
  req?: Request | { ip?: string; headers?: Record<string, string> }
): void {
  const ip = entry.ipAddress ?? (req && 'ip' in req ? (req as any).ip : undefined);
  const ua = entry.userAgent ?? (req && 'headers' in req ? (req as any).headers?.['user-agent'] : undefined);
  const sql = `INSERT INTO audit_log (admin_id, action, resource_type, resource_id, ip_address, user_agent, metadata) VALUES ($1, $2, $3, $4, $5::inet, $6, $7::jsonb)`;
  pool.query(sql, [
    entry.adminId, entry.action, entry.resourceType, entry.resourceId,
    ip ?? null, ua ?? null, entry.metadata ? JSON.stringify(entry.metadata) : null,
  ]).catch((err: unknown) => { console.error('[audit] Failed to write audit log:', err); });
}

export async function queryStudentsForAdmin(
  adminId: string,
  opts: { studentId?: string; major?: string; minGpa?: number; skills?: string[]; yearLevel?: string },
  client?: PoolClient
) {
  const db = client ?? pool;
  const filters: string[] = [`pip.lab_admin_id = $1`];
  const params: unknown[] = [adminId];
  let idx = 2;
  filters.push(`EXISTS (SELECT 1 FROM applications a JOIN research_positions rp ON rp.id = a.position_id JOIN pi_profiles pip ON pip.id = rp.pi_id WHERE a.student_id = sp.id AND pip.lab_admin_id = $1)`);
  if (opts.studentId) { filters.push(`sp.id = $${idx++}`); params.push(opts.studentId); }
  if (opts.major) { filters.push(`sp.major ILIKE $${idx++}`); params.push(`%${opts.major}%`); }
  if (opts.minGpa !== undefined) { filters.push(`sp.gpa >= $${idx++}`); params.push(opts.minGpa); }
  if (opts.skills && opts.skills.length > 0) { filters.push(`sp.skills && $${idx++}::text[]`); params.push(opts.skills); }
  if (opts.yearLevel) { filters.push(`sp.academic_level = $${idx++}`); params.push(opts.yearLevel); }
  const where = `WHERE ${filters.join(' AND ')}`;
  const result = await db.query(`SELECT sp.*, u.first_name, u.last_name, u.email FROM student_profiles sp JOIN users u ON u.id = sp.user_id ${where} ORDER BY sp.updated_at DESC`, params);
  return { rows: result.rows, rowCount: result.rowCount ?? 0 };
}

export async function queryApplicationsForAdmin(
  adminId: string,
  opts: { applicationId?: string; positionId?: string },
  client?: PoolClient
) {
  const db = client ?? pool;
  const filters: string[] = [`pip.lab_admin_id = $1`];
  const params: unknown[] = [adminId];
  let idx = 2;
  if (opts.applicationId) { filters.push(`a.id = $${idx++}`); params.push(opts.applicationId); }
  if (opts.positionId) { filters.push(`a.position_id = $${idx++}`); params.push(opts.positionId); }
  const where = `WHERE ${filters.join(' AND ')}`;
  const q = `SELECT a.*, sp.major, sp.gpa, sp.skills, sp.bio, sp.resume_url, sp.academic_level, u.id AS student_user_id, u.first_name, u.last_name, u.email, rp.title AS position_title, pip.lab_name, pip.department FROM applications a JOIN research_positions rp ON rp.id = a.position_id JOIN pi_profiles pip ON pip.id = rp.pi_id JOIN student_profiles sp ON sp.id = a.student_id JOIN users u ON u.id = sp.user_id ${where} ORDER BY a.created_at DESC`;
  const result = await db.query(q, params);
  return { rows: result.rows, rowCount: result.rowCount ?? 0 };
}
