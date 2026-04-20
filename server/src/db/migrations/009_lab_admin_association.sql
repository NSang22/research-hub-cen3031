-- Migration 009: Associate PIs with a lab administrator
-- Adds lab_admin_id to pi_profiles so each PI can belong to a lab
-- managed by a user with role = 'admin' (lab administrator).

ALTER TABLE pi_profiles
  ADD COLUMN IF NOT EXISTS lab_admin_id uuid REFERENCES users (id) ON DELETE SET NULL;

-- Index for fast look-up of all PIs in a given lab
CREATE INDEX IF NOT EXISTS pi_profiles_lab_admin_id_idx ON pi_profiles (lab_admin_id);
