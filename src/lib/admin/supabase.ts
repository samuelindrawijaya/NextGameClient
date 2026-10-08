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
            ? path === "rpc/admin_assets_page"
              ? "Pencarian asset cepat belum tersedia. Terapkan migration 007 terlebih dahulu."
              : path === "rpc/admin_library_games"
                ? "Pemilih game dengan asset belum tersedia. Terapkan migration 005 terlebih dahulu."
                : "RPC admin belum tersedia. Terapkan migration admin terlebih dahulu."
            : code === "P0002"
              ? "Record tidak ditemukan."
              : code === "PGA01"
                ? "Game belum memiliki asset berisi data. Tambahkan asset sebelum memberikan game ke library."
                : code === "57014"
                  ? path === "rpc/admin_assets_index" ||
                    path === "rpc/admin_assets_page"
                    ? "Pencarian asset melewati batas waktu. Terapkan migration 004, 006, dan 007 untuk mempercepat pencarian."
                    : "Pencarian database melewati batas waktu. Terapkan migration 004 untuk index pencarian game."
                  : "Operasi database gagal. Periksa schema, izin server, dan migration admin.",
      code === "23503" || code === "23505" || code === "PGA01" ? 409 : 502,
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
  filters: {
    userId?: string;
    gameId?: string;
    lookup?: boolean;
    assetsOnly?: boolean;
    beforeId?: string;
  } = {},
) {
  const spec = entities[entity];
  const limit = filters.lookup ? 8 : 20;
  let rows: Row[];
  let total = 0;
  if (entity === "games" && filters.assetsOnly) {
    const text = q
      .replace(/[(),.%:*"\\]/g, " ")
      .trim()
      .slice(0, 100);
    if (text && !/^\d+$/.test(text) && text.length < 3)
      throw new AdminError(
        "Ketik minimal 3 karakter nama game atau Steam AppID lengkap.",
      );
    const query = /^\d+$/.test(text) ? positiveId(text) : text;
    const result: Row[] = await rpc("admin_library_games", {
      p_query: query,
      p_limit: limit,
    });
    return { rows: result, total: result.length, page: 1, pageSize: limit };
  }
  if (entity === "assets") {
    const text = q
      .replace(/[%_*\\]/g, " ")
      .trim()
      .slice(0, 100);
    if (!oneId && text && !/^\d+$/.test(text) && text.length < 3)
      throw new AdminError(
        "Ketik minimal 3 karakter nama game atau Steam AppID lengkap.",
      );
    const query = /^\d+$/.test(text) ? positiveId(text) : text;
    const kind = process.env.ADMIN_ASSET_ID_KIND;
    if (kind !== "app_id" && kind !== "id")
      throw new AdminError(
        "Tentukan ADMIN_ASSET_ID_KIND=app_id atau id sesuai makna game_assets.game_id.",
        503,
      );
    const result = await rpc("admin_assets_page", {
      p_limit: oneId ? 1 : limit,
      p_offset: oneId ? 0 : (page - 1) * limit,
      p_query: oneId ? "" : query,
      p_id_kind: kind,
      p_exact_id: oneId ? positiveId(oneId) : null,
      p_before_id: filters.beforeId ? positiveId(filters.beforeId) : null,
    });
    return {
      rows: result.rows || [],
      total: null,
      hasMore: Boolean(result.has_more),
      nextCursor: result.next_cursor || null,
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
    const clauses = (entity === "games" ? [] : fields[entity] || []).map(
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
    if (entity === "games") {
      if (/^\d+$/.test(text)) params.set("app_id", `eq.${positiveId(text)}`);
      else {
        if (text.length < 3)
          throw new AdminError(
            "Ketik minimal 3 karakter nama game atau Steam AppID lengkap.",
          );
        params.set("name", `ilike.*${text}*`);
      }
    } else if (/^\d+$/.test(text))
      clauses.push(`${spec.pk}.eq.${positiveId(text)}`);
    if (clauses.length) params.set("or", `(${clauses.join(",")})`);
  }
  const response = await database(`${spec.table}?${params}`, {
    headers: filters.lookup ? {} : { Prefer: "count=exact" },
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
  let counts: Record<string, number> = {};
  try {
    counts = await rpc("admin_count_dashboard", {});
  } catch {
    // fallback jika RPC belum tersedia
    const count = async (entity: Entity, extra = "") => {
      const spec = entities[entity];
      const r = await database(`${spec.table}?select=${spec.pk}${extra}`, {
        method: "HEAD",
        headers: { Prefer: "count=exact" },
      });
      return Number(r.headers.get("content-range")?.split("/").at(-1) || 0);
    };
    const [users, verified, games, assets, transactions, pending] =
      await Promise.all([
        count("users"),
        count("users", "&is_verified=eq.true"),
        count("games"),
        count("assets"),
        count("transactions"),
        count("transactions", "&is_processed=eq.false"),
      ]);
    counts = {
      users,
      verified,
      unverified: users - verified,
      games,
      assets,
      transactions,
      pending,
      completed: transactions - pending,
    };
  }
  const [sync, versions] = await Promise.all([
    readRows("sync"),
    readRows("versions"),
  ]);
  return {
    users: counts.users,
    verified: counts.verified,
    unverified: counts.unverified,
    games: counts.games,
    assets: counts.assets,
    transactions: counts.transactions,
    pending: counts.pending,
    completed: counts.completed,
    lastSync: sync.rows[0] || null,
    currentVersion: versions.rows[0] || null,
  };
}
