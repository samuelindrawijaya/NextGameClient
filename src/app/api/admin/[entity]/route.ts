import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { adminSession, assertOrigin } from "@/lib/admin/auth";
import { entities, isEntity, positiveId, validate } from "@/lib/admin/model";
import { AdminError, dashboard, readRows, rpc } from "@/lib/admin/supabase";
import { previewCsv } from "@/lib/admin/csv";

type Context = { params: Promise<{ entity: string }> };
const failure = (error: unknown) =>
  NextResponse.json(
    { error: error instanceof Error ? error.message : "Operasi gagal." },
    { status: error instanceof AdminError ? error.status : 400 },
  );
export async function GET(request: Request, ctx: Context) {
  if (!(await adminSession()))
    return NextResponse.json(
      { error: "Login admin diperlukan." },
      { status: 401 },
    );
  try {
    const { entity } = await ctx.params;
    if (entity === "dashboard") return NextResponse.json(await dashboard());
    if (!isEntity(entity)) throw new AdminError("Module tidak ditemukan.", 404);
    const url = new URL(request.url);
    const page = Math.max(
      1,
      Math.min(100000, Number(url.searchParams.get("page")) || 1),
    );
    return NextResponse.json(
      await readRows(
        entity,
        Math.floor(page),
        url.searchParams.get("q") || "",
        url.searchParams.get("id") || undefined,
        {
          userId: url.searchParams.get("user_id") || undefined,
          gameId: url.searchParams.get("game_id") || undefined,
          lookup: url.searchParams.get("lookup") === "true",
          assetsOnly: url.searchParams.get("assets_only") === "true",
          beforeId: url.searchParams.get("before_id") || undefined,
        },
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
async function mutate(
  request: Request,
  ctx: Context,
  action: "INSERT" | "UPDATE" | "DELETE",
) {
  const session = await adminSession();
  if (!session)
    return NextResponse.json(
      { error: "Login admin diperlukan." },
      { status: 401 },
    );
  try {
    assertOrigin(request);
    const { entity } = await ctx.params;
    const content = await request.text();
    if (content.length > 6_000_000)
      throw new AdminError("Permintaan terlalu besar.", 413);
    const body = JSON.parse(content);
    if (entity === "import" && action === "INSERT") {
      if (
        !["games", "assets"].includes(body.entity) ||
        typeof body.csv !== "string"
      )
        throw new AdminError("Import tidak valid.");
      if (
        body.entity === "games" &&
        !["INSERT_ONLY", "UPSERT"].includes(body.mode)
      )
        throw new AdminError("Mode import tidak valid.");
      const preview = previewCsv(body.csv, body.entity);
      if (preview.errors.length)
        throw new AdminError(
          `CSV tidak valid: baris ${preview.errors[0].row} — ${preview.errors[0].message}`,
        );
      if (
        preview.rows.some((row) => row.action === "DELETE") &&
        body.confirmDeletes !== true
      )
        throw new AdminError("Konfirmasi DELETE asset diperlukan.");
      const result = await rpc("admin_import_batch", {
        p_entity: body.entity,
        p_mode: body.entity === "assets" ? "MIXED" : body.mode,
        p_rows: preview.rows,
        p_actor_id: session.actorId,
        p_operator: session.email,
        p_filename: String(body.filename || "import.csv").slice(0, 255),
      });
      return NextResponse.json(result);
    }
    if (!isEntity(entity)) throw new AdminError("Module tidak ditemukan.", 404);
    const spec = entities[entity];
    let data;
    if (
      (action === "INSERT" && !spec.create) ||
      (action === "DELETE" && !spec.remove) ||
      (action === "UPDATE" && !spec.edit)
    )
      throw new AdminError("Action tidak tersedia untuk module ini.", 403);
    if (action === "DELETE" && body.confirm !== true)
      throw new AdminError("Konfirmasi penghapusan diperlukan.");
    if (action === "DELETE") data = {};
    else data = validate(entity, body.data || {}, action === "INSERT");
    if (entity === "libraries" && "app_id_buy" in data) {
      const available = await readRows(
        "games",
        1,
        String(data.app_id_buy),
        undefined,
        { assetsOnly: true, lookup: true },
      );
      if (!available.rows.length)
        throw new AdminError(
          "Game belum memiliki asset berisi data. Tambahkan asset sebelum memberikan game ke library.",
          409,
        );
    }
    if ("password" in data) {
      data.password_hash = await hash(String(data.password), 12);
      delete data.password;
    }
    if (entity === "admins") {
      if (data.email === process.env.ADMIN_LOGIN_EMAIL?.toLowerCase())
        throw new AdminError("Email ini dipakai akun utama dari environment.");
      if (session.accountId === String(body.id) && data.is_active === false)
        throw new AdminError(
          "Tidak dapat menonaktifkan akun yang sedang digunakan.",
        );
      const record = await rpc("admin_manage_account", {
        p_action: action,
        p_id: action === "INSERT" ? null : positiveId(body.id),
        p_data: data,
        p_actor_id: session.actorId,
        p_operator: session.email,
        p_self_id: session.accountId,
        p_bootstrap_email: process.env.ADMIN_LOGIN_EMAIL,
      });
      return NextResponse.json({ ok: true, record });
    }
    if (entity === "transactions" && action === "INSERT") {
      // Direct REST insert (bypass admin_apply_change since columns may not exist yet)
      const base = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!base || !key) throw new AdminError("Supabase admin belum dikonfigurasi.", 503);
      const response = await fetch(new URL("/rest/v1/history_purchase", base), {
        method: "POST",
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          user_id: data.user_id,
          game_id: data.game_id,
          invoice_number: data.invoice_number,
          platform: data.platform || "manual",
          is_procces: data.is_procces ?? false,
          is_invoice_used: data.is_invoice_used ?? false,
        }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const code = String(error.code || "");
        if (code === "PGRST104" || code === "42703")
          throw new AdminError("Kolom transaksi belum ada di database. Jalankan migration 202610080003 terlebih dahulu.", 502);
        throw new AdminError("Gagal menyimpan transaksi: " + (error.message || error.details || response.statusText));
      }
      const [record] = await response.json();
      // Log audit
      try {
        await fetch(new URL("/rest/v1/audit_logs", base), {
          method: "POST",
          cache: "no-store",
          signal: AbortSignal.timeout(10_000),
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            actor_user_id: session.actorId,
            action: "INSERT",
            entity: "transactions",
            entity_id: String(record.id),
            new_data: { record, operator: session.email },
          }),
        });
      } catch {}
      return NextResponse.json({ ok: true, record });
    }
    const result = await rpc("admin_apply_change", {
      p_entity: entity,
      p_action: action,
      p_id: action === "INSERT" ? null : positiveId(body.id),
      p_data: data,
      p_actor_id: session.actorId,
      p_operator: session.email,
    });
    return NextResponse.json({ ok: true, record: result });
  } catch (error) {
    return failure(error);
  }
}
export const POST = (request: Request, ctx: Context) =>
  mutate(request, ctx, "INSERT");
export const PATCH = (request: Request, ctx: Context) =>
  mutate(request, ctx, "UPDATE");
export const DELETE = (request: Request, ctx: Context) =>
  mutate(request, ctx, "DELETE");
