-- Add per-user favorite flag on visits.
-- The visit row exists per (user_id, company_id), so a "favorite" is naturally
-- tied to a user without needing a separate table.

alter table public.visits
  add column if not exists is_favorite boolean not null default false;

create index if not exists visits_user_favorite_idx
  on public.visits (user_id, is_favorite)
  where is_favorite = true;
