import pool from '../db/pool.js';
import { sendPositionNotificationEmail, NotificationPosition } from './email.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PositionMeta = {
  id: string;
  title: string;
  description: string;
  required_skills: string[];
  min_gpa: number | null;
  department: string;
  pi_name: string;
  research_areas: string[];
};

export type NotificationFrequency = 'immediately' | 'hourly' | 'daily' | 'weekly';

type StudentMeta = {
  id: string;
  gpa: number | null;
  skills: string[];
  interests: string[];
  notification_keywords: string[];
  notification_departments: string[];
};

export type MatchReason = 'skill_overlap' | 'gpa_match' | 'keyword_filter';

export type MatchResult = {
  studentId: string;
  reason: MatchReason;
};

// ---------------------------------------------------------------------------
// Core matching logic (pure — no DB calls)
//
// Rules:
//   1. Department gate (exclusive): if the student has department filters, the
//      position's department must match one of them. Empty = all departments.
//   2. Content match (at least one must be true):
//        a. Skill overlap  — student skills ∩ position required_skills
//        b. GPA qualifies  — student GPA meets (or position has no) min_gpa
//        c. Keyword match  — any custom keyword hits title/desc/research areas
//   3. If the student has no skills, no GPA, and no keywords → no match
//      (encourages profile completion instead of spamming every opted-in student)
// ---------------------------------------------------------------------------

export function matchStudent(student: StudentMeta, pos: PositionMeta): MatchReason | null {
  const positionDept = pos.department.toLowerCase();
  const positionTitle = pos.title.toLowerCase();
  const positionDesc = pos.description.toLowerCase();
  const positionSkills = pos.required_skills;
  const piResearchAreas = pos.research_areas;

  const keywords = student.notification_keywords;
  const deptFilters = student.notification_departments;
  const studentSkills = student.skills;

  // ── 1. Department gate ───────────────────────────────────────────────────
  if (deptFilters.length > 0) {
    const deptPass = deptFilters.some((d) => positionDept.includes(d.toLowerCase()));
    if (!deptPass) return null;
  }

  // ── 2a. Skill overlap ────────────────────────────────────────────────────
  const skillMatch =
    studentSkills.length > 0 &&
    positionSkills.some((sk) =>
      studentSkills.some((ss) => ss.toLowerCase() === sk.toLowerCase())
    );
  if (skillMatch) return 'skill_overlap';

  // ── 2b. GPA qualifies ────────────────────────────────────────────────────
  // Student GPA must be set, and must meet the position's minimum (if any)
  const gpaMatch =
    student.gpa !== null &&
    (pos.min_gpa === null || student.gpa >= pos.min_gpa);
  if (gpaMatch) return 'gpa_match';

  // ── 2c. Keyword filter ───────────────────────────────────────────────────
  const keywordMatch =
    keywords.length > 0 &&
    keywords.some((kw) => {
      const k = kw.toLowerCase();
      return (
        positionTitle.includes(k) ||
        positionDesc.includes(k) ||
        piResearchAreas.some((ra) => ra.toLowerCase().includes(k)) ||
        positionSkills.some((sk) => sk.toLowerCase().includes(k))
      );
    });
  if (keywordMatch) return 'keyword_filter';

  return null;
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function fetchPosition(positionId: string): Promise<PositionMeta | null> {
  const result = await pool.query(
    `SELECT rp.id, rp.title, rp.description, rp.required_skills, rp.min_gpa,
            pp.department, pp.name as pi_name, pp.research_areas
     FROM research_positions rp
     JOIN pi_profiles pp ON pp.id = rp.pi_id
     WHERE rp.id = $1 AND rp.status = 'open'`,
    [positionId]
  );
  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  return {
    id: r.id as string,
    title: (r.title as string) ?? '',
    description: (r.description as string) ?? '',
    required_skills: (r.required_skills as string[]) ?? [],
    min_gpa: r.min_gpa !== null ? parseFloat(r.min_gpa as string) : null,
    department: (r.department as string) ?? '',
    pi_name: (r.pi_name as string) ?? '',
    research_areas: (r.research_areas as string[]) ?? [],
  };
}

const COOLDOWN_MS: Record<NotificationFrequency, number> = {
  immediately: 0,
  hourly:      60 * 60 * 1000,
  daily:       24 * 60 * 60 * 1000,
  weekly:      7 * 24 * 60 * 60 * 1000,
};

async function fetchOptedInStudents(): Promise<StudentMeta[]> {
  const result = await pool.query(
    `SELECT sp.id, sp.gpa, sp.skills, sp.interests,
            sp.notification_keywords, sp.notification_departments
     FROM student_profiles sp
     WHERE sp.notify_new_positions = true`
  );
  return result.rows.map((r) => ({
    id: r.id as string,
    gpa: r.gpa !== null ? parseFloat(r.gpa as string) : null,
    skills: (r.skills as string[]) ?? [],
    interests: (r.interests as string[]) ?? [],
    notification_keywords: (r.notification_keywords as string[]) ?? [],
    notification_departments: (r.notification_departments as string[]) ?? [],
  }));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Dry run: returns which students would be matched for a position and why.
 * Does NOT write to DB or send emails.
 */
export async function dryRunMatchForPosition(positionId: string): Promise<{
  position: PositionMeta | null;
  matches: MatchResult[];
}> {
  const pos = await fetchPosition(positionId);
  if (!pos) return { position: null, matches: [] };

  const students = await fetchOptedInStudents();
  const matches: MatchResult[] = [];

  for (const student of students) {
    const reason = matchStudent(student, pos);
    if (reason) matches.push({ studentId: student.id, reason });
  }

  return { position: pos, matches };
}

/**
 * After a new position is created, find opted-in students whose profiles match
 * and insert them into the notification_queue.
 */
export async function queueNotificationsForPosition(positionId: string): Promise<void> {
  const pos = await fetchPosition(positionId);
  if (!pos) return;

  const students = await fetchOptedInStudents();
  const toQueue: string[] = [];

  for (const student of students) {
    if (matchStudent(student, pos)) toQueue.push(student.id);
  }

  if (toQueue.length === 0) return;

  for (const studentId of toQueue) {
    await pool.query(
      `INSERT INTO notification_queue (student_id, position_id)
       VALUES ($1, $2)
       ON CONFLICT (student_id, position_id) DO NOTHING`,
      [studentId, positionId]
    );
  }

  console.log(`[notifications] Queued position ${positionId} for ${toQueue.length} student(s)`);
}

/**
 * Process unsent queue entries: group by student, enforce 1-email-per-hour rate
 * limit, send batched emails, mark as sent.
 *
 * @param bypassRateLimit  Skip the 1-hour cooldown (dev/test only)
 */
export async function processNotificationQueue(bypassRateLimit = false): Promise<void> {
  const result = await pool.query(
    `SELECT nq.id as queue_id, nq.student_id, nq.position_id,
            nq.queued_at,
            u.email, u.first_name,
            sp.notification_last_sent_at,
            sp.notification_frequency,
            rp.title, rp.description,
            pp.name as pi_name, pp.department
     FROM notification_queue nq
     JOIN student_profiles sp ON sp.id = nq.student_id
     JOIN users u ON u.id = sp.user_id
     JOIN research_positions rp ON rp.id = nq.position_id
     JOIN pi_profiles pp ON pp.id = rp.pi_id
     WHERE nq.sent_at IS NULL
       AND rp.status = 'open'
       AND sp.notify_new_positions = true
     ORDER BY nq.student_id, nq.queued_at`
  );

  if (result.rows.length === 0) return;

  const byStudent = new Map<
    string,
    {
      email: string;
      firstName: string;
      studentProfileId: string;
      lastSentAt: Date | null;
      frequency: NotificationFrequency;
      entries: Array<{ queueId: string; position: NotificationPosition }>;
    }
  >();

  for (const row of result.rows) {
    const sid = row.student_id as string;
    if (!byStudent.has(sid)) {
      byStudent.set(sid, {
        email: row.email as string,
        firstName: row.first_name as string,
        studentProfileId: sid,
        lastSentAt: row.notification_last_sent_at
          ? new Date(row.notification_last_sent_at as string)
          : null,
        frequency: (row.notification_frequency as NotificationFrequency) ?? 'hourly',
        entries: [],
      });
    }
    byStudent.get(sid)!.entries.push({
      queueId: row.queue_id as string,
      position: {
        id: row.position_id as string,
        title: row.title as string,
        piName: (row.pi_name as string) ?? 'Unknown PI',
        department: (row.department as string) ?? 'Unknown Department',
        description: row.description as string | null,
      },
    });
  }

  const now = new Date();

  for (const [studentId, data] of byStudent) {
    const cooldownMs = COOLDOWN_MS[data.frequency] ?? COOLDOWN_MS.hourly;
    const cooldownExpiry = data.lastSentAt
      ? new Date(data.lastSentAt.getTime() + cooldownMs)
      : null;

    if (!bypassRateLimit && cooldownMs > 0 && cooldownExpiry && cooldownExpiry > now) {
      console.log(
        `[notifications] Rate-limited student ${studentId} (${data.frequency}) — next send after ${cooldownExpiry.toISOString()}`
      );
      continue;
    }

    const positions = data.entries.map((e) => e.position);
    const queueIds = data.entries.map((e) => e.queueId);

    try {
      await sendPositionNotificationEmail(data.email, data.firstName, positions, studentId);

      await pool.query(
        `UPDATE notification_queue SET sent_at = NOW() WHERE id = ANY($1::uuid[])`,
        [queueIds]
      );
      await pool.query(
        `UPDATE student_profiles SET notification_last_sent_at = NOW() WHERE id = $1`,
        [studentId]
      );

      console.log(`[notifications] Sent ${positions.length} position(s) to ${data.email}`);
    } catch (err) {
      console.error(`[notifications] Failed to send to ${data.email}:`, err);
    }
  }
}
