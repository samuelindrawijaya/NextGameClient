begin;
alter table public.history_purchase add column if not exists user_id bigint;
alter table public.history_purchase add column if not exists is_invoice_used boolean not null default false;
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='history_purchase' and column_name='is_processed') then
    alter table public.history_purchase add column is_processed boolean not null default false;
    update public.history_purchase set is_processed = is_procces;
  end if;
end $$;
alter table public.user_list_game add column if not exists purchase_id bigint;
do $$
begin
  if not exists (select 1 from pg_constraint c join pg_attribute a on a.attrelid=c.conrelid and a.attnum=any(c.conkey) where c.conrelid='public.history_purchase'::regclass and c.contype='f' and a.attname='user_id' and c.confrelid='public."user"'::regclass) then
    alter table public.history_purchase add constraint history_purchase_user_id_fkey foreign key(user_id) references public."user"(user_id);
  end if;
  if not exists (select 1 from pg_constraint c join pg_attribute a on a.attrelid=c.conrelid and a.attnum=any(c.conkey) where c.conrelid='public.user_list_game'::regclass and c.contype='f' and a.attname='purchase_id' and c.confrelid='public.history_purchase'::regclass) then
    alter table public.user_list_game add constraint user_list_game_purchase_id_fkey foreign key(purchase_id) references public.history_purchase(id);
  end if;
end $$;
create index if not exists history_purchase_user_id_idx on public.history_purchase(user_id);
create index if not exists user_list_game_user_app_idx on public.user_list_game(user_id,app_id_buy);
create or replace function public.sync_purchase_processed() returns trigger language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then new.is_processed := new.is_processed or new.is_procces;
  elsif new.is_processed is not distinct from old.is_processed then new.is_processed := new.is_procces;
  end if;
  new.is_procces := new.is_processed; return new;
end $$;
drop trigger if exists sync_purchase_processed on public.history_purchase;
create trigger sync_purchase_processed before insert or update on public.history_purchase for each row execute function public.sync_purchase_processed();

create or replace function public.admin_library_change(p_action text,p_id text,p_data jsonb,p_actor_id bigint,p_operator text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare old_row public.user_list_game; new_row public.user_list_game; owner_id bigint; app bigint; purchase bigint; game_identity bigint; invoice public.history_purchase; k text;
begin
  if p_action not in ('INSERT','UPDATE') then raise exception 'Library supports adding and editing only'; end if;
  if jsonb_typeof(p_data) <> 'object' then raise exception 'Data must be an object'; end if;
  for k in select jsonb_object_keys(p_data) loop
    if k not in ('user_id','app_id_buy','purchase_id','is_from_free_claim') then raise exception 'Field not allowed: %',k; end if;
  end loop;
  if p_action = 'UPDATE' then
    select * into old_row from public.user_list_game where id=p_id::bigint for update;
    if not found then raise exception 'Record not found'; end if;
  end if;
  owner_id := coalesce((p_data->>'user_id')::bigint,old_row.user_id);
  app := coalesce((p_data->>'app_id_buy')::bigint,old_row.app_id_buy);
  purchase := case when p_data ? 'purchase_id' then (p_data->>'purchase_id')::bigint else old_row.purchase_id end;
  perform 1 from public."user" where user_id=owner_id for update;
  if not found then raise exception 'Existing user required'; end if;
  select id into game_identity from public.game_lists where app_id=app;
  if not found then raise exception 'Existing game required'; end if;
  if exists(select 1 from public.user_list_game where user_id=owner_id and app_id_buy=app and id is distinct from old_row.id) then raise exception 'Game already in user library'; end if;
  if purchase is not null then
    select * into invoice from public.history_purchase where id=purchase for share;
    if not found or invoice.user_id is distinct from owner_id or invoice.game_id is distinct from game_identity then raise exception 'Invoice must match user and game'; end if;
    if coalesce((p_data->>'is_from_free_claim')::boolean,old_row.is_from_free_claim,false) then raise exception 'Purchase is not a free claim'; end if;
  end if;
  if p_action='INSERT' then
    insert into public.user_list_game(user_id,app_id_buy,purchase_id,is_from_free_claim) values(owner_id,app,purchase,coalesce((p_data->>'is_from_free_claim')::boolean,false)) returning * into new_row;
  else
    update public.user_list_game set user_id=owner_id,app_id_buy=app,purchase_id=purchase,is_from_free_claim=coalesce((p_data->>'is_from_free_claim')::boolean,old_row.is_from_free_claim),updated_at=now() where id=old_row.id returning * into new_row;
  end if;
  insert into public.audit_logs(actor_user_id,action,entity,entity_id,old_data,new_data) values(p_actor_id,p_action,'libraries',new_row.id::text,case when old_row.id is not null then public.admin_public_record(to_jsonb(old_row)) end,jsonb_build_object('record',public.admin_public_record(to_jsonb(new_row)),'operator',p_operator));
  return public.admin_public_record(to_jsonb(new_row));
end $$;
create or replace function public.admin_public_record(p_record jsonb)
returns jsonb language plpgsql immutable security invoker set search_path = '' as $$
declare v jsonb := p_record - 'password_hash' - 'lua_data' - 'meta_data'; k text;
begin
  if p_record ? 'lua_data' then v := v || jsonb_build_object('has_lua', p_record->'lua_data' <> 'null'::jsonb, 'has_meta', p_record->'meta_data' <> 'null'::jsonb); end if;
  foreach k in array array['id','app_id','game_id','user_id','app_id_buy','purchase_id'] loop
    if v ? k and v->k <> 'null'::jsonb then v := jsonb_set(v,array[k],to_jsonb(v->>k)); end if;
  end loop;
  return v;
end $$;

create or replace function public.admin_apply_change(p_entity text, p_action text, p_id text, p_data jsonb, p_actor_id bigint default null, p_operator text default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  t text; pk text; allowed text[]; fields text[]; k text;
  before_row jsonb; after_row jsonb; cols text; vals text; assignments text; entity_key text;
begin
  if p_entity = 'libraries' then return public.admin_library_change(p_action,p_id,p_data,p_actor_id,p_operator); end if;
  case p_entity
    when 'games' then t := 'game_lists'; pk := 'id'; allowed := array['app_id','name','image','description','genre','release_date','categories','publishers'];
    when 'assets' then t := 'game_assets'; pk := 'game_id'; allowed := array['game_id','lua_data','meta_data','encryption_version'];
    when 'users' then t := 'user'; pk := 'user_id'; allowed := array['email','password_hash','access_role_code','access_role_name','is_verified','free_claim_game','machine_info'];
    when 'versions' then t := 'version_apps'; pk := 'id'; allowed := array['version'];
    when 'transactions' then t := 'history_purchase'; pk := 'id'; allowed := array['user_id','is_processed','is_invoice_used'];
    else raise exception 'Unsupported entity';
  end case;
  if p_action not in ('INSERT','UPDATE','DELETE') then raise exception 'Unsupported action'; end if;
  if p_entity = 'users' and p_action <> 'UPDATE' then raise exception 'Users register through another service; editing only'; end if;
  if p_entity = 'transactions' and p_action <> 'UPDATE' then raise exception 'Transactions support editing only'; end if;
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


revoke all on function public.admin_library_change(text,text,jsonb,bigint,text) from public,anon,authenticated;
grant execute on function public.admin_library_change(text,text,jsonb,bigint,text) to service_role;
notify pgrst,'reload schema';
commit;
