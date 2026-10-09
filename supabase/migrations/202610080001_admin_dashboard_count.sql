begin;

-- Fast count dashboard untuk menghindari statement timeout
-- Pakai pg_class untuk estimasi (instant) + verify count via count() cepat kalau perlu
create or replace function public.admin_count_dashboard()
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  v_users bigint; v_verified bigint; v_games bigint; v_assets bigint;
  v_transactions bigint; v_pending bigint;
begin
  -- Gunakan reltuples untuk estimasi (tabel besar)
  select reltuples::bigint into v_games
  from pg_catalog.pg_class
  where relname = 'game_lists' and relnamespace = 'public'::regnamespace;

  -- Tabel kecil — count langsung aman
  select count(*) into v_users from public.user;
  select count(*) into v_verified from public.user where is_verified = true;
  select count(*) into v_assets from public.game_assets;
  select count(*) into v_transactions from public.history_purchase;
  select count(*) into v_pending from public.history_purchase where is_procces = false;

  return jsonb_build_object(
    'users', v_users,
    'verified', v_verified,
    'unverified', v_users - v_verified,
    'games', v_games,
    'assets', v_assets,
    'transactions', v_transactions,
    'pending', v_pending,
    'completed', v_transactions - v_pending
  );
end $$;

revoke all on function public.admin_count_dashboard() from public, anon, authenticated;
grant execute on function public.admin_count_dashboard() to service_role;

commit;
