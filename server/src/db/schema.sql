-- =============================================================================
-- ResearchHub Database Schema
-- Target: Supabase (PostgreSQL 15)
-- Run each section in order via the Supabase SQL Editor.
-- =============================================================================

-- Extensions
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "pg_trgm";    -- trigram indexes for text search

-- Enums
create type user_role as enum ('student', 'pi', 'admin');
create type application_status as enum ('pending', 'reviewing', 'accepted', 'rejected', 'withdrawn');
create type position_status as enum ('open', 'closed', 'filled');
create type study_status as enum ('recruiting', 'closed', 'completed');
create type compensation_type as enum ('paid', 'unpaid', 'credit', 'stipend');
create type academic_level as enum ('freshman', 'sophomore', 'junior', 'senior', 'grad', 'masters', 'phd', 'postdoc');

-- Table: users
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text not null,
  role          user_role not null,
  first_name    text,
  last_name     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists users_email_idx on users (email);
create index if not exists users_role_idx  on users (role);

-- Table: student_profiles
create table if not exists student_profiles (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null unique references users (id) on delete cascade,
  major          text,
  gpa            numeric(3, 2) check (gpa >= 0 and gpa <= 4.0),
  graduation_year int,
  skills         text[]        not null default '{}',
  bio            text,
  resume_url     text,
  interests      text[]        not null default '{}',
  academic_level academic_level,
  created_at     timestamptz   not null default now(),
  updated_at     timestamptz   not null default now()
);
create index if not exists student_profiles_user_id_idx on student_profiles (user_id);

-- Table: pi_profiles
create table if not exists pi_profiles (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null unique references users (id) on delete cascade,
  name             text,
  department       text,
  research_areas   text[]      not null default '{}',
  lab_name         text,
  lab_website      text,
  staffing_needs   text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists pi_profiles_user_id_idx    on pi_profiles (user_id);
create index if not exists pi_profiles_department_idx on pi_profiles (department);

-- Shared updated_at trigger
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger trg_users_updated_at
  before update on users for each row execute function set_updated_at();
create or replace trigger trg_student_profiles_updated_at
  before update on student_profiles for each row execute function set_updated_at();
create or replace trigger trg_pi_profiles_updated_at
  before update on pi_profiles for each row execute function set_updated_at();

-- Table: research_positions (replaces the old "positions" table)
create table if not exists research_positions (
  id                uuid primary key default gen_random_uuid(),
  pi_id             uuid not null references pi_profiles (id) on delete cascade,
  title             text not null,
  description       text,
  required_skills   text[]           not null default '{}',
  qualifications    text,
  compensation_type compensation_type not null default 'unpaid',
  min_gpa           numeric(3, 2),
  time_commitment   text,
  deadline          timestamptz,
  status            position_status  not null default 'open',
  application_questions jsonb        not null default '[]'::jsonb,
  created_at        timestamptz      not null default now(),
  updated_at        timestamptz      not null default now()
);
create index if not exists research_positions_pi_id_idx     on research_positions (pi_id);
create index if not exists research_positions_status_idx    on research_positions (status);
create index if not exists research_positions_title_trgm_idx on research_positions using gin (title gin_trgm_ops);

create or replace trigger trg_research_positions_updated_at
  before update on research_positions for each row execute function set_updated_at();

-- Table: study_listings
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
create index if not exists study_listings_pi_id_idx  on study_listings (pi_id);
create index if not exists study_listings_status_idx on study_listings (status);
create index if not exists study_listings_title_trgm_idx on study_listings using gin (title gin_trgm_ops);

create or replace trigger trg_study_listings_updated_at
  before update on study_listings for each row execute function set_updated_at();

-- Table: applications
create table if not exists applications (
  id                 uuid primary key default gen_random_uuid(),
  student_id         uuid not null references student_profiles (id) on delete cascade,
  position_id        uuid not null references research_positions (id) on delete cascade,
  personal_statement text,
  question_answers   jsonb                not null default '{}'::jsonb,
  status             application_status not null default 'pending',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (student_id, position_id)
);
create index if not exists applications_student_id_idx  on applications (student_id);
create index if not exists applications_position_id_idx on applications (position_id);
create index if not exists applications_status_idx      on applications (status);

create or replace trigger trg_applications_updated_at
  before update on applications for each row execute function set_updated_at();

-- Row Level Security
alter table users                      enable row level security;
alter table student_profiles           enable row level security;
alter table pi_profiles                enable row level security;
alter table research_positions         enable row level security;
alter table study_listings             enable row level security;
alter table applications               enable row level security;

create policy "Public read open positions"
  on research_positions for select using (status = 'open');
create policy "Public read recruiting studies"
  on study_listings for select using (status = 'recruiting');
create policy "PI manages own positions"
  on research_positions for all
  using (pi_id in (select id from pi_profiles where user_id = auth.uid()));
create policy "PI manages own study listings"
  on study_listings for all
  using (pi_id in (select id from pi_profiles where user_id = auth.uid()));
create policy "Student manages own applications"
  on applications for all
  using (student_id in (select id from student_profiles where user_id = auth.uid()));
create policy "PI reads applications for own positions"
  on applications for select
  using (position_id in (
    select id from research_positions
    where pi_id in (select id from pi_profiles where user_id = auth.uid())
  ));
