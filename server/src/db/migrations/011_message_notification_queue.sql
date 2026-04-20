-- Per-recipient queue of unread messages waiting to go out in the next digest.
-- One row per (user, message). sent_at=NULL means the user hasn't gotten the
-- email yet. We delete rows when the user reads the message (or they get
-- cleared on COMMIT of the digest send).
CREATE TABLE IF NOT EXISTS message_notification_queue (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id  uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id       uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  queued_at        timestamptz NOT NULL DEFAULT NOW(),
  sent_at          timestamptz,
  UNIQUE (user_id, message_id)
);

CREATE INDEX IF NOT EXISTS message_notification_queue_user_id_idx
  ON message_notification_queue (user_id);
CREATE INDEX IF NOT EXISTS message_notification_queue_unsent_idx
  ON message_notification_queue (queued_at) WHERE sent_at IS NULL;
