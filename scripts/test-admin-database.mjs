import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
await db.exec(`
create role anon; create role authenticated; create role service_role;
create table game_lists(id bigint generated always as identity primary key,app_id bigint not null unique,name text not null,image text,description text,genre text[] not null default '{}',release_date date,categories text[] not null default '{}',publishers text[] not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table game_assets(game_id bigint primary key,lua_data bytea,meta_data bytea,encryption_version smallint not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table "user"(user_id bigint generated always as identity primary key,email text not null unique,password_hash text,access_role_code integer not null default 1,access_role_name text not null default 'user',is_verified boolean not null default false,free_claim_game integer not null default 0,machine_info text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table user_list_game(id bigint generated always as identity primary key,user_id bigint not null references "user"(user_id),app_id_buy bigint not null references game_lists(app_id),is_from_free_claim boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table history_purchase(id bigint generated always as identity primary key,invoice_number text not null unique,platform text,game_id bigint references game_lists(id),is_procces boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table version_apps(id bigint generated always as identity primary key,version text not null unique,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table import_jobs(id bigint generated always as identity primary key,entity text not null check(entity in ('games','assets')),mode text not null check(mode in ('INSERT_ONLY','UPSERT','MIXED')),filename text,status text not null default 'pending' check(status in ('pending','running','completed','failed')),inserted_count integer not null default 0 check(inserted_count>=0),updated_count integer not null default 0 check(updated_count>=0),skipped_count integer not null default 0 check(skipped_count>=0),deleted_count integer not null default 0 check(deleted_count>=0),errors jsonb not null default '[]',created_by bigint references "user"(user_id),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table audit_logs(id bigint generated always as identity primary key,actor_user_id bigint,action text not null,entity text not null,entity_id text,old_data jsonb,new_data jsonb,created_at timestamptz not null default now());
grant usage on schema public to service_role; grant all on all tables in schema public to service_role; grant all on all sequences in schema public to service_role;
`);
await db.exec(
  await readFile(
    new URL(
      "../supabase/migrations/202610040001_admin_panel.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
const scalar = async (sql, args = []) =>
  Object.values((await db.query(sql, args)).rows[0])[0];
const change = async (entity, action, id, data) =>
  scalar("select public.admin_apply_change($1,$2,$3,$4::jsonb,null,$5)", [
    entity,
    action,
    id,
    JSON.stringify(data),
    "operator@example.test",
  ]);
const batch = async (entity, mode, rows) =>
  scalar("select public.admin_import_batch($1,$2,$3::jsonb,null,$4,$5)", [
    entity,
    mode,
    JSON.stringify(rows),
    "operator@example.test",
    "fixture.csv",
  ]);

await db.exec("set role service_role");
const game = await change("games", "INSERT", null, {
  app_id: "9223372036854775806",
  name: "Original",
  genre: ["RPG"],
});
assert.equal(game.app_id, "9223372036854775806");
assert.equal(game.id, "1");
assert.equal(await scalar("select count(*)::int from audit_logs"), 1);
await assert.rejects(
  change("games", "INSERT", null, {
    id: 10,
    app_id: "10",
    name: "Unexpected field",
  }),
);
await assert.rejects(
  change("games", "INSERT", null, {
    app_id: "9223372036854775806",
    name: "Duplicate",
  }),
);
assert.equal(await scalar("select count(*)::int from audit_logs"), 1);
const insertOnly = await batch("games", "INSERT_ONLY", [
  { row: 2, action: "UPSERT", data: { app_id: game.app_id, name: "Changed" } },
  { row: 3, action: "UPSERT", data: { app_id: "10", name: "New" } },
]);
assert.equal(insertOnly.skipped_count, 1);
assert.equal(insertOnly.inserted_count, 1);
assert.equal(
  await scalar("select name from game_lists where id=1"),
  "Original",
);
const upsert = await batch("games", "UPSERT", [
  { row: 2, action: "UPSERT", data: { app_id: game.app_id, name: "Changed" } },
]);
assert.equal(upsert.updated_count, 1);
const asset = await change("assets", "INSERT", null, {
  game_id: game.app_id,
  lua_data: "\\x0123",
  meta_data: "\\x4567",
  encryption_version: 1,
});
assert.equal(asset.has_lua, true);
assert.equal("lua_data" in asset, false);
const index = await scalar("select public.admin_assets_index(20,0,$1,$2)", [
  "",
  "app_id",
]);
assert.equal(index.rows[0].game_name, "Changed");
assert.equal(index.rows[0].has_meta, true);
const exact = await scalar("select public.admin_assets_index(1,0,$1,$2,$3)", [
  "",
  "app_id",
  game.app_id,
]);
assert.equal(exact.rows.length, 1);
assert.equal(exact.rows[0].game_id, game.app_id);
const internal = await scalar("select public.admin_assets_index(20,0,$1,$2)", [
  "",
  "id",
]);
assert.equal(internal.rows[0].game_name, null);
await batch("assets", "MIXED", [
  {
    row: 2,
    action: "UPSERT",
    data: { game_id: game.app_id, lua_data: null, meta_data: null },
  },
]);
assert.equal(await scalar("select count(*)::int from game_assets"), 1);
await batch("assets", "MIXED", [
  { row: 2, action: "DELETE", data: { game_id: game.app_id } },
]);
assert.equal(await scalar("select count(*)::int from game_assets"), 0);
const user = await change("users", "INSERT", null, {
  email: "user@example.test",
  password_hash: "private-hash",
});
assert.equal("password_hash" in user, false);
await change("users", "UPDATE", user.user_id, {
  password_hash: "new-private-hash",
});
assert.equal(
  await scalar(
    "select count(*)::int from audit_logs where old_data::text like '%private-hash%' or new_data::text like '%private-hash%'",
  ),
  0,
);
await assert.rejects(change("users", "DELETE", user.user_id, {}));
await db.query("insert into user_list_game(user_id,app_id_buy) values($1,$2)", [
  user.user_id,
  game.app_id,
]);
await assert.rejects(change("games", "DELETE", game.id, {}));
assert.equal(await scalar("select name from game_lists where id=1"), "Changed");
await db.query(
  "insert into history_purchase(invoice_number,game_id) values('INV-1',$1)",
  [game.id],
);
await assert.rejects(change("transactions", "DELETE", "1", {}));
await change("transactions", "UPDATE", "1", { is_procces: true });
assert.equal(
  await scalar("select is_procces from history_purchase where id=1"),
  true,
);
await assert.rejects(
  change("transactions", "UPDATE", "1", { is_procces: false }),
);
const partial = await batch("games", "UPSERT", [
  { row: 2, action: "UPSERT", data: { app_id: "20", name: "Valid" } },
  { row: 3, action: "UPSERT", data: { app_id: "21", name: null } },
]);
assert.equal(partial.inserted_count, 1);
assert.equal(partial.errors.length, 1);
assert.equal(
  await scalar("select status from import_jobs where id=$1", [partial.id]),
  "failed",
);
await db.exec("reset role; set role anon");
await assert.rejects(
  change("games", "INSERT", null, { app_id: "30", name: "Denied" }),
);
await db.exec("reset role");
await db.exec(
  "create function public.reject_audit() returns trigger language plpgsql as $$begin raise exception 'audit unavailable'; end$$; create trigger reject_audit before insert on audit_logs for each row execute function public.reject_audit();",
);
await assert.rejects(
  change("games", "INSERT", null, { app_id: "40", name: "Must roll back" }),
);
assert.equal(
  await scalar("select count(*)::int from game_lists where app_id=40"),
  0,
);
await db.close();
console.log(
  "Admin SQL passed: bigint IDs, CRUD/audit atomicity, FK protection, import modes, explicit asset delete, redaction, transaction policy, and role permissions.",
);
