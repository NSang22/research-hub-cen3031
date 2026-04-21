import pool from '../db/pool.js';

export const VALID_NOTIFICATION_FREQUENCIES = ['immediately', 'hourly', 'daily', 'weekly'] as const;
export type ValidNotificationFrequency = (typeof VALID_NOTIFICATION_FREQUENCIES)[number];

export interface NotificationPreferencesDTO {
  notifyNewPositions: boolean;
  notifyNewMessages: boolean;
  notificationKeywords: string[];
  notificationDepartments: string[];
  notificationFrequency: string;
}

export interface NotificationPreferencesUpdateBody {
  notifyNewPositions?: boolean;
  notifyNewMessages?: boolean;
  notificationKeywords?: string[];
  notificationDepartments?: string[];
  notificationFrequency?: string;
}

/**
 * Maximum number of custom keyword entries a student can set.
 */
const MAX_KEYWORDS = 25;
/**
 * Maximum number of department filter entries a student can set.
 */
const MAX_DEPARTMENTS = 15;
/**
 * Maximum character length for each keyword or department tag.
 */
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
  notify_new_messages: boolean;
  notification_keywords: unknown;
  notification_departments: unknown;
  notification_frequency: string;
}): NotificationPreferencesDTO {
  return {
    notifyNewPositions: row.notify_new_positions,
    notifyNewMessages: row.notify_new_messages,
    notificationKeywords: (row.notification_keywords as string[]) ?? [],
    notificationDepartments: (row.notification_departments as string[]) ?? [],
    notificationFrequency: row.notification_frequency ?? 'hourly',
  };
}

export async function fetchNotificationPreferencesForUser(
  userId: string
): Promise<NotificationPreferencesDTO | null> {
  const result = await pool.query(
    `SELECT notify_new_positions, notify_new_messages,
            notification_keywords, notification_departments, notification_frequency
     FROM user_notification_settings WHERE user_id = $1`,
    [userId]
  );
  if (result.rows.length > 0) {
    return rowToNotificationPreferences(result.rows[0]);
  }
  // First-time fetch for a user whose settings row hasn't been created yet
  // (e.g. new signup after the backfill migration). Create defaults and return.
  const created = await pool.query(
    `INSERT INTO user_notification_settings (user_id) VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING
     RETURNING notify_new_positions, notify_new_messages,
               notification_keywords, notification_departments, notification_frequency`,
    [userId]
  );
  if (created.rows.length > 0) {
    return rowToNotificationPreferences(created.rows[0]);
  }
  // Raced against a concurrent insert — re-read
  const reread = await pool.query(
    `SELECT notify_new_positions, notify_new_messages,
            notification_keywords, notification_departments, notification_frequency
     FROM user_notification_settings WHERE user_id = $1`,
    [userId]
  );
  return reread.rows.length > 0 ? rowToNotificationPreferences(reread.rows[0]) : null;
}

export async function updateNotificationPreferencesForUser(
  userId: string,
  body: NotificationPreferencesUpdateBody
): Promise<{ ok: true; data: NotificationPreferencesDTO } | { ok: false; error: string; status: number }> {
  const v = validateNotificationPreferencesUpdate(body);
  if (!v.ok) {
    return { ok: false, error: v.error, status: 400 };
  }

  // Make sure the row exists before the UPDATE — new users may not have one yet.
  await pool.query(
    `INSERT INTO user_notification_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );

  const kwParam = v.keywords !== null ? v.keywords : null;
  const deptParam = v.departments !== null ? v.departments : null;

  const result = await pool.query(
    `UPDATE user_notification_settings SET
       notify_new_positions     = COALESCE($1, notify_new_positions),
       notify_new_messages      = COALESCE($2, notify_new_messages),
       notification_keywords    = COALESCE($3, notification_keywords),
       notification_departments = COALESCE($4, notification_departments),
       notification_frequency   = COALESCE($5, notification_frequency),
       updated_at               = NOW()
     WHERE user_id = $6
     RETURNING notify_new_positions, notify_new_messages,
               notification_keywords, notification_departments, notification_frequency`,
    [
      body.notifyNewPositions ?? null,
      body.notifyNewMessages ?? null,
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
