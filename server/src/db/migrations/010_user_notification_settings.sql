-- Unified per-user notification settings (replaces the student-only columns
-- from 007_notification_preferences + 008_notification_frequency for anything
-- that isn't student-specific matching state).
CREATE TABLE IF NOT EXISTS user_notification_settings (
  user_id                    uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  notify_new_positions       boolean NOT NULL DEFAULT false,
  notify_new_messages        boolean NOT NULL DEFAULT true,
  notification_keywords      text[] NOT NULL DEFAULT '{}',
  notification_departments   text[] NOT NULL DEFAULT '{}',
  notification_frequency     text NOT NULL DEFAULT 'hourly'
                             CHECK (notification_frequency IN ('immediately','hourly','daily','weekly')),
  notification_last_sent_at  timestamptz,
  created_at                 timestamptz NOT NULL DEFAULT NOW(),
  updated_at                 timestamptz NOT NULL DEFAULT NOW()
);

-- Carry over each student's existing preferences by user_id so nothing is lost.
INSERT INTO user_notification_settings
  (user_id, notify_new_positions, notification_keywords, notification_departments,
   notification_frequency, notification_last_sent_at)
SELECT
  sp.user_id,
  sp.notify_new_positions,
  sp.notification_keywords,
  sp.notification_departments,
  sp.notification_frequency,
  sp.notification_last_sent_at
FROM student_profiles sp
ON CONFLICT (user_id) DO NOTHING;

-- Everyone else (PIs, admins, etc.) gets defaults — notify_new_messages=true so
-- replies don't silently drop on the floor.
INSERT INTO user_notification_settings (user_id)
SELECT u.id FROM users u
ON CONFLICT (user_id) DO NOTHING;
