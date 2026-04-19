-- Notification preferences on student profiles
ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS notify_new_positions boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_keywords text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notification_departments text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notification_last_sent_at timestamptz;

-- Queue for pending notification emails
CREATE TABLE IF NOT EXISTS notification_queue (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES student_profiles (id) ON DELETE CASCADE,
  position_id uuid NOT NULL REFERENCES research_positions (id) ON DELETE CASCADE,
  queued_at   timestamptz NOT NULL DEFAULT now(),
  sent_at     timestamptz,
  UNIQUE (student_id, position_id)
);

CREATE INDEX IF NOT EXISTS notification_queue_student_id_idx ON notification_queue (student_id);
CREATE INDEX IF NOT EXISTS notification_queue_unsent_idx     ON notification_queue (queued_at) WHERE sent_at IS NULL;
