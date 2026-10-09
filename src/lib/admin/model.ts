export type Json =
  string | number | boolean | null | Json[] | { [key: string]: Json };
export type Row = { [key: string]: Json };
export type Entity =
  | "games"
  | "assets"
  | "users"
  | "admins"
  | "libraries"
  | "transactions"
  | "versions"
  | "sync"
  | "audit"
  | "jobs";
export type Field = {
  key: string;
  label: string;
  type:
    | "text"
    | "id"
    | "number"
    | "date"
    | "array"
    | "boolean"
    | "long"
    | "bytes"
    | "password";
  required?: boolean;
  default?: Json;
};
export type EntitySpec = {
  title: string;
  table: string;
  pk: string;
  select: string;
  columns: [string, string][];
  fields: Field[];
  create?: boolean;
  edit?: boolean;
  remove?: boolean;
  order: string;
};
export const entities: Record<Entity, EntitySpec> = {
  admins: {
    title: "Admin Accounts",
    table: "admin_accounts",
    pk: "id",
    order: "id.desc",
    create: true,
    edit: true,
    select: "id::text,email,is_active,created_by_email,created_at,updated_at",
    columns: [
      ["email", "Admin"],
      ["is_active", "Active"],
      ["created_by_email", "Created by"],
      ["created_at", "Created"],
      ["updated_at", "Updated"],
    ],
    fields: [
      { key: "email", label: "Email", type: "text", required: true },
      { key: "password", label: "Temporary password", type: "password" },
      {
        key: "is_active",
        label: "Active account",
        type: "boolean",
        default: true,
      },
    ],
  },
  games: {
    title: "Game List",
    table: "game_lists",
    pk: "id",
    select:
      "id::text,app_id::text,name,image,description,genre,release_date,categories,publishers,created_at,updated_at",
    order: "id.desc",
    create: true,
    edit: true,
    remove: true,
    columns: [
      ["name", "Game"],
      ["app_id", "App ID"],
      ["genre", "Genre"],
      ["release_date", "Release"],
      ["updated_at", "Updated"],
    ],
    fields: [
      { key: "app_id", label: "Steam App ID", type: "id", required: true },
      { key: "name", label: "Name", type: "text", required: true },
      { key: "image", label: "Image URL", type: "text" },
      { key: "description", label: "Description", type: "long" },
      { key: "genre", label: "Genres", type: "array" },
      { key: "release_date", label: "Release date", type: "date" },
      { key: "categories", label: "Categories", type: "array" },
      { key: "publishers", label: "Publishers", type: "array" },
    ],
  },
  assets: {
    title: "Game Assets",
    table: "game_assets",
    pk: "game_id",
    select: "game_id::text,encryption_version,created_at,updated_at",
    order: "game_id.desc",
    create: true,
    edit: true,
    remove: true,
    columns: [
      ["game_id", "Game ID"],
      ["app_id", "App ID"],
      ["game_name", "Game"],
      ["has_lua", "Lua"],
      ["has_meta", "Metadata"],
      ["encryption_version", "Encryption"],
      ["updated_at", "Updated"],
    ],
    fields: [
      { key: "game_id", label: "Game ID", type: "id", required: true },
      { key: "lua_data", label: "Encrypted Lua · bytea hex", type: "bytes" },
      {
        key: "meta_data",
        label: "Encrypted metadata · bytea hex",
        type: "bytes",
      },
      {
        key: "encryption_version",
        label: "Encryption version",
        type: "number",
        required: true,
        default: 1,
      },
    ],
  },
  users: {
    title: "User List",
    table: "user",
    pk: "user_id",
    select:
      "user_id::text,email,access_role_code,access_role_name,is_verified,free_claim_game,machine_info,created_at,updated_at",
    order: "user_id.desc",
    create: true,
    edit: true,
    columns: [
      ["email", "User"],
      ["access_role_name", "Role"],
      ["is_verified", "Verified"],
      ["free_claim_game", "Free claim"],
      ["machine_info", "Machine"],
      ["created_at", "Joined"],
    ],
    fields: [
      { key: "email", label: "Email", type: "text", required: true },
      { key: "password", label: "New password", type: "password" },
      {
        key: "access_role_code",
        label: "Role code",
        type: "number",
        required: true,
        default: 1,
      },
      {
        key: "access_role_name",
        label: "Role name",
        type: "text",
        required: true,
        default: "user",
      },
      {
        key: "is_verified",
        label: "Verified",
        type: "boolean",
        default: true,
      },
      {
        key: "free_claim_game",
        label: "Free claim quota",
        type: "number",
        required: true,
        default: 0,
      },
      { key: "machine_info", label: "Machine info", type: "long" },
    ],
  },
  libraries: {
    title: "User Libraries",
    table: "user_list_game",
    pk: "id",
    select:
      "id::text,user_id::text,app_id_buy::text,purchase_id::text,is_from_free_claim,created_at,updated_at",
    order: "id.desc",
    create: true,
    edit: true,
    fields: [
      { key: "user_id", label: "User ID", type: "id", required: true },
      { key: "app_id_buy", label: "Steam App ID", type: "id", required: true },
      { key: "purchase_id", label: "Purchase ID (invoice)", type: "id" },
      {
        key: "is_from_free_claim",
        label: "From free claim",
        type: "boolean",
        default: false,
      },
    ],
    columns: [
      ["user_email", "User"],
      ["app_id_buy", "App ID"],
      ["game_name", "Game"],
      ["invoice_number", "Invoice"],
      ["is_from_free_claim", "Free claim"],
      ["created_at", "Added"],
    ],
  },
  transactions: {
    title: "Transactions",
    table: "history_purchase",
    pk: "id",
    select:
      "id::text,invoice_number,user_id::text,platform,game_id::text,is_processed,is_invoice_used,created_at,updated_at",
    order: "id.desc",
    create: true,
    edit: true,
    remove: true,
    fields: [
      { key: "user_id", label: "User ID", type: "id" },
      { key: "game_id", label: "Game ID", type: "id" },
      {
        key: "invoice_number",
        label: "Invoice number",
        type: "text",
        required: true,
      },
      { key: "platform", label: "Platform", type: "text" },
      {
        key: "is_processed",
        label: "Processed",
        type: "boolean",
        default: false,
      },
      {
        key: "is_invoice_used",
        label: "Invoice used",
        type: "boolean",
        default: false,
      },
      {
        key: "game_id",
        label: "Game ID",
        type: "id",
        required: true,
      },
      {
        key: "is_procces",
        label: "Processed",
        type: "boolean",
        default: false,
      },
      {
        key: "platform",
        label: "Platform",
        type: "text",
        default: "manual",
      },
    ],
    columns: [
      ["invoice_number", "Invoice"],
      ["user_email", "User"],
      ["platform", "Platform"],
      ["game_name", "Game"],
      ["is_procces", "Processed"],
      ["is_invoice_used", "Invoice used"],
      ["created_at", "Created"],
    ],
  },
  versions: {
    title: "App Versions",
    table: "version_apps",
    pk: "id",
    select: "id::text,version,created_at,updated_at",
    order: "id.desc",
    create: true,
    edit: true,
    remove: true,
    fields: [
      { key: "version", label: "Version", type: "text", required: true },
    ],
    columns: [
      ["version", "Version"],
      ["created_at", "Created"],
      ["updated_at", "Updated"],
    ],
  },
  sync: {
    title: "Sync Status",
    table: "game_sync_runs",
    pk: "id",
    select:
      "id::text,source,status,existing_appids,upstream_games,new_games_found,inserted_games,started_at,finished_at,error_message",
    order: "id.desc",
    fields: [],
    columns: [
      ["source", "Source"],
      ["status", "Status"],
      ["new_games_found", "Found"],
      ["inserted_games", "Inserted"],
      ["started_at", "Started"],
    ],
  },
  audit: {
    title: "Audit Logs",
    table: "audit_logs",
    pk: "id",
    select:
      "id::text,actor_user_id::text,action,entity,entity_id,old_data,new_data,created_at",
    order: "id.desc",
    fields: [],
    columns: [
      ["action", "Action"],
      ["entity", "Entity"],
      ["entity_id", "ID"],
      ["actor_user_id", "Actor"],
      ["created_at", "Time"],
    ],
  },
  jobs: {
    title: "Import Jobs",
    table: "import_jobs",
    pk: "id",
    select:
      "id::text,entity,mode,filename,status,inserted_count,updated_count,skipped_count,deleted_count,errors,created_by::text,created_at,updated_at",
    order: "id.desc",
    fields: [],
    columns: [
      ["filename", "File"],
      ["entity", "Entity"],
      ["status", "Status"],
      ["inserted_count", "Inserted"],
      ["updated_count", "Updated"],
      ["skipped_count", "Skipped"],
    ],
  },
};

export const menu = [
  { group: "Workspace", items: [["dashboard", "Dashboard"]] },
  {
    group: "Games",
    items: [
      ["games", "Game List"],
      ["import-games", "Import Games"],
      ["sync", "Sync Status"],
    ],
  },
  {
    group: "Assets",
    items: [
      ["assets", "Game Assets"],
      ["import-assets", "Import Assets"],
    ],
  },
  {
    group: "Users",
    items: [
      ["users", "User List"],
      ["libraries", "User Libraries"],
    ],
  },
  { group: "Commerce", items: [["transactions", "Transactions"]] },
  {
    group: "System",
    items: [
      ["admins", "Admin Accounts"],
      ["versions", "App Versions"],
      ["audit", "Audit Logs"],
    ],
  },
] as const;
export type Section = (typeof menu)[number]["items"][number][0];
export const isEntity = (value: string): value is Entity =>
  Object.hasOwn(entities, value);
export function positiveId(value: unknown): string {
  const text = String(value ?? "").trim();
  if (
    !/^\d+$/.test(text) ||
    BigInt(text) < BigInt(1) ||
    BigInt(text) > BigInt("9223372036854775807")
  )
    throw new Error("ID harus integer positif dalam rentang bigint.");
  return BigInt(text).toString();
}
export function redact(value: Json): Json {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([key]) =>
            !/(password|lua_data|meta_data|otp_code|recovery_key|token|secret)/i.test(
              key,
            ),
        )
        .map(([key, item]) => [key, redact(item)]),
    );
  return value;
}

export function validate(
  entity: Entity,
  raw: Record<string, unknown>,
  creating: boolean,
): Row {
  const spec = entities[entity];
  const out: Row = {};
  for (const field of spec.fields) {
    if (!(field.key in raw)) {
      if (creating && field.default !== undefined)
        out[field.key] = field.default;
      else if (creating && field.required)
        throw new Error(`${field.label} wajib diisi.`);
      continue;
    }
    const value = raw[field.key];
    if (field.type === "boolean") {
      if (typeof value !== "boolean")
        throw new Error(`${field.label} harus boolean.`);
      out[field.key] = value;
      continue;
    }
    if (field.type === "array") {
      if (
        !Array.isArray(value) ||
        value.some((item) => typeof item !== "string") ||
        value.length > 100
      )
        throw new Error(`${field.label} harus array teks.`);
      out[field.key] = value.map((item) => item.trim()).filter(Boolean);
      continue;
    }
    const text = String(value ?? "").trim();
    if (!text) {
      if (field.required) throw new Error(`${field.label} wajib diisi.`);
      if (field.type !== "password") out[field.key] = null;
      continue;
    }
    if (field.type === "id") {
      out[field.key] = positiveId(text);
      continue;
    }
    if (field.type === "number") {
      const n = Number(text);
      if (
        !Number.isSafeInteger(n) ||
        n < 0 ||
        n > 2147483647 ||
        (field.key === "encryption_version" && (n < 1 || n > 32767))
      )
        throw new Error(`${field.label} di luar rentang.`);
      out[field.key] = n;
      continue;
    }
    if (
      field.type === "date" &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(text) ||
        Number.isNaN(Date.parse(text)) ||
        new Date(text).toISOString().slice(0, 10) !== text)
    )
      throw new Error("Release date tidak valid.");
    if (
      field.type === "bytes" &&
      (!/^\\x(?:[a-f0-9]{2})*$/i.test(text) || text.length > 2097154)
    )
      throw new Error(
        `${field.label}: gunakan \\x diikuti byte hex, maksimal 1 MB.`,
      );
    if (field.type === "bytes") {
      out[field.key] = text;
      continue;
    }
    if (field.type === "password") {
      const password = String(value);
      if (
        password.length < 12 ||
        new TextEncoder().encode(password).length > 72
      )
        throw new Error("Password minimal 12 karakter dan maksimal 72 byte.");
      out[field.key] = password;
      continue;
    }
    if (text.length > 20000) throw new Error(`${field.label} terlalu panjang.`);
    if (field.key === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))
      throw new Error("Email tidak valid.");
    if (
      field.key === "image" &&
      !text.startsWith("/steam/") &&
      !/^https?:\/\//i.test(text)
    )
      throw new Error("Image harus URL HTTP(S) atau path artwork lokal.");
    out[field.key] = field.key === "email" ? text.toLowerCase() : text;
  }
  if (creating && (entity === "users" || entity === "admins") && !out.password)
    throw new Error("Temporary password wajib diisi.");
  if (creating && entity === "users") {
    // Registration is password-only; initialize the Worker machine record.
    out.is_verified = true;
    out.machine_info ??= "{}";
  }
  if (!creating && entity === "assets") delete out.game_id;
  if (!Object.keys(out).length)
    throw new Error("Tidak ada perubahan yang valid.");
  return out;
}
