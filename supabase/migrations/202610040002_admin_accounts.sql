begin;

create table if not exists public.admin_accounts (
  id bigint generated always as identity primary key,
  email text not null unique check (email = lower(btrim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  password_hash text not null,
  is_active boolean not null default true,
  session_version bigint not null default 1,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.admin_accounts enable row level security;
revoke all on table public.admin_accounts from public,anon,authenticated;
grant select,insert,update on table public.admin_accounts to service_role;
revoke all on sequence public.admin_accounts_id_seq from public,anon,authenticated;
grant usage,select on sequence public.admin_accounts_id_seq to service_role;

create or replace function public.admin_manage_account(
  p_action text,p_id text,p_data jsonb,p_actor_id bigint default null,p_operator text default null,p_self_id text default null,p_bootstrap_email text default null
)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare before_row jsonb; after_row jsonb; field text; email_value text;
begin
  if p_action not in ('INSERT','UPDATE') or jsonb_typeof(p_data) is distinct from 'object' then raise exception 'Invalid admin action'; end if;
  if p_data = '{}'::jsonb then raise exception 'No fields provided'; end if;
  for field in select jsonb_object_keys(p_data) loop
    if field not in ('email','password_hash','is_active') then raise exception 'Field not allowed'; end if;
  end loop;
  if p_data ? 'email' then
    email_value := lower(btrim(p_data->>'email'));
    if email_value is null or email_value = lower(btrim(p_bootstrap_email)) then raise exception 'Email is reserved or invalid'; end if;
  end if;
  if p_data ? 'password_hash' and coalesce(p_data->>'password_hash','') !~ '^\$2b\$12\$[./A-Za-z0-9]{53}$' then raise exception 'Password must be a server generated bcrypt hash'; end if;
  if p_data ? 'is_active' and jsonb_typeof(p_data->'is_active') is distinct from 'boolean' then raise exception 'Active must be boolean'; end if;
  if p_action = 'INSERT' then
    if not (p_data ? 'password_hash') or not (p_data ? 'email') then raise exception 'Email and password are required'; end if;
    insert into public.admin_accounts(email,password_hash,is_active,created_by_email)
    values(email_value,p_data->>'password_hash',coalesce((p_data->>'is_active')::boolean,true),p_operator)
    returning to_jsonb(admin_accounts.*) into after_row;
  else
    select to_jsonb(a) into before_row from public.admin_accounts a where a.id=p_id::bigint for update;
    if before_row is null then raise exception using errcode='P0002',message='Admin not found'; end if;
    if p_self_id is not null and p_id::bigint=p_self_id::bigint and p_data->'is_active'='false'::jsonb then raise exception 'Cannot disable current admin'; end if;
    update public.admin_accounts a set
      email=case when p_data ? 'email' then email_value else a.email end,
      password_hash=case when p_data ? 'password_hash' then p_data->>'password_hash' else a.password_hash end,
      is_active=case when p_data ? 'is_active' then (p_data->>'is_active')::boolean else a.is_active end,
      session_version=a.session_version+1,updated_at=now()
    where a.id=p_id::bigint returning to_jsonb(a.*) into after_row;
  end if;
  insert into public.audit_logs(actor_user_id,action,entity,entity_id,old_data,new_data)
  values(p_actor_id,p_action,'admins',after_row->>'id',public.admin_public_record(before_row)-'session_version',jsonb_build_object('record',public.admin_public_record(after_row)-'session_version','operator',p_operator,'credential_updated',p_data ? 'password_hash'));
  return public.admin_public_record(after_row)-'session_version';
end $$;
revoke all on function public.admin_manage_account(text,text,jsonb,bigint,text,text,text) from public,anon,authenticated;
grant execute on function public.admin_manage_account(text,text,jsonb,bigint,text,text,text) to service_role;
notify pgrst,'reload schema';
commit;
