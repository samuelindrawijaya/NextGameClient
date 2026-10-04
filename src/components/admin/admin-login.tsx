"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, LockKey, SteamLogo } from "@phosphor-icons/react";
import styles from "./admin.module.css";

export default function AdminLogin({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className={styles.login}>
      <div className={styles.loginFrame}>
        <div className={styles.loginCore}>
          <Link href="/" className={styles.brand}>
            <SteamLogo size={25} weight="light" />
            nextgame<span>.</span>
          </Link>
          <span className={styles.eyebrow}>ADMIN WORKSPACE</span>
          <h1>{configured ? "Welcome back." : "Admin belum terhubung."}</h1>
          <p>
            {configured
              ? "Masuk untuk mengelola katalog, assets, dan pengguna."
              : "Isi konfigurasi server di .env.local untuk membuka admin. Preview lokal tersedia saat development."}
          </p>
          {configured ? (
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                setBusy(true);
                setError("");
                const form = new FormData(event.currentTarget);
                try {
                  const res = await fetch("/api/admin/session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      email: form.get("email"),
                      password: form.get("password"),
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error);
                  router.refresh();
                } catch (error) {
                  setError(
                    error instanceof Error ? error.message : "Login gagal.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={200}
                />
              </label>
              {error && (
                <p role="alert" className={styles.error}>
                  {error}
                </p>
              )}
              <button className={styles.primary} disabled={busy}>
                {busy ? "Memeriksa…" : "Masuk admin"}
                <span>
                  <ArrowUpRight size={17} />
                </span>
              </button>
            </form>
          ) : (
            <div className={styles.setup}>
              <LockKey weight="light" size={20} />
              <code>
                SUPABASE_URL
                <br />
                SUPABASE_SERVICE_ROLE_KEY
                <br />
                ADMIN_LOGIN_EMAIL
                <br />
                ADMIN_LOGIN_PASSWORD
                <br />
                ADMIN_SESSION_SECRET
              </code>
            </div>
          )}
          <Link href="/" className={styles.back}>
            Kembali ke landing page <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </main>
  );
}
