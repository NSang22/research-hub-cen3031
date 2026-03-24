-- =============================================================================
-- ResearchHub Database Schema
-- Target: Supabase (PostgreSQL 15)
-- Run each section in order via the Supabase SQL Editor.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "pg_trgm";    -- trigram indexes for text search


-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type user_role as enum ('student', 'pi', 'study_participant', 'admin');

create type application_status as enum (
  'pending',
  'reviewing',
  'accepted',
  'rejected',
  'withdrawn'
);

create type position_status as enum ('open', 'closed', 'filled');

create type study_status as enum ('recruiting', 'closed', 'completed');

create type compensation_type as enum ('paid', 'unpaid', 'credit', 'stipend');

create type academic_level as enum (
  'freshman',
  'sophomore',
  'junior',
  'senior',
  'masters',
  'phd',
  'postdoc'
);


-- ---------------------------------------------------------------------------
-- Table: users
-- Core identity record. One row per registered account.
-- ---------------------------------------------------------------------------
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text not null,
  role          user_role not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table  users              is 'Core user accounts shared across all roles.';
comment on column users.role         is 'Determines which profile table holds the extended data.';
comment on column users.password_hash is 'bcrypt hash — never store plaintext passwords.';

create index if not exists users_email_idx on users (email);
create index if not exists users_role_idx  on users (role);


-- ---------------------------------------------------------------------------
-- Table: student_profiles
-- Extended data for users with role = ''student''.
-- ---------------------------------------------------------------------------
create table if not exists student_profiles (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null unique references users (id) on delete cascade,
  major          text,
  gpa            numeric(3, 2) check (gpa >= 0 and gpa <= 4.0),
  skills         text[]        not null default '{}',
  resume_url     text,
  interests      text[]        not null default '{}',
  academic_level academic_level,
  created_at     timestamptz   not null default now(),
  updated_at     timestamptz   not null default now()
);

comment on table  student_profiles               is 'Profile details for student users.';
comment on column student_profiles.skills        is 'Free-form skill tags, e.g. ["Python","R","Statistics"].';
comment on column student_profiles.interests     is 'Research interest tags used for position matching.';
comment on column student_profiles.academic_level is 'Current academic standing of the student.';

create index if not exists student_profiles_user_id_idx on student_profiles (user_id);


-- ---------------------------------------------------------------------------
-- Table: pi_profiles
-- Extended data for users with role = ''pi'' (Principal Investigator).
-- ---------------------------------------------------------------------------
create table if not exists pi_profiles (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null unique references users (id) on delete cascade,
  name             text not null,
  department       text not null,
  research_areas   text[]      not null default '{}',
  lab_name         text,
  staffing_needs   text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table  pi_profiles                  is 'Profile details for Principal Investigator users.';
comment on column pi_profiles.research_areas   is 'Tags describing the lab''s research domains.';
comment on column pi_profiles.staffing_needs   is 'Free-text description of current hiring needs.';

create index if not exists pi_profiles_user_id_idx    on pi_profiles (user_id);
create index if not exists pi_profiles_department_idx on pi_profiles (department);


-- ---------------------------------------------------------------------------
-- Table: study_participant_profiles
-- Extended data for users with role = ''study_participant''.
-- ---------------------------------------------------------------------------
create table if not exists study_participant_profiles (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null unique references users (id) on delete cascade,
  availability              jsonb not null default '{}',
  demographics              jsonb not null default '{}',
  participation_preferences jsonb not null default '{}',
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

comment on table  study_participant_profiles                        is 'Profile details for study participant users.';
comment on column study_participant_profiles.availability           is 'JSON schedule object, e.g. {"weekdays": true, "mornings": false}.';
comment on column study_participant_profiles.demographics           is 'Self-reported demographic info used for study eligibility matching.';
comment on column study_participant_profiles.participation_preferences is 'Preferences such as remote_only, compensation_required, etc.';

create index if not exists study_participant_profiles_user_id_idx on study_participant_profiles (user_id);


-- ---------------------------------------------------------------------------
-- updated_at trigger (shared function)
-- Automatically bumps updated_at on every row update.
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger trg_users_updated_at
  before update on users
  for each row execute function set_updated_at();

create or replace trigger trg_student_profiles_updated_at
  before update on student_profiles
  for each row execute function set_updated_at();

create or replace trigger trg_pi_profiles_updated_at
  before update on pi_profiles
  for each row execute function set_updated_at();

create or replace trigger trg_study_participant_profiles_updated_at
  before update on study_participant_profiles
  for each row execute function set_updated_at();


-- ---------------------------------------------------------------------------
-- Table: research_positions
-- Job-like listings posted by PIs for student research assistants.
-- ---------------------------------------------------------------------------
create table if not exists research_positions (
  id              uuid primary key default gen_random_uuid(),
  pi_id           uuid not null references pi_profiles (id) on delete cascade,
  title           text not null,
  description     text not null,
  qualifications  text,
  compensation_type compensation_type not null,
  time_commitment text,
  status          position_status not null default 'open',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table  research_positions                  is 'Research assistant positions posted by PIs.';
comment on column research_positions.qualifications   is 'Free-text required/preferred qualifications.';
comment on column research_positions.time_commitment  is 'e.g. "10 hrs/week" or "Summer 2026 full-time".';

create index if not exists research_positions_pi_id_idx on research_positions (pi_id);
create index if not exists research_positions_status_idx on research_positions (status);
create index if not exists research_positions_title_trgm_idx
  on research_positions using gin (title gin_trgm_ops);

create or replace trigger trg_research_positions_updated_at
  before update on research_positions
  for each row execute function set_updated_at();


-- ---------------------------------------------------------------------------
-- Table: study_listings
-- Study recruitment posts for participant users.
-- ---------------------------------------------------------------------------
create table if not exists study_listings (
  id                   uuid primary key default gen_random_uuid(),
  pi_id                uuid not null references pi_profiles (id) on delete cascade,
  title                text not null,
  eligibility_criteria text,
  compensation_details text,
  scheduling_options   jsonb not null default '{}',
  status               study_status not null default 'recruiting',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

comment on table  study_listings                      is 'Study participant recruitment listings posted by PIs.';
comment on column study_listings.eligibility_criteria is 'Plain-text description of who qualifies to participate.';
comment on column study_listings.compensation_details is 'e.g. "$20 Amazon gift card upon completion".';
comment on column study_listings.scheduling_options   is 'JSON describing session options, e.g. {"remote": true, "sessions": [...]}.';

create index if not exists study_listings_pi_id_idx  on study_listings (pi_id);
create index if not exists study_listings_status_idx on study_listings (status);
create index if not exists study_listings_title_trgm_idx
  on study_listings using gin (title gin_trgm_ops);

create or replace trigger trg_study_listings_updated_at
  before update on study_listings
  for each row execute function set_updated_at();


-- ---------------------------------------------------------------------------
-- Table: applications
-- Student applications to research_positions.
-- ---------------------------------------------------------------------------
create table if not exists applications (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid not null references student_profiles (id) on delete cascade,
  position_id       uuid not null references research_positions (id) on delete cascade,
  personal_statement text,
  status            application_status not null default 'pending',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- Prevent duplicate applications to the same position
  unique (student_id, position_id)
);

comment on table  applications                    is 'Applications submitted by students to research positions.';
comment on column applications.personal_statement is 'Cover letter / statement of interest.';

create index if not exists applications_student_id_idx  on applications (student_id);
create index if not exists applications_position_id_idx on applications (position_id);
create index if not exists applications_status_idx      on applications (status);

create or replace trigger trg_applications_updated_at
  before update on applications
  for each row execute function set_updated_at();


-- ---------------------------------------------------------------------------
-- Row Level Security (RLS)
-- Enable RLS on every table. Policies delegate enforcement to the API layer
-- using the service-role client where elevated access is required.
-- ---------------------------------------------------------------------------
alter table users                      enable row level security;
alter table student_profiles           enable row level security;
alter table pi_profiles                enable row level security;
alter table study_participant_profiles enable row level security;
alter table research_positions         enable row level security;
alter table study_listings             enable row level security;
alter table applications               enable row level security;

-- Public read: anyone can browse open positions and recruiting studies
create policy "Public read open positions"
  on research_positions for select
  using (status = 'open');

create policy "Public read recruiting studies"
  on study_listings for select
  using (status = 'recruiting');

-- PI read/write: a PI may only manage their own rows
create policy "PI manages own positions"
  on research_positions for all
  using (pi_id in (
    select id from pi_profiles where user_id = auth.uid()
  ));

create policy "PI manages own study listings"
  on study_listings for all
  using (pi_id in (
    select id from pi_profiles where user_id = auth.uid()
  ));

-- Student read/write: a student may only see and manage their own applications
create policy "Student manages own applications"
  on applications for all
  using (student_id in (
    select id from student_profiles where user_id = auth.uid()
  ));

-- PI read: a PI may read applications for their own positions
create policy "PI reads applications for own positions"
  on applications for select
  using (position_id in (
    select id from research_positions
    where pi_id in (
      select id from pi_profiles where user_id = auth.uid()
    )
  ));
