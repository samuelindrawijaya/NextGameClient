import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

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
export function checkCredentials(email: string, password: string) {
  return (
    adminConfigured() &&
    equal(email.toLowerCase(), process.env.ADMIN_LOGIN_EMAIL!.toLowerCase()) &&
    equal(password, process.env.ADMIN_LOGIN_PASSWORD!)
  );
}
export function createSession() {
  const payload = Buffer.from(
    JSON.stringify({
      email: process.env.ADMIN_LOGIN_EMAIL,
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
    return data.email === process.env.ADMIN_LOGIN_EMAIL &&
      Number.isInteger(data.exp) &&
      data.exp > Date.now() / 1000
      ? {
          email: String(data.email),
          actorId: process.env.ADMIN_ACTOR_USER_ID || null,
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
