import pool from '../db/pool.js';
import {
  sendNotificationDigestEmail,
  NotificationPosition,
  NotificationMessageThread,
} from './email.js';

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
  userId: string;
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
    `SELECT sp.id, sp.user_id, sp.gpa, sp.skills, sp.interests,
            uns.notification_keywords, uns.notification_departments
     FROM student_profiles sp
     JOIN user_notification_settings uns ON uns.user_id = sp.user_id
     WHERE uns.notify_new_positions = true`
  );
  return result.rows.map((r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    gpa: r.gpa !== null ? parseFloat(r.gpa as string) : null,
    skills: (r.skills as string[]) ?? [],
    interests: (r.interests as string[]) ?? [],
    notification_keywords: (r.notification_keywords as string[]) ?? [],
    notification_departments: (r.notification_departments as string[]) ?? [],
  }));
}

// ---------------------------------------------------------------------------
// Public API — positions
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Public API — messages
// ---------------------------------------------------------------------------

/**
 * Queue a newly-sent message for digest delivery to its recipient. Respects
 * the recipient's `notify_new_messages` flag. Silently no-ops if the recipient
 * has the feature disabled.
 */
export async function queueMessageNotification(
  recipientUserId: string,
  conversationId: string,
  messageId: string
): Promise<void> {
  const prefs = await pool.query(
    `SELECT notify_new_messages FROM user_notification_settings WHERE user_id = $1`,
    [recipientUserId]
  );
  if (prefs.rows.length === 0 || prefs.rows[0].notify_new_messages !== true) return;

  await pool.query(
    `INSERT INTO message_notification_queue (user_id, conversation_id, message_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, message_id) DO NOTHING`,
    [recipientUserId, conversationId, messageId]
  );
}

// ---------------------------------------------------------------------------
// Unified digest processing
// ---------------------------------------------------------------------------

type UserDigestState = {
  email: string;
  firstName: string;
  userId: string;
  studentProfileId: string | null;
  lastSentAt: Date | null;
  frequency: NotificationFrequency;
  notifyNewPositions: boolean;
  notifyNewMessages: boolean;
  positionEntries: Array<{ queueId: string; position: NotificationPosition }>;
  messageQueueIds: string[];
  messagesByConversation: Map<
    string,
    { fromName: string; previews: Array<{ body: string; createdAt: Date }>; unreadCount: number }
  >;
};

/**
 * Processes both queues together: for each user with pending items (positions
 * or messages), if their cooldown has elapsed, send one digest email covering
 * everything, then mark both queues' entries as sent and bump last_sent_at.
 *
 * @param bypassRateLimit  Skip the cooldown check (dev/test only).
 */
export async function processNotificationQueue(bypassRateLimit = false): Promise<void> {
  const byUser = new Map<string, UserDigestState>();

  // ── Positions ───────────────────────────────────────────────────────────
  const posRows = await pool.query(
    `SELECT nq.id as queue_id, nq.position_id,
            sp.user_id, sp.id as student_profile_id,
            u.email, u.first_name,
            uns.notification_last_sent_at, uns.notification_frequency,
            uns.notify_new_positions, uns.notify_new_messages,
            rp.title, rp.description,
            pp.name as pi_name, pp.department
     FROM notification_queue nq
     JOIN student_profiles sp ON sp.id = nq.student_id
     JOIN user_notification_settings uns ON uns.user_id = sp.user_id
     JOIN users u ON u.id = sp.user_id
     JOIN research_positions rp ON rp.id = nq.position_id
     JOIN pi_profiles pp ON pp.id = rp.pi_id
     WHERE nq.sent_at IS NULL
       AND rp.status = 'open'
       AND uns.notify_new_positions = true
     ORDER BY sp.user_id, nq.queued_at`
  );

  for (const row of posRows.rows) {
    const uid = row.user_id as string;
    if (!byUser.has(uid)) {
      byUser.set(uid, {
        email: row.email as string,
        firstName: row.first_name as string,
        userId: uid,
        studentProfileId: row.student_profile_id as string,
        lastSentAt: row.notification_last_sent_at
          ? new Date(row.notification_last_sent_at as string)
          : null,
        frequency: (row.notification_frequency as NotificationFrequency) ?? 'hourly',
        notifyNewPositions: row.notify_new_positions as boolean,
        notifyNewMessages: row.notify_new_messages as boolean,
        positionEntries: [],
        messageQueueIds: [],
        messagesByConversation: new Map(),
      });
    }
    byUser.get(uid)!.positionEntries.push({
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

  // ── Messages ────────────────────────────────────────────────────────────
  // Only include messages that are still unread (read_at IS NULL) — if the
  // user already opened the conversation, no reason to email them about it.
  const msgRows = await pool.query(
    `SELECT mnq.id as queue_id, mnq.user_id, mnq.conversation_id, mnq.message_id,
            u.email, u.first_name,
            uns.notification_last_sent_at, uns.notification_frequency,
            uns.notify_new_positions, uns.notify_new_messages,
            sp.id as student_profile_id,
            m.body, m.created_at,
            sender.first_name as sender_first_name, sender.last_name as sender_last_name
     FROM message_notification_queue mnq
     JOIN user_notification_settings uns ON uns.user_id = mnq.user_id
     JOIN users u ON u.id = mnq.user_id
     JOIN messages m ON m.id = mnq.message_id
     JOIN users sender ON sender.id = m.sender_id
     LEFT JOIN student_profiles sp ON sp.user_id = mnq.user_id
     WHERE mnq.sent_at IS NULL
       AND m.read_at IS NULL
       AND uns.notify_new_messages = true
     ORDER BY mnq.user_id, m.created_at`
  );

  for (const row of msgRows.rows) {
    const uid = row.user_id as string;
    if (!byUser.has(uid)) {
      byUser.set(uid, {
        email: row.email as string,
        firstName: row.first_name as string,
        userId: uid,
        studentProfileId: (row.student_profile_id as string | null) ?? null,
        lastSentAt: row.notification_last_sent_at
          ? new Date(row.notification_last_sent_at as string)
          : null,
        frequency: (row.notification_frequency as NotificationFrequency) ?? 'hourly',
        notifyNewPositions: row.notify_new_positions as boolean,
        notifyNewMessages: row.notify_new_messages as boolean,
        positionEntries: [],
        messageQueueIds: [],
        messagesByConversation: new Map(),
      });
    }
    const state = byUser.get(uid)!;
    state.messageQueueIds.push(row.queue_id as string);
    const cid = row.conversation_id as string;
    const fromName =
      `${(row.sender_first_name as string) ?? ''} ${(row.sender_last_name as string) ?? ''}`.trim() ||
      'A ResearchHub user';
    let thread = state.messagesByConversation.get(cid);
    if (!thread) {
      thread = { fromName, previews: [], unreadCount: 0 };
      state.messagesByConversation.set(cid, thread);
    }
    thread.unreadCount += 1;
    thread.previews.push({
      body: (row.body as string) ?? '',
      createdAt: new Date(row.created_at as string),
    });
  }

  if (byUser.size === 0) return;

  const now = new Date();

  for (const [userId, state] of byUser) {
    const cooldownMs = COOLDOWN_MS[state.frequency] ?? COOLDOWN_MS.hourly;
    const cooldownExpiry = state.lastSentAt
      ? new Date(state.lastSentAt.getTime() + cooldownMs)
      : null;

    if (!bypassRateLimit && cooldownMs > 0 && cooldownExpiry && cooldownExpiry > now) {
      console.log(
        `[notifications] Rate-limited user ${userId} (${state.frequency}) — next send after ${cooldownExpiry.toISOString()}`
      );
      continue;
    }

    const positions = state.positionEntries.map((e) => e.position);
    const messages: NotificationMessageThread[] = Array.from(state.messagesByConversation.entries()).map(
      ([conversationId, thread]) => {
        const latest = thread.previews.reduce<{ body: string; createdAt: Date } | null>(
          (acc, p) => (acc === null || p.createdAt > acc.createdAt ? p : acc),
          null
        );
        return {
          conversationId,
          fromName: thread.fromName,
          unreadCount: thread.unreadCount,
          latestPreview: latest?.body ?? '',
        };
      }
    );

    if (positions.length === 0 && messages.length === 0) continue;

    const positionQueueIds = state.positionEntries.map((e) => e.queueId);
    const messageQueueIds = state.messageQueueIds;

    try {
      await sendNotificationDigestEmail({
        toEmail: state.email,
        firstName: state.firstName,
        positions,
        messages,
        userId,
      });

      if (positionQueueIds.length > 0) {
        await pool.query(
          `UPDATE notification_queue SET sent_at = NOW() WHERE id = ANY($1::uuid[])`,
          [positionQueueIds]
        );
      }
      if (messageQueueIds.length > 0) {
        await pool.query(
          `UPDATE message_notification_queue SET sent_at = NOW() WHERE id = ANY($1::uuid[])`,
          [messageQueueIds]
        );
      }
      await pool.query(
        `UPDATE user_notification_settings SET notification_last_sent_at = NOW(), updated_at = NOW()
         WHERE user_id = $1`,
        [userId]
      );

      console.log(
        `[notifications] Sent digest to ${state.email}: ${positions.length} position(s), ${messages.length} message thread(s)`
      );
    } catch (err) {
      console.error(`[notifications] Failed to send digest to ${state.email}:`, err);
    }
  }
}
