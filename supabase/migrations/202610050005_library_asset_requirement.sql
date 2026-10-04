begin;

create or replace function public.admin_library_games(p_query text default '', p_limit integer default 8)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb;
begin
  if p_query ~ '^[0-9]+$' then
    select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) into result from (
      select g.id::text, g.app_id::text, g.name, g.image
      from public.game_lists g join public.game_assets a on a.game_id = g.app_id
      where g.app_id = p_query::bigint
        and (coalesce(octet_length(a.lua_data),0) > 0 or coalesce(octet_length(a.meta_data),0) > 0)
      limit greatest(1,least(p_limit,20))
    ) r;
  else
    if p_query <> '' and length(p_query) < 3 then raise exception 'Game name requires at least 3 characters'; end if;
    select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) into result from (
      select g.id::text, g.app_id::text, g.name, g.image
      from public.game_lists g join public.game_assets a on a.game_id = g.app_id
      where (p_query = '' or g.name ilike '%' || p_query || '%')
        and (coalesce(octet_length(a.lua_data),0) > 0 or coalesce(octet_length(a.meta_data),0) > 0)
      order by g.id desc limit greatest(1,least(p_limit,20))
    ) r;
  end if;
  return result;
end $$;

create or replace function public.require_library_game_asset()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' and new.app_id_buy is not distinct from old.app_id_buy then return new; end if;
  perform 1 from public.game_assets a
  where a.game_id = new.app_id_buy
    and (coalesce(octet_length(a.lua_data),0) > 0 or coalesce(octet_length(a.meta_data),0) > 0)
  for share;
  if not found then
    raise exception using errcode = 'PGA01', message = 'Game requires a nonempty asset before adding to user library';
  end if;
  return new;
end $$;
drop trigger if exists require_library_game_asset on public.user_list_game;
create trigger require_library_game_asset before insert or update of app_id_buy on public.user_list_game
for each row execute function public.require_library_game_asset();

revoke all on function public.admin_library_games(text,integer) from public,anon,authenticated;
revoke all on function public.require_library_game_asset() from public,anon,authenticated;
grant execute on function public.admin_library_games(text,integer) to service_role;
grant execute on function public.require_library_game_asset() to service_role;
notify pgrst,'reload schema';
commit;
