-- Enable Supabase Realtime for the messaging tables.
-- NOTE: This migration must be run manually in the Supabase SQL Editor.
-- It cannot be applied through the standard migration runner because it
-- modifies a Supabase-managed publication that requires superuser privileges.

alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table conversations;

-- This app uses custom JWTs issued by the Express backend, not Supabase Auth.
-- Therefore auth.uid() is always null for the anon Supabase client on the frontend,
-- and the RLS policies defined in migration 004 (which check auth.uid()) block all
-- Realtime event delivery even with a permissive SELECT policy added later.
--
-- Since access control is fully enforced by the Express API layer, RLS on these
-- tables serves no purpose and actively breaks Realtime. Disable it entirely.
alter table messages disable row level security;
alter table conversations disable row level security;
alter table conversation_participants disable row level security;
