import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { compare } from "bcryptjs";
import { database } from "./supabase";
import { positiveId } from "./model";

type Principal = {
  email: string;
  actorId: string | null;
  accountId: string | null;
  version: string | null;
};
async function accountBy(field: "email" | "id", value: string) {
  const params = new URLSearchParams({
    select: "id::text,email,password_hash,is_active,session_version::text",
    [field]: `eq.${value}`,
    limit: "1",
  });
  const rows = await (await database(`admin_accounts?${params}`)).json();
  return rows[0] as
    | {
        id: string;
        email: string;
        password_hash: string;
        is_active: boolean;
        session_version: string;
      }
    | undefined;
}

export const cookieName = "nextgame_admin";
const lifetime = 60 * 60 * 4;
export function adminConfigured() {
  return Boolean(
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.ADMIN_LOGIN_EMAIL &&
    (process.env.ADMIN_LOGIN_PASSWORD?.length || 0) >= 12 &&
    (process.env.ADMIN_SESSION_SECRET?.length || 0) >= 32,
  );
}
export const previewAllowed = () =>
  process.env.NODE_ENV !== "production" ||
  process.env.ADMIN_ALLOW_PREVIEW === "true";
function sign(value: string) {
  return createHmac(
    "sha256",
    `${process.env.ADMIN_SESSION_SECRET}:${process.env.ADMIN_LOGIN_PASSWORD}`,
  )
    .update(value)
    .digest("base64url");
}
function equal(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export async function checkCredentials(
  email: string,
  password: string,
): Promise<Principal | null> {
  if (!adminConfigured() || email.length > 254) return null;
  if (
    equal(
      email.trim().toLowerCase(),
      process.env.ADMIN_LOGIN_EMAIL!.toLowerCase(),
    )
  )
    return equal(password, process.env.ADMIN_LOGIN_PASSWORD!)
      ? {
          email: process.env.ADMIN_LOGIN_EMAIL!,
          actorId: process.env.ADMIN_ACTOR_USER_ID || null,
          accountId: null,
          version: null,
        }
      : null;
  if (new TextEncoder().encode(password).length > 72) return null;
  const account = await accountBy("email", email.trim().toLowerCase());
  if (!account?.is_active || !(await compare(password, account.password_hash)))
    return null;
  return {
    email: account.email,
    actorId: null,
    accountId: account.id,
    version: account.session_version,
  };
}
export function createSession(principal: Principal) {
  const payload = Buffer.from(
    JSON.stringify({
      email: principal.email,
      accountId: principal.accountId,
      version: principal.version,
      exp: Math.floor(Date.now() / 1000) + lifetime,
    }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}
export async function adminSession() {
  if (!adminConfigured()) return null;
  const value = (await cookies()).get(cookieName)?.value;
  if (!value) return null;
  const [payload, signature, ...extra] = value.split(".");
  if (extra.length || !signature || !equal(sign(payload), signature))
    return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!Number.isInteger(data.exp) || data.exp <= Date.now() / 1000)
      return null;
    if (data.accountId) {
      const account = await accountBy("id", positiveId(data.accountId));
      return account?.is_active &&
        account.email === data.email &&
        account.session_version === data.version
        ? { email: account.email, actorId: null, accountId: account.id }
        : null;
    }
    return data.email === process.env.ADMIN_LOGIN_EMAIL
      ? {
          email: String(data.email),
          actorId: process.env.ADMIN_ACTOR_USER_ID || null,
          accountId: null,
        }
      : null;
  } catch {
    return null;
  }
}
export function assertOrigin(request: Request) {
  // Next may construct request.url from the bind address (0.0.0.0).
  const expected =
    process.env.ADMIN_APP_ORIGIN ||
    `${new URL(request.url).protocol}//${request.headers.get("host") || new URL(request.url).host}`;
  if (request.headers.get("origin") !== expected)
    throw new Error("Origin tidak diizinkan.");
}
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: lifetime,
};
const attempts = new Map<string, { count: number; until: number }>();
export function rateLimited(key: string) {
  const now = Date.now();
  const item = attempts.get(key);
  if (!item || item.until < now) {
    attempts.set(key, { count: 1, until: now + 15 * 60_000 });
    return false;
  }
  item.count++;
  return item.count > 10;
}
