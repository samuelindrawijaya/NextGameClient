begin;

-- Add User supplies email and a bcrypt password hash. The database supplies
-- timestamps and defaults for the remaining account fields when omitted.
alter table public."user"
  alter column access_role_code set default 1,
  alter column access_role_name set default 'user',
  alter column is_verified set default true,
  alter column free_claim_game set default 0,
  alter column machine_info set default '{}',
  alter column created_at set default now(),
  alter column updated_at set default now();

commit;
