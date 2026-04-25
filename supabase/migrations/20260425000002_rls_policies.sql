-- ============================================================================
-- Salone Companion — Row Level Security
-- ============================================================================
-- Strategy:
--   * Catalog (companies, tags, company_tags) — public read, writes only via
--     the importer using the service-role key (which bypasses RLS).
--   * User-owned tables (visits, images, contacts, voice_notes, sync_log) —
--     a user can only see and modify rows where user_id = auth.uid().
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Catalog: public read
-- ----------------------------------------------------------------------------
alter table public.companies enable row level security;
alter table public.tags enable row level security;
alter table public.company_tags enable row level security;

create policy "companies_read_all"
  on public.companies for select
  to authenticated
  using (true);

create policy "tags_read_all"
  on public.tags for select
  to authenticated
  using (true);

create policy "company_tags_read_all"
  on public.company_tags for select
  to authenticated
  using (true);

-- No insert/update/delete policies on catalog tables for authenticated role.
-- The importer uses the service-role key which bypasses RLS entirely.

-- ----------------------------------------------------------------------------
-- visits
-- ----------------------------------------------------------------------------
alter table public.visits enable row level security;

create policy "visits_select_own"
  on public.visits for select
  to authenticated
  using (user_id = auth.uid());

create policy "visits_insert_own"
  on public.visits for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "visits_update_own"
  on public.visits for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "visits_delete_own"
  on public.visits for delete
  to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- images
-- ----------------------------------------------------------------------------
alter table public.images enable row level security;

create policy "images_select_own"
  on public.images for select
  to authenticated
  using (user_id = auth.uid());

create policy "images_insert_own"
  on public.images for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "images_update_own"
  on public.images for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "images_delete_own"
  on public.images for delete
  to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- contacts
-- ----------------------------------------------------------------------------
alter table public.contacts enable row level security;

create policy "contacts_select_own"
  on public.contacts for select
  to authenticated
  using (user_id = auth.uid());

create policy "contacts_insert_own"
  on public.contacts for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "contacts_update_own"
  on public.contacts for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "contacts_delete_own"
  on public.contacts for delete
  to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- voice_notes
-- ----------------------------------------------------------------------------
alter table public.voice_notes enable row level security;

create policy "voice_notes_select_own"
  on public.voice_notes for select
  to authenticated
  using (user_id = auth.uid());

create policy "voice_notes_insert_own"
  on public.voice_notes for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "voice_notes_update_own"
  on public.voice_notes for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "voice_notes_delete_own"
  on public.voice_notes for delete
  to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- sync_log — read-only for the user; writes go through service role only
-- ----------------------------------------------------------------------------
alter table public.sync_log enable row level security;

create policy "sync_log_select_own"
  on public.sync_log for select
  to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Storage buckets RLS
-- The buckets must already exist (created via dashboard or config.toml):
--   * company-images
--   * business-cards
--   * voice-notes
-- Path convention: {user_id}/{anything}
-- ----------------------------------------------------------------------------

-- Helper: extract the leading user_id from a storage path like '<uuid>/...'
create or replace function public.storage_path_user_id(path text)
returns uuid
language sql
immutable
as $$
  select case
    when path is null then null
    else nullif(split_part(path, '/', 1), '')::uuid
  end;
$$;

-- Apply same policy shape to each bucket. The user_id segment of the path
-- must equal the caller's auth.uid() for any operation.

-- company-images
create policy "company_images_owner_all"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'company-images'
    and public.storage_path_user_id(name) = auth.uid()
  )
  with check (
    bucket_id = 'company-images'
    and public.storage_path_user_id(name) = auth.uid()
  );

-- business-cards
create policy "business_cards_owner_all"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'business-cards'
    and public.storage_path_user_id(name) = auth.uid()
  )
  with check (
    bucket_id = 'business-cards'
    and public.storage_path_user_id(name) = auth.uid()
  );

-- voice-notes
create policy "voice_notes_owner_all"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'voice-notes'
    and public.storage_path_user_id(name) = auth.uid()
  )
  with check (
    bucket_id = 'voice-notes'
    and public.storage_path_user_id(name) = auth.uid()
  );
