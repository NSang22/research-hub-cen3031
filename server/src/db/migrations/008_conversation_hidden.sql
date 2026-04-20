-- Migration 008: Add hidden flag to conversation_participants
-- Instead of removing a participant row on delete, we set hidden = true.
-- This preserves the participant relationship so the other user can still
-- send messages and the conversation history is never lost.

alter table conversation_participants
  add column if not exists hidden boolean not null default false;
