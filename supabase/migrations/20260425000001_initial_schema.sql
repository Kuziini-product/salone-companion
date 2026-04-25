-- ============================================================================
-- Salone Companion — Initial schema
-- ============================================================================
-- All user-owned rows carry user_id (= auth.uid()) so RLS can enforce isolation.
-- Catalog tables (companies, tags, company_tags) are global and read-only on
-- the client; only the importer (service-role) writes them.
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "unaccent";

-- ----------------------------------------------------------------------------
-- 1. Catalog: companies
-- ----------------------------------------------------------------------------
create table public.companies (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  -- normalized name for fuzzy/diacritic-insensitive search
  name_normalized text generated always as (lower(unaccent(name))) stored,
  hall            text,
  stand           text,
  website         text,
  description     text,
  logo_url        text,
  -- arbitrary structured data from the importer (booth size, country, etc.)
  meta            jsonb default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index companies_name_normalized_trgm on public.companies
  using gin (name_normalized gin_trgm_ops);
-- enable trigram for fuzzy matching
create extension if not exists pg_trgm;

create index companies_hall_idx on public.companies (hall);

-- ----------------------------------------------------------------------------
-- 2. Catalog: tags + many-to-many
-- ----------------------------------------------------------------------------
create table public.tags (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  color      text,
  created_at timestamptz not null default now()
);

create table public.company_tags (
  company_id uuid not null references public.companies(id) on delete cascade,
  tag_id     uuid not null references public.tags(id) on delete cascade,
  primary key (company_id, tag_id)
);

create index company_tags_tag_idx on public.company_tags (tag_id);

-- ----------------------------------------------------------------------------
-- 3. Per-user: visits
-- ----------------------------------------------------------------------------
create type public.visit_status as enum (
  'planned',
  'visited',
  'follow_up',
  'skipped'
);

create table public.visits (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  company_id   uuid not null references public.companies(id) on delete cascade,
  status       public.visit_status not null default 'planned',
  rating       smallint check (rating between 1 and 5),
  notes        text,
  ai_summary   text,
  visited_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- one visit row per user × company
  unique (user_id, company_id)
);

create index visits_user_idx on public.visits (user_id);
create index visits_company_idx on public.visits (company_id);
create index visits_status_idx on public.visits (user_id, status);

-- ----------------------------------------------------------------------------
-- 4. Per-user: stand photos
-- ----------------------------------------------------------------------------
create table public.images (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  visit_id     uuid references public.visits(id) on delete cascade,
  -- storage object path: {user_id}/company-images/{filename}
  storage_path text not null,
  width        int,
  height       int,
  caption      text,
  created_at   timestamptz not null default now()
);

create index images_visit_idx on public.images (visit_id);
create index images_user_idx on public.images (user_id);

-- ----------------------------------------------------------------------------
-- 5. Per-user: contacts (business cards)
-- ----------------------------------------------------------------------------
create table public.contacts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  company_id      uuid references public.companies(id) on delete set null,
  visit_id        uuid references public.visits(id) on delete set null,
  full_name       text,
  role            text,
  email           text,
  phone           text,
  company_name    text,         -- raw text from card (may differ from catalog match)
  website         text,
  address         text,
  -- storage object path for the original card image
  card_image_path text,
  -- raw OCR + parsed fields, plus AI confidence
  parsed          jsonb default '{}'::jsonb,
  confidence      numeric(3,2),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index contacts_user_idx on public.contacts (user_id);
create index contacts_company_idx on public.contacts (company_id);

-- ----------------------------------------------------------------------------
-- 6. Per-user: voice notes
-- ----------------------------------------------------------------------------
create table public.voice_notes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  visit_id     uuid references public.visits(id) on delete cascade,
  -- storage object path: {user_id}/voice-notes/{filename}
  storage_path text not null,
  duration_ms  int,
  transcript   text,
  created_at   timestamptz not null default now()
);

create index voice_notes_visit_idx on public.voice_notes (visit_id);
create index voice_notes_user_idx on public.voice_notes (user_id);

-- ----------------------------------------------------------------------------
-- 7. Sync log (append-only, used to reason about conflicts)
-- ----------------------------------------------------------------------------
create table public.sync_log (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  table_name  text not null,
  row_id      uuid not null,
  op          text not null check (op in ('insert','update','delete')),
  occurred_at timestamptz not null default now()
);

create index sync_log_user_time_idx on public.sync_log (user_id, occurred_at);

-- ----------------------------------------------------------------------------
-- 8. updated_at trigger helper
-- ----------------------------------------------------------------------------
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.tg_set_updated_at();

create trigger visits_set_updated_at
  before update on public.visits
  for each row execute function public.tg_set_updated_at();

create trigger contacts_set_updated_at
  before update on public.contacts
  for each row execute function public.tg_set_updated_at();

-- ----------------------------------------------------------------------------
-- 9. Convenience view: company + this user's visit state
--    Used by the Companies list screen for fast rendering.
-- ----------------------------------------------------------------------------
create or replace view public.company_with_visit
with (security_invoker = true) as
select
  c.id,
  c.name,
  c.hall,
  c.stand,
  c.logo_url,
  c.description,
  c.website,
  v.id          as visit_id,
  v.status      as visit_status,
  v.rating      as visit_rating,
  v.visited_at,
  v.notes is not null and length(v.notes) > 0 as has_notes
from public.companies c
left join public.visits v
  on v.company_id = c.id
 and v.user_id = auth.uid();

comment on view public.company_with_visit is
  'Catalog joined with the calling user''s visit state. Uses security_invoker so RLS still applies.';
