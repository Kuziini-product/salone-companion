-- ─────────────────────────────────────────────────────────────
-- Row Level Security policies
-- ─────────────────────────────────────────────────────────────

-- Companies: read public to authenticated users, write only to service role
alter table companies enable row level security;

create policy "companies_read_authenticated" on companies
  for select to authenticated using (true);

-- (no insert/update/delete policies → only service role can mutate)

-- Tags: same pattern
alter table tags enable row level security;
create policy "tags_read_authenticated" on tags
  for select to authenticated using (true);

alter table company_tags enable row level security;
create policy "company_tags_read_authenticated" on company_tags
  for select to authenticated using (true);

-- ─────────────────────────────────────────────────────────────
-- visits: per-user
-- ─────────────────────────────────────────────────────────────
alter table visits enable row level security;

create policy "visits_owner_select" on visits
  for select to authenticated using (auth.uid() = user_id);

create policy "visits_owner_insert" on visits
  for insert to authenticated with check (auth.uid() = user_id);

create policy "visits_owner_update" on visits
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "visits_owner_delete" on visits
  for delete to authenticated using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- images: scoped via parent visit
-- ─────────────────────────────────────────────────────────────
alter table images enable row level security;

create policy "images_owner_select" on images
  for select to authenticated
  using (exists (select 1 from visits v where v.id = images.visit_id and v.user_id = auth.uid()));

create policy "images_owner_insert" on images
  for insert to authenticated
  with check (exists (select 1 from visits v where v.id = images.visit_id and v.user_id = auth.uid()));

create policy "images_owner_update" on images
  for update to authenticated
  using (exists (select 1 from visits v where v.id = images.visit_id and v.user_id = auth.uid()));

create policy "images_owner_delete" on images
  for delete to authenticated
  using (exists (select 1 from visits v where v.id = images.visit_id and v.user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- contacts: per-user
-- ─────────────────────────────────────────────────────────────
alter table contacts enable row level security;

create policy "contacts_owner_all" on contacts
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- voice_notes: scoped via parent visit
-- ─────────────────────────────────────────────────────────────
alter table voice_notes enable row level security;

create policy "voice_notes_owner_all" on voice_notes
  for all to authenticated
  using (exists (select 1 from visits v where v.id = voice_notes.visit_id and v.user_id = auth.uid()))
  with check (exists (select 1 from visits v where v.id = voice_notes.visit_id and v.user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- sync_log: per-user, append-only
-- ─────────────────────────────────────────────────────────────
alter table sync_log enable row level security;

create policy "sync_log_owner_select" on sync_log
  for select to authenticated using (auth.uid() = user_id);

create policy "sync_log_owner_insert" on sync_log
  for insert to authenticated with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- Storage policies: each user can only access their own paths
-- Path convention: {user_id}/{visit_or_contact_id}/{filename}
-- ─────────────────────────────────────────────────────────────
create policy "storage_company_images_owner" on storage.objects
  for all to authenticated
  using (bucket_id = 'company-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'company-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "storage_business_cards_owner" on storage.objects
  for all to authenticated
  using (bucket_id = 'business-cards' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'business-cards' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "storage_voice_notes_owner" on storage.objects
  for all to authenticated
  using (bucket_id = 'voice-notes' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'voice-notes' and (storage.foldername(name))[1] = auth.uid()::text);
