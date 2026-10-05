begin;
create or replace function public.admin_assets_index(p_limit integer default 20, p_offset integer default 0, p_query text default '', p_id_kind text default 'app_id', p_exact_id text default null)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb; total bigint; join_key text; source_sql text; filter_sql text; query_value text;
begin
  if p_id_kind not in ('app_id','id') then raise exception 'Invalid asset ID mapping'; end if;
  join_key := case when p_id_kind = 'app_id' then 'app_id' else 'id' end;
  query_value := trim(coalesce(p_query,''));
  source_sql := format('public.game_assets a left join public.game_lists g on a.game_id = g.%I',join_key);
  if p_exact_id is not null or query_value ~ '^[0-9]+$' then
    query_value := coalesce(p_exact_id,query_value);
    filter_sql := 'a.game_id = $1::bigint';
    execute 'select count(*) from public.game_assets a where ' || filter_sql into total using query_value;
  elsif query_value = '' then
    filter_sql := 'true';
    select count(*) into total from public.game_assets;
  else
    if length(query_value) < 3 then raise exception 'Game name requires at least 3 characters'; end if;
    query_value := '%' || query_value || '%';
    source_sql := format('public.game_lists g join public.game_assets a on a.game_id = g.%I',join_key);
    filter_sql := 'g.name ilike $1';
    execute 'select count(*) from ' || source_sql || ' where ' || filter_sql into total using query_value;
  end if;
  execute 'select coalesce(jsonb_agg(to_jsonb(r)), ''[]''::jsonb) from (
    select a.game_id::text, g.app_id::text, g.name as game_name,
      coalesce(octet_length(a.lua_data),0) > 0 as has_lua,
      coalesce(octet_length(a.meta_data),0) > 0 as has_meta,
      a.encryption_version, a.created_at, a.updated_at
    from ' || source_sql || ' where ' || filter_sql || '
    order by a.game_id desc limit $2 offset $3
  ) r' into result using query_value,greatest(1,least(p_limit,50)),greatest(0,p_offset);
  return jsonb_build_object('rows',result,'total',total::text);
end $$;
revoke all on function public.admin_assets_index(integer,integer,text,text,text) from public,anon,authenticated;
grant execute on function public.admin_assets_index(integer,integer,text,text,text) to service_role;
analyze public.game_assets;
notify pgrst,'reload schema';
commit;
