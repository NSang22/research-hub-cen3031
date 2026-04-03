/**
 * Daily Message Digest
 *
 * Sends a daily email to users with unread messages received in the past 24 hours.
 * Only applies to users who have opted in (notify_new_messages = true) and whose
 * notification_frequency is set to 'daily'. Runs as a cron job at 8 AM EST.
 */

import pool from '../db/pool.js';
import { sendMessageDigestEmail } from './email.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DailyDigestResult = {
  sent: number;
  skipped: number;
  errors: number;
};

type DailyDigestUser = {
  userId: string;
  email: string;
  firstName: string;
};

export type ConversationPreview = {
  conversationId: string;
  senderName: string;
  /** Capped at 100 characters as per acceptance criteria */
  messagePreview: string;
  sentAt: Date;
};

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function fetchDigestRecipients(): Promise<DailyDigestUser[]> {
  const result = await pool.query(
    `SELECT DISTINCT u.id AS user_id, u.email, u.first_name
     FROM message_notification_queue mnq
     JOIN user_notification_settings uns ON uns.user_id = mnq.user_id
     JOIN users u ON u.id = mnq.user_id
     JOIN messages m ON m.id = mnq.message_id
     WHERE mnq.sent_at IS NULL
       AND m.read_at IS NULL
       AND m.created_at >= NOW() - INTERVAL '24 hours'
       AND uns.notify_new_messages = true
       AND uns.notification_frequency = 'daily'`
  );
  return result.rows.map((r) => ({
    userId: r.user_id as string,
    email: r.email as string,
    firstName: r.first_name as string,
  }));
}

async function fetchUnreadPreviews(userId: string): Promise<ConversationPreview[]> {
  const result = await pool.query(
    `SELECT
       mnq.conversation_id,
       m.id AS message_id,
       m.body,
       m.created_at,
       sender.first_name AS sender_first_name,
       sender.last_name  AS sender_last_name
     FROM message_notification_queue mnq
     JOIN messages m ON m.id = mnq.message_id
     JOIN users sender ON sender.id = m.sender_id
     JOIN user_notification_settings uns ON uns.user_id = mnq.user_id
     WHERE mnq.user_id = $1
       AND mnq.sent_at IS NULL
       AND m.read_at IS NULL
       AND m.created_at >= NOW() - INTERVAL '24 hours'
       AND uns.notify_new_messages = true
       AND uns.notification_frequency = 'daily'
     ORDER BY m.created_at DESC`,
    [userId]
  );

  const byConversation = new Map<string, ConversationPreview>();
  for (const row of result.rows) {
    const cid = row.conversation_id as string;
    if (!byConversation.has(cid)) {
      const senderName =
        `${(row.sender_first_name as string) ?? ''} ${(row.sender_last_name as string) ?? ''}`.trim() ||
        'A ResearchHub user';
      const rawBody = ((row.body as string) ?? '').slice(0, 100);
      byConversation.set(cid, {
        conversationId: cid,
        senderName,
        messagePreview: rawBody,
        sentAt: new Date(row.created_at as string),
      });
    }
  }

  return Array.from(byConversation.values());
}

async function markMessagesSent(userId: string): Promise<void> {
  await pool.query(
    `UPDATE message_notification_queue
     SET sent_at = NOW()
     WHERE user_id = $1
       AND sent_at IS NULL
       AND message_id IN (
         SELECT m.id FROM messages m
         WHERE m.sender_id != $1
           AND m.created_at >= NOW() - INTERVAL '24 hours'
       )`,
    [userId]
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function processDailyMessageDigest(): Promise<DailyDigestResult> {
  const recipients = await fetchDigestRecipients();

  // No opted-in users with unread messages — nothing to do
  if (recipients.length === 0) {
    console.log('[message-digest] No daily digest recipients with unread messages');
    return { sent: 0, skipped: 0, errors: 0 };
  }

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const recipient of recipients) {
    try {
      const previews = await fetchUnreadPreviews(recipient.userId);

      if (previews.length === 0) {
        skipped++;
        continue;
      }

      await sendMessageDigestEmail({
        toEmail: recipient.email,
        firstName: recipient.firstName,
        conversations: previews,
        userId: recipient.userId,
      });

      // Email sending will be wired in next commit
      await markMessagesSent(recipient.userId);
      sent++;

      console.log(
        `[message-digest] Queued digest for ${recipient.email} (${previews.length} thread(s))`
      );
    } catch (err) {
      errors++;
      console.error(`[message-digest] Failed to process digest for ${recipient.email}:`, err);
    }
  }

  console.log(`[message-digest] Completed - sent: ${sent}, skipped: ${skipped}, errors: ${errors}`);
  return { sent, skipped, errors };
}
