ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS notification_frequency text NOT NULL DEFAULT 'hourly'
  CHECK (notification_frequency IN ('immediately', 'hourly', 'daily', 'weekly'));
