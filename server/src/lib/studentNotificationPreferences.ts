import pool from '../db/pool.js';

export const VALID_NOTIFICATION_FREQUENCIES = ['immediately', 'hourly', 'daily', 'weekly'] as const;
export type ValidNotificationFrequency = (typeof VALID_NOTIFICATION_FREQUENCIES)[number];

export interface NotificationPreferencesDTO {
  notifyNewPositions: boolean;
  notificationKeywords: string[];
  notificationDepartments: string[];
  notificationFrequency: string;
}

export interface NotificationPreferencesUpdateBody {
  notifyNewPositions?: boolean;
  notificationKeywords?: string[];
  notificationDepartments?: string[];
  notificationFrequency?: string;
}

const MAX_KEYWORDS = 25;
const MAX_DEPARTMENTS = 15;
const MAX_TAG_LENGTH = 80;

function normalizeStringArray(
  raw: unknown,
  maxItems: number,
  maxLen: number,
  fieldLabel: string
): { ok: true; value: string[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) {
    return { ok: false, error: `${fieldLabel} must be an array` };
  }
  if (raw.length > maxItems) {
    return { ok: false, error: `${fieldLabel} cannot exceed ${maxItems} entries` };
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== 'string') {
      return { ok: false, error: `Each ${fieldLabel} entry must be a string` };
    }
    const t = item.trim();
    if (!t) {
      return { ok: false, error: `${fieldLabel} entries cannot be empty` };
    }
    if (t.length > maxLen) {
      return { ok: false, error: `${fieldLabel} entries must be at most ${maxLen} characters` };
    }
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return { ok: true, value: out };
}

export function validateNotificationPreferencesUpdate(body: NotificationPreferencesUpdateBody):
  | { ok: true; keywords: string[] | null; departments: string[] | null }
  | { ok: false; error: string } {
  if (
    body.notificationFrequency !== undefined &&
    !VALID_NOTIFICATION_FREQUENCIES.includes(body.notificationFrequency as ValidNotificationFrequency)
  ) {
    return {
      ok: false,
      error: `notificationFrequency must be one of: ${VALID_NOTIFICATION_FREQUENCIES.join(', ')}`,
    };
  }

  let keywords: string[] | null = null;
  let departments: string[] | null = null;

  if (body.notificationKeywords !== undefined) {
    const r = normalizeStringArray(body.notificationKeywords, MAX_KEYWORDS, MAX_TAG_LENGTH, 'Keywords');
    if (!r.ok) return r;
    keywords = r.value;
  }
  if (body.notificationDepartments !== undefined) {
    const r = normalizeStringArray(body.notificationDepartments, MAX_DEPARTMENTS, MAX_TAG_LENGTH, 'Departments');
    if (!r.ok) return r;
    departments = r.value;
  }

  return { ok: true, keywords, departments };
}

export function rowToNotificationPreferences(row: {
  notify_new_positions: boolean;
  notification_keywords: unknown;
  notification_departments: unknown;
  notification_frequency: string;
}): NotificationPreferencesDTO {
  return {
    notifyNewPositions: row.notify_new_positions,
    notificationKeywords: (row.notification_keywords as string[]) ?? [],
    notificationDepartments: (row.notification_departments as string[]) ?? [],
    notificationFrequency: row.notification_frequency ?? 'hourly',
  };
}

export async function fetchNotificationPreferencesForUser(
  userId: string
): Promise<NotificationPreferencesDTO | null> {
  const result = await pool.query(
    `SELECT notify_new_positions, notification_keywords, notification_departments, notification_frequency
     FROM student_profiles WHERE user_id = $1`,
    [userId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return rowToNotificationPreferences(row);
}

export async function updateNotificationPreferencesForUser(
  userId: string,
  body: NotificationPreferencesUpdateBody
): Promise<{ ok: true; data: NotificationPreferencesDTO } | { ok: false; error: string; status: number }> {
  const v = validateNotificationPreferencesUpdate(body);
  if (!v.ok) {
    return { ok: false, error: v.error, status: 400 };
  }

  const kwParam = v.keywords !== null ? v.keywords : null;
  const deptParam = v.departments !== null ? v.departments : null;

  const result = await pool.query(
    `UPDATE student_profiles SET
       notify_new_positions     = COALESCE($1, notify_new_positions),
       notification_keywords    = COALESCE($2, notification_keywords),
       notification_departments = COALESCE($3, notification_departments),
       notification_frequency   = COALESCE($4, notification_frequency),
       updated_at               = NOW()
     WHERE user_id = $5
     RETURNING notify_new_positions, notification_keywords, notification_departments, notification_frequency`,
    [
      body.notifyNewPositions ?? null,
      kwParam,
      deptParam,
      body.notificationFrequency ?? null,
      userId,
    ]
  );
  const row = result.rows[0];
  if (!row) {
    return { ok: false, error: 'Profile not found', status: 404 };
  }
  return { ok: true, data: rowToNotificationPreferences(row) };
}
