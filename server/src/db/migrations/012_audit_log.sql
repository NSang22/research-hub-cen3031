-- Audit logging for lab administrator read-only access
CREATE TABLE IF NOT EXISTS audit_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id      UUID        NOT NULL REFERENCES users(id),
  action        VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id   UUID        NOT NULL,
  ip_address    INET,
  user_agent    TEXT,
  metadata      JSONB,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_log_admin_id_idx ON audit_log(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_resource_idx ON audit_log(resource_type, resource_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log(created_at DESC);
