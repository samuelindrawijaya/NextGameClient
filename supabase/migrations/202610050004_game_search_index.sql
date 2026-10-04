begin;
set local statement_timeout = '0';
create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;
do $$
declare extension_schema text;
begin
  select n.nspname into extension_schema
  from pg_extension e join pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'pg_trgm';
  execute format(
    'create index if not exists game_lists_name_trgm_idx on public.game_lists using gin (name %I.gin_trgm_ops)',
    extension_schema
  );
end $$;
analyze public.game_lists;
commit;
