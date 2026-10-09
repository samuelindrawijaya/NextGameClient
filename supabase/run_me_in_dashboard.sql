-- Migration: add columns for admin transaction form
-- Add game_id, invoice_number, platform columns to history_purchase

do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='history_purchase' and column_name='game_id') then
    alter table public.history_purchase add column game_id bigint;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='history_purchase' and column_name='invoice_number') then
    alter table public.history_purchase add column invoice_number text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='history_purchase' and column_name='platform') then
    alter table public.history_purchase add column platform text not null default 'manual';
  end if;
end $$;

create index if not exists history_purchase_game_id_idx on public.history_purchase(game_id);
create index if not exists history_purchase_invoice_idx on public.history_purchase(invoice_number);

-- === Update function admin_apply_change ===
-- Add transaction field: user_id, game_id, invoice_number, platform, is_procces, is_invoice_used

create or replace function public.admin_apply_change(p_entity text, p_action text, p_id text, p_data jsonb, p_actor_id bigint default null, p_operator text default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  t text; pk text; allowed text[]; fields text[]; k text;
  before_row jsonb; after_row jsonb; cols text; vals text; assignments text; entity_key text;
begin
  case p_entity
    when 'games' then t := 'game_lists'; pk := 'id'; allowed := array['app_id','name','image','description','genre','release_date','categories','publishers'];
    when 'assets' then t := 'game_assets'; pk := 'game_id'; allowed := array['game_id','lua_data','meta_data','encryption_version'];
    when 'users' then t := 'user'; pk := 'user_id'; allowed := array['email','password_hash','access_role_code','access_role_name','is_verified','free_claim_game','machine_info'];
    when 'versions' then t := 'version_apps'; pk := 'id'; allowed := array['version'];
    when 'transactions' then t := 'history_purchase'; pk := 'id'; allowed := array['user_id','game_id','invoice_number','platform','is_procces','is_invoice_used'];
    else raise exception 'Unsupported entity';
  end case;
  if p_action not in ('INSERT','UPDATE','DELETE') then raise exception 'Unsupported action'; end if;
  if p_entity = 'users' and p_action = 'DELETE' then raise exception 'User deletion policy is not configured'; end if;
  if jsonb_typeof(p_data) <> 'object' then raise exception 'Data must be an object'; end if;
  select array_agg(key order by key) into fields from jsonb_object_keys(p_data) as x(key);
  foreach k in array coalesce(fields,array[]::text[]) loop
    if not (k = any(allowed)) then raise exception 'Field not allowed: %',k; end if;
    if p_entity = 'assets' and p_action = 'UPDATE' and k = 'game_id' then raise exception 'Asset ID is immutable'; end if;
  end loop;
  if p_action <> 'INSERT' then
    execute format('select to_jsonb(r) from public.%I r where %I = $1::bigint for update',t,pk) into before_row using p_id;
    if before_row is null then raise exception using errcode = 'P0002', message = 'Record not found'; end if;
  end if;
  if p_action = 'DELETE' then
    execute format('delete from public.%I where %I = $1::bigint',t,pk) using p_id;
    entity_key := p_id;
  else
    if coalesce(array_length(fields,1),0) = 0 then raise exception 'No fields provided'; end if;
    select string_agg(format('%I',key),','),string_agg(format('r.%I',key),','),string_agg(format('%I = r.%I',key,key),',') into cols,vals,assignments from unnest(fields) as x(key);
    if p_action = 'INSERT' then
      execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I,$1) r returning to_jsonb(%I.*)',t,cols,vals,t,t) into after_row using p_data;
    else
      execute format('update public.%I as target set %s, updated_at = now() from jsonb_populate_record(null::public.%I,$1) r where target.%I = $2::bigint returning to_jsonb(target.*)',t,assignments,t,pk) into after_row using p_data,p_id;
    end if;
    entity_key := after_row->>pk;
  end if;
  insert into public.audit_logs(actor_user_id,action,entity,entity_id,old_data,new_data)
  values(p_actor_id,p_action,p_entity,entity_key,public.admin_public_record(before_row),jsonb_build_object('record',public.admin_public_record(after_row),'operator',p_operator,'credential_updated',p_data ? 'password_hash'));
  return public.admin_public_record(after_row);
end $$;