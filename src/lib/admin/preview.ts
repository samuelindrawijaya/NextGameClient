import games from "@/data/games.json";
import { entities, positiveId, redact, type Entity, type Row } from "./model";
import type { ImportRow } from "./csv";

export type PreviewStore = Record<Entity, Row[]>;
export function hasGameAsset(store: PreviewStore, appId: Row[string]) {
  return store.assets.some(
    (asset) =>
      String(asset.game_id) === String(appId) &&
      (asset.has_lua === true || asset.has_meta === true),
  );
}
export function seedPreview(): PreviewStore {
  return {
    games: games.map((game, i) => ({
      id: String(i + 1),
      app_id: String(game.app_id),
      name: game.name,
      image: game.header,
      description: game.description,
      genre: game.genres,
      release_date: game.release_date,
      categories: [],
      publishers: [game.publisher],
      created_at: null,
      updated_at: null,
    })),
    assets: [],
    users: [],
    admins: [],
    libraries: [],
    transactions: [],
    versions: [],
    sync: [],
    audit: [],
    jobs: [],
  };
}
function nextId(rows: Row[], key: string) {
  return (
    rows.reduce((max, row) => {
      try {
        const n = BigInt(String(row[key]));
        return n > max ? n : max;
      } catch {
        return max;
      }
    }, BigInt(0)) + BigInt(1)
  ).toString();
}
export function previewChange(
  store: PreviewStore,
  entity: Entity,
  action: "INSERT" | "UPDATE" | "DELETE",
  id: string | null,
  data: Row,
): PreviewStore {
  const spec = entities[entity];
  if (
    (action === "INSERT" && !spec.create) ||
    (action === "UPDATE" && !spec.edit) ||
    (action === "DELETE" && !spec.remove)
  )
    throw new Error("Action tidak tersedia.");
  const rows = store[entity];
  const old = rows.find((row) => String(row[spec.pk]) === id);
  if (action !== "INSERT" && !old) throw new Error("Record tidak ditemukan.");
  const unique =
    entity === "games"
      ? "app_id"
      : entity === "users" || entity === "admins"
        ? "email"
        : entity === "versions"
          ? "version"
          : entity === "assets"
            ? "game_id"
            : null;
  if (
    unique &&
    data[unique] !== undefined &&
    rows.some(
      (row) =>
        String(row[unique]) === String(data[unique]) &&
        String(row[spec.pk]) !== id,
    )
  )
    throw new Error(`${unique} sudah ada.`);
  if (entity === "users" && action === "DELETE")
    throw new Error("Policy delete user belum ditentukan.");
  if (
    entity === "games" &&
    action === "DELETE" &&
    old &&
    (store.libraries.some((row) => row.app_id_buy === old.app_id) ||
      store.transactions.some((row) => row.game_id === old.id))
  )
    throw new Error("Game masih dipakai library atau transaksi.");
  const stamp = new Date().toISOString();
  const record: Row = {
    ...(old || {}),
    ...data,
    [spec.pk]:
      action === "INSERT"
        ? entity === "assets"
          ? positiveId(data.game_id)
          : nextId(rows, spec.pk)
        : id!,
    created_at: old?.created_at || stamp,
    updated_at: stamp,
  };
  if (entity === "assets") {
    if ("lua_data" in data)
      record.has_lua = String(data.lua_data || "").length > 2;
    if ("meta_data" in data)
      record.has_meta = String(data.meta_data || "").length > 2;
  }
  if (entity === "libraries") {
    if (
      (action === "INSERT" || old?.app_id_buy !== record.app_id_buy) &&
      !hasGameAsset(store, record.app_id_buy)
    )
      throw new Error(
        "Game belum memiliki asset berisi data. Tambahkan asset terlebih dahulu.",
      );
    if (
      !store.users.some((user) => user.user_id === record.user_id) ||
      !store.games.some((game) => game.app_id === record.app_id_buy)
    )
      throw new Error("Pilih pengguna dan game existing.");
    if (
      rows.some(
        (row) =>
          row.user_id === record.user_id &&
          row.app_id_buy === record.app_id_buy &&
          String(row.id) !== id,
      )
    )
      throw new Error("Game sudah ada di library pengguna.");
    if (
      record.purchase_id &&
      !store.transactions.some(
        (invoice) =>
          invoice.id === record.purchase_id &&
          invoice.user_id === record.user_id &&
          invoice.game_id ===
            store.games.find((game) => game.app_id === record.app_id_buy)?.id,
      )
    )
      throw new Error("Invoice harus sesuai pengguna dan game.");
    if (record.purchase_id && record.is_from_free_claim)
      throw new Error("Pembelian bukan free claim.");
  }
  if (
    entity === "transactions" &&
    record.user_id &&
    !store.users.some((user) => user.user_id === record.user_id)
  )
    throw new Error("User tidak ditemukan.");
  const clean = redact(record) as Row;
  if (entity === "admins" && action === "INSERT")
    clean.created_by_email = "Local preview";
  const updated =
    action === "DELETE"
      ? rows.filter((row) => String(row[spec.pk]) !== id)
      : action === "INSERT"
        ? [clean, ...rows]
        : rows.map((row) => (String(row[spec.pk]) === id ? clean : row));
  const log: Row = {
    id: nextId(store.audit, "id"),
    actor_user_id: null,
    action,
    entity,
    entity_id: String(record[spec.pk]),
    old_data: old ? redact(old) : null,
    new_data: {
      record: action === "DELETE" ? null : clean,
      operator: "Local preview",
    },
    created_at: stamp,
  };
  return { ...store, [entity]: updated, audit: [log, ...store.audit] };
}
export function previewImport(
  store: PreviewStore,
  entity: "games" | "assets",
  rows: ImportRow[],
  mode: string,
  filename: string,
) {
  let next = store;
  const counts = {
    inserted_count: 0,
    updated_count: 0,
    skipped_count: 0,
    deleted_count: 0,
  };
  const errors: { row: number; message: string }[] = [];
  for (const item of rows) {
    try {
      const key = entity === "games" ? "app_id" : "game_id";
      const existing = next[entity].find((row) => row[key] === item.data[key]);
      if (
        (existing &&
          ((entity === "games" && mode === "INSERT_ONLY") ||
            (entity === "assets" && item.action === "INSERT"))) ||
        (!existing && item.action === "DELETE")
      ) {
        counts.skipped_count++;
        continue;
      }
      const action =
        item.action === "DELETE" ? "DELETE" : existing ? "UPDATE" : "INSERT";
      const data = { ...item.data };
      if (entity === "assets" && action === "UPDATE") delete data.game_id;
      next = previewChange(
        next,
        entity,
        action,
        existing ? String(existing[entities[entity].pk]) : null,
        data,
      );
      counts[
        action === "INSERT"
          ? "inserted_count"
          : action === "UPDATE"
            ? "updated_count"
            : "deleted_count"
      ]++;
    } catch (error) {
      errors.push({
        row: item.row,
        message: error instanceof Error ? error.message : "Import gagal.",
      });
    }
  }
  const job: Row = {
    id: nextId(next.jobs, "id"),
    entity,
    mode: entity === "assets" ? "MIXED" : mode,
    filename,
    status: errors.length ? "failed" : "completed",
    ...counts,
    errors,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  return { store: { ...next, jobs: [job, ...next.jobs] }, result: job };
}
