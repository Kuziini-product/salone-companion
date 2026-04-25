-- ─────────────────────────────────────────────────────────────
-- Sync RPCs for WatermelonDB
-- See: https://watermelondb.dev/docs/Sync/Backend
-- ─────────────────────────────────────────────────────────────

create or replace function pull_changes(last_pulled_at bigint)
returns json
language plpgsql
security definer
as $$
declare
  uid uuid := auth.uid();
  cutoff timestamptz := to_timestamp(last_pulled_at / 1000.0);
  result json;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select json_build_object(
    'changes', json_build_object(
      'companies', json_build_object(
        'created', coalesce((select json_agg(row_to_json(c)) from companies c where c.created_at > cutoff), '[]'::json),
        'updated', coalesce((select json_agg(row_to_json(c)) from companies c where c.updated_at > cutoff and c.created_at <= cutoff), '[]'::json),
        'deleted', '[]'::json
      ),
      'visits', json_build_object(
        'created', coalesce((select json_agg(row_to_json(v)) from visits v where v.user_id = uid and v.created_at > cutoff), '[]'::json),
        'updated', coalesce((select json_agg(row_to_json(v)) from visits v where v.user_id = uid and v.updated_at > cutoff and v.created_at <= cutoff), '[]'::json),
        'deleted', '[]'::json
      ),
      'images', json_build_object(
        'created', coalesce((select json_agg(row_to_json(i)) from images i join visits v on v.id = i.visit_id where v.user_id = uid and i.uploaded_at > cutoff), '[]'::json),
        'updated', '[]'::json,
        'deleted', '[]'::json
      ),
      'contacts', json_build_object(
        'created', coalesce((select json_agg(row_to_json(co)) from contacts co where co.user_id = uid and co.created_at > cutoff), '[]'::json),
        'updated', '[]'::json,
        'deleted', '[]'::json
      ),
      'voice_notes', json_build_object(
        'created', coalesce((select json_agg(row_to_json(vn)) from voice_notes vn join visits v on v.id = vn.visit_id where v.user_id = uid and vn.created_at > cutoff), '[]'::json),
        'updated', '[]'::json,
        'deleted', '[]'::json
      )
    ),
    'timestamp', extract(epoch from now()) * 1000
  ) into result;

  return result;
end;
$$;

grant execute on function pull_changes(bigint) to authenticated;
