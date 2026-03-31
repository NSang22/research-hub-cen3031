/**
 * Daily Message Digest
 *
 * Sends a daily email to users with unread messages received in the past 24 hours.
 * Only applies to users who have opted in (notify_new_messages = true) and whose
 * notification_frequency is set to 'daily'. Runs as a cron job at 8 AM EST.
 */

import pool from '../db/pool.js';

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

type ConversationPreview = {
  conversationId: string;
  senderName: string;
  messagePreview: string;
  sentAt: Date;
};

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

/**
 * Fetches users who:
 *   - have notify_new_messages = true
 *   - have notification_frequency = 'daily'
 *   - have at least one unread message received in the past 24 hours
 */
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

