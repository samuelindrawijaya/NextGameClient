begin;

create or replace function public.admin_count_estimate_games()
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  v_games bigint;
begin
  select reltuples::bigint into v_games
  from pg_catalog.pg_class
  where relname = 'game_lists' and relnamespace = 'public'::regnamespace;
  return jsonb_build_object('games', v_games);
end $$;

revoke all on function public.admin_count_estimate_games() from public, anon, authenticated;
grant execute on function public.admin_count_estimate_games() to service_role;

commit;
