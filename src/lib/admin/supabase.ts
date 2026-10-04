import { entities, positiveId, redact, type Entity, type Row } from "./model";

export class AdminError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function database(path: string, init: RequestInit = {}) {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key)
    throw new AdminError("Supabase admin belum dikonfigurasi.", 503);
  const response = await fetch(new URL(`/rest/v1/${path}`, base), {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const code = String(error.code || "");
    throw new AdminError(
      code === "23503"
        ? "Data masih dipakai oleh record terkait; perubahan dibatalkan."
        : code === "23505"
          ? "ID, email, invoice, atau version sudah ada."
          : code === "PGRST202"
            ? "RPC admin belum tersedia. Terapkan migration admin terlebih dahulu."
            : code === "P0002"
              ? "Record tidak ditemukan."
              : "Operasi database gagal. Periksa schema, izin server, dan migration admin.",
      code === "23503" || code === "23505" ? 409 : 502,
    );
  }
  return response;
}
export async function rpc(name: string, data: Record<string, unknown>) {
  return (
    await database(`rpc/${name}`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  ).json();
}
export async function readRows(
  entity: Entity,
  page = 1,
  q = "",
  oneId?: string,
  filters: { userId?: string; gameId?: string } = {},
) {
  const spec = entities[entity];
  const limit = 20;
  let rows: Row[];
  let total = 0;
  if (entity === "assets") {
    const kind = process.env.ADMIN_ASSET_ID_KIND;
    if (kind !== "app_id" && kind !== "id")
      throw new AdminError(
        "Tentukan ADMIN_ASSET_ID_KIND=app_id atau id sesuai makna game_assets.game_id.",
        503,
      );
    const result = await rpc("admin_assets_index", {
      p_limit: oneId ? 1 : limit,
      p_offset: oneId ? 0 : (page - 1) * limit,
      p_query: oneId ? "" : q,
      p_id_kind: kind,
      p_exact_id: oneId ? positiveId(oneId) : null,
    });
    return {
      rows: result.rows || [],
      total: Number(result.total || 0),
      page,
      pageSize: limit,
    };
  }
  const params = new URLSearchParams({
    select: spec.select,
    order: spec.order,
    limit: String(oneId ? 1 : limit),
    offset: String(oneId ? 0 : (page - 1) * limit),
  });
  if (oneId) params.set(spec.pk, `eq.${positiveId(oneId)}`);
  if (filters.userId && (entity === "transactions" || entity === "libraries"))
    params.set("user_id", `eq.${positiveId(filters.userId)}`);
  if (filters.gameId && entity === "transactions")
    params.set("game_id", `eq.${positiveId(filters.gameId)}`);
  if (q.trim()) {
    const text = q
      .replace(/[(),.%:*"\\]/g, " ")
      .trim()
      .slice(0, 100);
    const fields: Partial<Record<Entity, string[]>> = {
      games: ["name"],
      users: ["email", "access_role_name"],
      admins: ["email"],
      transactions: ["invoice_number", "platform"],
      versions: ["version"],
      sync: ["status", "source"],
      audit: ["action", "entity"],
      jobs: ["filename", "status"],
    };
    const clauses = (fields[entity] || []).map(
      (field) => `${field}.ilike.*${text}*`,
    );
    if (entity === "libraries") {
      if (!/^\d+$/.test(text))
        throw new AdminError(
          "Cari User Libraries menggunakan User ID atau App ID.",
        );
      const id = positiveId(text);
      clauses.push(`user_id.eq.${id}`, `app_id_buy.eq.${id}`);
    }
    if (/^\d+$/.test(text))
      clauses.push(
        `${entity === "games" ? "app_id" : spec.pk}.eq.${positiveId(text)}`,
      );
    if (clauses.length) params.set("or", `(${clauses.join(",")})`);
  }
  const response = await database(`${spec.table}?${params}`, {
    headers: { Prefer: "count=exact" },
  });
  rows = await response.json();
  total = Number(
    response.headers.get("content-range")?.split("/").at(-1) || rows.length,
  );
  if (entity === "libraries" || entity === "transactions") {
    const gameKey = entity === "libraries" ? "app_id_buy" : "game_id";
    const gameIds = rows
      .map((r) => r[gameKey])
      .filter(Boolean)
      .map(positiveId);
    const userIds = rows
      .map((r) => r.user_id)
      .filter(Boolean)
      .map(positiveId);
    const purchaseIds =
      entity === "libraries"
        ? rows
            .map((r) => r.purchase_id)
            .filter(Boolean)
            .map(positiveId)
        : [];
    const [games, users, purchases] = await Promise.all([
      gameIds.length
        ? database(
            `game_lists?select=id::text,app_id::text,name&${entity === "libraries" ? "app_id" : "id"}=in.(${gameIds.join(",")})`,
          ).then((r) => r.json())
        : [],
      userIds.length
        ? database(
            `user?select=user_id::text,email&user_id=in.(${userIds.join(",")})`,
          ).then((r) => r.json())
        : [],
      purchaseIds.length
        ? database(
            `history_purchase?select=id::text,invoice_number&id=in.(${purchaseIds.join(",")})`,
          ).then((r) => r.json())
        : [],
    ]);
    rows = rows.map((row) => ({
      ...row,
      catalog_id:
        games.find(
          (game: Row) => String(game.app_id) === String(row.app_id_buy),
        )?.id || null,
      game_name:
        games.find(
          (game: Row) =>
            String(game[entity === "libraries" ? "app_id" : "id"]) ===
            String(row[gameKey]),
        )?.name || null,
      user_email:
        users.find((user: Row) => String(user.user_id) === String(row.user_id))
          ?.email || null,
      ...(entity === "libraries"
        ? {
            invoice_number:
              purchases.find((p: Row) => p.id === row.purchase_id)
                ?.invoice_number || null,
          }
        : {}),
    }));
  }
  return {
    rows: rows.map((row) => redact(row) as Row),
    total,
    page,
    pageSize: limit,
  };
}
export async function dashboard() {
  const count = async (entity: Entity, extra = "") => {
    const spec = entities[entity];
    const r = await database(`${spec.table}?select=${spec.pk}${extra}`, {
      method: "HEAD",
      headers: { Prefer: "count=exact" },
    });
    return Number(r.headers.get("content-range")?.split("/").at(-1) || 0);
  };
  const [
    users,
    verified,
    games,
    assets,
    transactions,
    pending,
    sync,
    versions,
  ] = await Promise.all([
    count("users"),
    count("users", "&is_verified=eq.true"),
    count("games"),
    count("assets"),
    count("transactions"),
    count("transactions", "&is_processed=eq.false"),
    readRows("sync"),
    readRows("versions"),
  ]);
  return {
    users,
    verified,
    unverified: users - verified,
    games,
    assets,
    transactions,
    pending,
    completed: transactions - pending,
    lastSync: sync.rows[0] || null,
    currentVersion: versions.rows[0] || null,
  };
}
