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
