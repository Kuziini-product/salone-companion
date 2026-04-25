-- ============================================================================
-- Salone Companion — Sync RPC (WatermelonDB-shaped)
-- ============================================================================
-- WatermelonDB sync expects the server's pullChanges to return:
--   {
--     changes: {
--       <table>: { created: [...], updated: [...], deleted: [<id>, ...] },
--       ...
--     },
--     timestamp: <server time in ms>
--   }
--
-- We model this as a single SQL function that returns JSONB. The mobile client
-- calls it via supabase.rpc('pull_changes', { last_pulled_at }).
--
-- Notes:
--   * WatermelonDB measures last_pulled_at in milliseconds since epoch.
--   * For "deleted" we read the sync_log; for created/updated we partition by
--     whether updated_at > created_at + small epsilon.
--   * Catalog tables (companies, tags, company_tags) are returned in full on
--     first pull (last_pulled_at = 0) and only on changes thereafter.
-- ============================================================================

create or replace function public.pull_changes(last_pulled_at bigint default 0)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid             uuid := auth.uid();
  cutoff          timestamptz := to_timestamp(coalesce(last_pulled_at, 0) / 1000.0);
  now_ms          bigint := (extract(epoch from now()) * 1000)::bigint;

  companies_created   jsonb;
  companies_updated   jsonb;
  companies_deleted   jsonb;

  tags_created        jsonb;
  tags_updated        jsonb;

  visits_created      jsonb;
  visits_updated      jsonb;
  visits_deleted      jsonb;

  images_created      jsonb;
  images_updated      jsonb;
  images_deleted      jsonb;

  contacts_created    jsonb;
  contacts_updated    jsonb;
  contacts_deleted    jsonb;

  voice_created       jsonb;
  voice_updated       jsonb;
  voice_deleted       jsonb;
begin
  if uid is null then
    raise exception 'pull_changes requires an authenticated user';
  end if;

  -- ----- companies (catalog, public read) -----
  select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
    into companies_created
  from public.companies c
  where c.created_at > cutoff;

  select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
    into companies_updated
  from public.companies c
  where c.updated_at > cutoff
    and c.created_at <= cutoff;

  -- catalog deletions are tracked through sync_log entries with NULL user_id
  -- (only the importer writes those); for now we return an empty list.
  companies_deleted := '[]'::jsonb;

  -- ----- tags (catalog) -----
  select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
    into tags_created
  from public.tags t
  where t.created_at > cutoff;

  tags_updated := '[]'::jsonb; -- tags are mostly immutable

  -- ----- visits (user-owned) -----
  select coalesce(jsonb_agg(to_jsonb(v)), '[]'::jsonb)
    into visits_created
  from public.visits v
  where v.user_id = uid
    and v.created_at > cutoff;

  select coalesce(jsonb_agg(to_jsonb(v)), '[]'::jsonb)
    into visits_updated
  from public.visits v
  where v.user_id = uid
    and v.updated_at > cutoff
    and v.created_at <= cutoff;

  select coalesce(jsonb_agg(s.row_id), '[]'::jsonb)
    into visits_deleted
  from public.sync_log s
  where s.user_id = uid
    and s.table_name = 'visits'
    and s.op = 'delete'
    and s.occurred_at > cutoff;

  -- ----- images (user-owned) -----
  select coalesce(jsonb_agg(to_jsonb(i)), '[]'::jsonb)
    into images_created
  from public.images i
  where i.user_id = uid and i.created_at > cutoff;

  images_updated := '[]'::jsonb; -- images are append-only

  select coalesce(jsonb_agg(s.row_id), '[]'::jsonb)
    into images_deleted
  from public.sync_log s
  where s.user_id = uid
    and s.table_name = 'images'
    and s.op = 'delete'
    and s.occurred_at > cutoff;

  -- ----- contacts (user-owned) -----
  select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
    into contacts_created
  from public.contacts c
  where c.user_id = uid and c.created_at > cutoff;

  select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
    into contacts_updated
  from public.contacts c
  where c.user_id = uid
    and c.updated_at > cutoff
    and c.created_at <= cutoff;

  select coalesce(jsonb_agg(s.row_id), '[]'::jsonb)
    into contacts_deleted
  from public.sync_log s
  where s.user_id = uid
    and s.table_name = 'contacts'
    and s.op = 'delete'
    and s.occurred_at > cutoff;

  -- ----- voice_notes (user-owned) -----
  select coalesce(jsonb_agg(to_jsonb(vn)), '[]'::jsonb)
    into voice_created
  from public.voice_notes vn
  where vn.user_id = uid and vn.created_at > cutoff;

  voice_updated := '[]'::jsonb; -- voice notes append-only

  select coalesce(jsonb_agg(s.row_id), '[]'::jsonb)
    into voice_deleted
  from public.sync_log s
  where s.user_id = uid
    and s.table_name = 'voice_notes'
    and s.op = 'delete'
    and s.occurred_at > cutoff;

  return jsonb_build_object(
    'timestamp', now_ms,
    'changes', jsonb_build_object(
      'companies', jsonb_build_object(
        'created', companies_created,
        'updated', companies_updated,
        'deleted', companies_deleted
      ),
      'tags', jsonb_build_object(
        'created', tags_created,
        'updated', tags_updated,
        'deleted', '[]'::jsonb
      ),
      'visits', jsonb_build_object(
        'created', visits_created,
        'updated', visits_updated,
        'deleted', visits_deleted
      ),
      'images', jsonb_build_object(
        'created', images_created,
        'updated', images_updated,
        'deleted', images_deleted
      ),
      'contacts', jsonb_build_object(
        'created', contacts_created,
        'updated', contacts_updated,
        'deleted', contacts_deleted
      ),
      'voice_notes', jsonb_build_object(
        'created', voice_created,
        'updated', voice_updated,
        'deleted', voice_deleted
      )
    )
  );
end;
$$;

grant execute on function public.pull_changes(bigint) to authenticated;

-- ----------------------------------------------------------------------------
-- Helper trigger: when a user-owned row is deleted, write to sync_log so
-- pull_changes can report the deletion to other devices.
-- ----------------------------------------------------------------------------
create or replace function public.tg_log_delete()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.sync_log (user_id, table_name, row_id, op)
  values (old.user_id, tg_table_name, old.id, 'delete');
  return old;
end;
$$;

create trigger visits_log_delete
  after delete on public.visits
  for each row execute function public.tg_log_delete();

create trigger images_log_delete
  after delete on public.images
  for each row execute function public.tg_log_delete();

create trigger contacts_log_delete
  after delete on public.contacts
  for each row execute function public.tg_log_delete();

create trigger voice_notes_log_delete
  after delete on public.voice_notes
  for each row execute function public.tg_log_delete();
