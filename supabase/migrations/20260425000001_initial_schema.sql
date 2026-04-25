-- ─────────────────────────────────────────────────────────────
-- Salone del Mobile companion — initial schema
-- ─────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";
create extension if not exists "unaccent";
create extension if not exists "pg_trgm";

-- ─────────────────────────────────────────────────────────────
-- Helper: trigger to auto-update updated_at
-- ─────────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ─────────────────────────────────────────────────────────────
-- companies: master catalog (imported from Salone)
-- ─────────────────────────────────────────────────────────────
create table companies (
  id              uuid primary key default gen_random_uuid(),
  external_id     text unique,
  name            text not null,
  name_normalized text generated always as (lower(unaccent(name))) stored,
  stand_number    text,
  pavilion        text,
  hall            text,
  website         text,
  email           text,
  phone           text,
  description     text,
  logo_url        text,
  source          text not null default 'imported'
                  check (source in ('imported','scraped','user_created')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_companies_name_trgm on companies using gin (name_normalized gin_trgm_ops);
create index idx_companies_stand on companies (pavilion, stand_number);
create index idx_companies_external on companies (external_id) where external_id is not null;

create trigger trg_companies_updated_at
  before update on companies
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- tags
-- ─────────────────────────────────────────────────────────────
create table tags (
  id    uuid primary key default gen_random_uuid(),
  name  text unique not null,
  color text default '#888888'
);

create table company_tags (
  company_id uuid not null references companies(id) on delete cascade,
  tag_id     uuid not null references tags(id) on delete cascade,
  primary key (company_id, tag_id)
);

create index idx_company_tags_tag on company_tags (tag_id);

-- ─────────────────────────────────────────────────────────────
-- visits: one row per (user, company) — the user's interaction
-- ─────────────────────────────────────────────────────────────
create table visits (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  company_id   uuid not null references companies(id) on delete cascade,
  status       text not null default 'not_visited'
               check (status in ('not_visited','visited','follow_up')),
  notes        text,
  ai_summary   text,
  visited_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, company_id)
);

create index idx_visits_user on visits (user_id);
create index idx_visits_user_status on visits (user_id, status);

create trigger trg_visits_updated_at
  before update on visits
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- images: photos linked to a visit
-- ─────────────────────────────────────────────────────────────
create table images (
  id             uuid primary key default gen_random_uuid(),
  visit_id       uuid not null references visits(id) on delete cascade,
  storage_path   text not null,
  thumbnail_path text,
  caption        text,
  taken_at       timestamptz,
  uploaded_at    timestamptz not null default now(),
  width          int,
  height         int,
  bytes          int
);

create index idx_images_visit on images (visit_id);

-- ─────────────────────────────────────────────────────────────
-- contacts: business cards, optionally linked to a company
-- ─────────────────────────────────────────────────────────────
create table contacts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  company_id      uuid references companies(id) on delete set null,
  full_name       text,
  role            text,
  email           text,
  phone           text,
  raw_ocr_text    text,
  card_image_path text not null,
  confidence      numeric(4,3),
  created_at      timestamptz not null default now()
);

create index idx_contacts_user on contacts (user_id);
create index idx_contacts_company on contacts (company_id);
create index idx_contacts_email on contacts (lower(email)) where email is not null;

-- ─────────────────────────────────────────────────────────────
-- voice_notes
-- ─────────────────────────────────────────────────────────────
create table voice_notes (
  id           uuid primary key default gen_random_uuid(),
  visit_id     uuid not null references visits(id) on delete cascade,
  audio_path   text not null,
  transcript   text,
  duration_sec int,
  created_at   timestamptz not null default now()
);

create index idx_voice_notes_visit on voice_notes (visit_id);

-- ─────────────────────────────────────────────────────────────
-- sync_log: for offline conflict tracking
-- ─────────────────────────────────────────────────────────────
create table sync_log (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  table_name  text not null,
  row_id      uuid not null,
  operation   text not null check (operation in ('insert','update','delete')),
  client_ts   timestamptz,
  server_ts   timestamptz not null default now()
);

create index idx_sync_log_user on sync_log (user_id, server_ts desc);

-- ─────────────────────────────────────────────────────────────
-- View: company_with_visit — convenience join for the app
-- ─────────────────────────────────────────────────────────────
create or replace view company_with_visit as
select
  c.*,
  v.id          as visit_id,
  v.user_id     as visit_user_id,
  v.status      as visit_status,
  v.notes       as visit_notes,
  v.visited_at  as visit_visited_at
from companies c
left join visits v on v.company_id = c.id;
