CREATE TABLE IF NOT EXISTS audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action        VARCHAR(50)  NOT NULL,   -- 'view' | 'search' | 'export'
  resource_type VARCHAR(100) NOT NULL,   -- 'student_profile' | 'application'
  resource_id   TEXT         NOT NULL,
  ip_address    TEXT,
  metadata      JSONB,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_admin_id    ON audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at  ON audit_log(created_at DESC);
