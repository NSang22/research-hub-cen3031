-- Migration 004: Direct messaging system
-- Creates conversations and messages tables for PI-Student messaging

-- Table: conversations
-- Stores a conversation between two or more participants
create table if not exists conversations (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Table: conversation_participants
-- Links users to conversations (many-to-many)
create table if not exists conversation_participants (
  conversation_id uuid not null references conversations (id) on delete cascade,
  user_id         uuid not null references users (id) on delete cascade,
  joined_at       timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

-- Table: messages
-- Individual messages within a conversation
create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id       uuid not null references users (id) on delete cascade,
  body            text not null,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

-- Indexes for performance
create index if not exists conversation_participants_user_id_idx on conversation_participants (user_id);
create index if not exists messages_conversation_id_idx on messages (conversation_id);
create index if not exists messages_sender_id_idx on messages (sender_id);
create index if not exists messages_created_at_idx on messages (created_at);

-- Updated_at trigger for conversations
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger trg_conversations_updated_at
  before update on conversations for each row execute function set_updated_at();

create or replace trigger trg_messages_updated_at
  before update on messages for each row execute function set_updated_at();

-- Row Level Security
alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table messages enable row level security;

-- Users can access conversations they are participants of
create policy "Users can view their conversations"
  on conversations for select
  using (
    id in (
      select conversation_id from conversation_participants where user_id = auth.uid()
    )
  );

create policy "Users can create conversations"
  on conversations for insert
  with check (
    id in (
      select conversation_id from conversation_participants where user_id = auth.uid()
    )
  );

-- Users can view messages in their conversations
create policy "Users can view messages in their conversations"
  on messages for select
  using (
    conversation_id in (
      select conversation_id from conversation_participants where user_id = auth.uid()
    )
  );

create policy "Users can send messages to their conversations"
  on messages for insert
  with check (
    conversation_id in (
      select conversation_id from conversation_participants where user_id = auth.uid()
    )
  );