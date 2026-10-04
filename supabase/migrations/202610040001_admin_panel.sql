begin;

create or replace function public.admin_public_record(p_record jsonb)
returns jsonb language plpgsql immutable security invoker set search_path = '' as $$
declare v jsonb := p_record - 'password_hash' - 'lua_data' - 'meta_data'; k text;
begin
  if p_record ? 'lua_data' then v := v || jsonb_build_object('has_lua', p_record->'lua_data' <> 'null'::jsonb, 'has_meta', p_record->'meta_data' <> 'null'::jsonb); end if;
  foreach k in array array['id','app_id','game_id','user_id','app_id_buy'] loop
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
  case p_entity
    when 'games' then t := 'game_lists'; pk := 'id'; allowed := array['app_id','name','image','description','genre','release_date','categories','publishers'];
    when 'assets' then t := 'game_assets'; pk := 'game_id'; allowed := array['game_id','lua_data','meta_data','encryption_version'];
    when 'users' then t := 'user'; pk := 'user_id'; allowed := array['email','password_hash','access_role_code','access_role_name','is_verified','free_claim_game','machine_info'];
    when 'versions' then t := 'version_apps'; pk := 'id'; allowed := array['version'];
    when 'transactions' then t := 'history_purchase'; pk := 'id'; allowed := array['is_procces'];
    else raise exception 'Unsupported entity';
  end case;
  if p_action not in ('INSERT','UPDATE','DELETE') then raise exception 'Unsupported action'; end if;
  if p_entity = 'users' and p_action = 'DELETE' then raise exception 'User deletion policy is not configured'; end if;
  if p_entity = 'transactions' and (p_action <> 'UPDATE' or p_data <> '{"is_procces":true}'::jsonb) then raise exception 'Only mark processed is supported'; end if;
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

create or replace function public.admin_assets_index(p_limit integer default 20, p_offset integer default 0, p_query text default '', p_id_kind text default 'app_id', p_exact_id text default null)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb; total bigint;
begin
  if p_id_kind not in ('app_id','id') then raise exception 'Invalid asset ID mapping'; end if;
  select count(*) into total from public.game_assets a left join public.game_lists g on a.game_id = case when p_id_kind = 'app_id' then g.app_id else g.id end
  where (p_exact_id is null or a.game_id = p_exact_id::bigint) and (p_query = '' or a.game_id::text ilike '%' || p_query || '%' or g.name ilike '%' || p_query || '%');
  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into result from (
    select a.game_id::text, g.app_id::text, g.name as game_name, a.lua_data is not null as has_lua, a.meta_data is not null as has_meta, a.encryption_version, a.created_at, a.updated_at
    from public.game_assets a left join public.game_lists g on a.game_id = case when p_id_kind = 'app_id' then g.app_id else g.id end
    where (p_exact_id is null or a.game_id = p_exact_id::bigint) and (p_query = '' or a.game_id::text ilike '%' || p_query || '%' or g.name ilike '%' || p_query || '%')
    order by a.game_id desc limit greatest(1,least(p_limit,50)) offset greatest(0,p_offset)
  ) x;
  return jsonb_build_object('rows',result,'total',total::text);
end $$;

create or replace function public.admin_import_batch(p_entity text,p_mode text,p_rows jsonb,p_actor_id bigint default null,p_operator text default null,p_filename text default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  job_id bigint; item jsonb; data jsonb; existing_id text; op text;
  inserted integer := 0; updated integer := 0; skipped integer := 0; deleted integer := 0; v_errors jsonb := '[]'::jsonb;
begin
  if p_entity not in ('games','assets') or p_mode not in ('INSERT_ONLY','UPSERT','MIXED') then raise exception 'Invalid import mode'; end if;
  if p_entity = 'games' and p_mode = 'MIXED' or p_entity = 'assets' and p_mode <> 'MIXED' then raise exception 'Mode does not match entity'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) not between 1 and 500 then raise exception 'Import must contain 1 to 500 rows'; end if;
  insert into public.import_jobs(entity,mode,filename,status,created_by) values(p_entity,p_mode,p_filename,'running',p_actor_id) returning id into job_id;
  for item in select value from jsonb_array_elements(p_rows) loop
    begin
      data := item->'data'; existing_id := null;
      if p_entity = 'games' then
        select id::text into existing_id from public.game_lists where app_id = (data->>'app_id')::bigint;
        if existing_id is not null and p_mode = 'INSERT_ONLY' then skipped := skipped + 1; continue; end if;
        op := case when existing_id is null then 'INSERT' else 'UPDATE' end;
      else
        select game_id::text into existing_id from public.game_assets where game_id = (data->>'game_id')::bigint;
        case item->>'action'
          when 'DELETE' then if existing_id is null then skipped := skipped+1;continue;end if;op := 'DELETE';data := '{}'::jsonb;
          when 'INSERT' then if existing_id is not null then skipped := skipped+1;continue;end if;op := 'INSERT';
          when 'UPSERT' then op := case when existing_id is null then 'INSERT' else 'UPDATE' end;
          else raise exception 'Explicit asset action required';
        end case;
        if op = 'UPDATE' then data := data - 'game_id'; end if;
      end if;
      perform public.admin_apply_change(p_entity,op,existing_id,data,p_actor_id,p_operator);
      if op = 'INSERT' then inserted := inserted+1;elsif op = 'UPDATE' then updated := updated+1;else deleted := deleted+1;end if;
    exception when unique_violation then
      if p_mode = 'INSERT_ONLY' or p_entity = 'assets' and item->>'action' = 'INSERT' then skipped := skipped+1;
      else v_errors := v_errors || jsonb_build_array(jsonb_build_object('row',item->'row','message','Duplicate record'));end if;
    when others then v_errors := v_errors || jsonb_build_array(jsonb_build_object('row',item->'row','message',case when sqlstate = '23503' then 'Record is referenced by another table' else 'Invalid record or database constraint' end));
    end;
  end loop;
  update public.import_jobs set status = case when jsonb_array_length(v_errors) = 0 then 'completed' else 'failed' end,inserted_count=inserted,updated_count=updated,skipped_count=skipped,deleted_count=deleted,errors=v_errors,updated_at=now() where id=job_id;
  insert into public.audit_logs(actor_user_id,action,entity,entity_id,new_data) values(p_actor_id,'IMPORT CSV',p_entity,job_id::text,jsonb_build_object('operator',p_operator,'filename',p_filename,'inserted',inserted,'updated',updated,'skipped',skipped,'deleted',deleted));
  return jsonb_build_object('id',job_id::text,'inserted_count',inserted,'updated_count',updated,'skipped_count',skipped,'deleted_count',deleted,'errors',v_errors);
end $$;

revoke all on function public.admin_public_record(jsonb) from public,anon,authenticated;
revoke all on function public.admin_apply_change(text,text,text,jsonb,bigint,text) from public,anon,authenticated;
revoke all on function public.admin_assets_index(integer,integer,text,text,text) from public,anon,authenticated;
revoke all on function public.admin_import_batch(text,text,jsonb,bigint,text,text) from public,anon,authenticated;
grant execute on function public.admin_public_record(jsonb) to service_role;
grant execute on function public.admin_apply_change(text,text,text,jsonb,bigint,text) to service_role;
grant execute on function public.admin_assets_index(integer,integer,text,text,text) to service_role;
grant execute on function public.admin_import_batch(text,text,jsonb,bigint,text,text) to service_role;
commit;
