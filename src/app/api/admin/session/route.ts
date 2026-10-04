import { NextResponse } from "next/server";
import {
  adminConfigured,
  assertOrigin,
  checkCredentials,
  cookieName,
  cookieOptions,
  createSession,
  rateLimited,
} from "@/lib/admin/auth";

export async function POST(request: Request) {
  try {
    assertOrigin(request);
    if (!adminConfigured())
      return NextResponse.json(
        { error: "Konfigurasi admin belum lengkap." },
        { status: 503 },
      );
    if (rateLimited("operator-login"))
      return NextResponse.json(
        { error: "Terlalu banyak percobaan. Coba lagi setelah 15 menit." },
        { status: 429 },
      );
    const body = await request.json();
    if (
      typeof body.email !== "string" ||
      typeof body.password !== "string" ||
      !checkCredentials(body.email, body.password)
    )
      return NextResponse.json(
        { error: "Email atau password tidak sesuai." },
        { status: 401 },
      );
    const response = NextResponse.json({ ok: true });
    response.cookies.set(cookieName, createSession(), cookieOptions);
    return response;
  } catch {
    return NextResponse.json(
      { error: "Permintaan login tidak valid." },
      { status: 400 },
    );
  }
}
export async function DELETE(request: Request) {
  try {
    assertOrigin(request);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(cookieName, "", { ...cookieOptions, maxAge: 0 });
    return response;
  } catch {
    return NextResponse.json(
      { error: "Origin tidak diizinkan." },
      { status: 403 },
    );
  }
}
