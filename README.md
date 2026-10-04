# NextGame — 70.000+ Game. Satu Library. Terus Bertambah.

Landing page Next.js App Router dan TypeScript untuk desktop game library dan game access application. Konten mengikuti LANDING_PAGE_PRODUCT_BRIEF_FAQ.md. Desain mengikuti F:\SKILL.md dengan palet Void Black, Ground Iron, Carbon Veil, Lime Pulse, dan Phosphor White, serta Space Grotesk, Plus Jakarta Sans, ikon Phosphor Light/Thin, dan animasi Framer Motion.

## Jalankan di PowerShell

```powershell
Set-Location 'G:\ReverseEngineering\NextGameClient'
npm install
npm run dev
```

Buka http://localhost:3000. Untuk production, jalankan `npm run build` lalu `npm start`.

## Isi dan interaksi

- Hero dengan preview desktop interaktif dan pergantian artwork.
- Alur Cari → Aktifkan → Tambahkan ke Library → Mainkan, status personal library, dan pembaruan katalog berkala.
- Request Game dengan alur review dan Support Center dengan kategori masalah serta status tiket. CTA menjelaskan penggunaan fitur melalui desktop app; landing tidak mengirim request atau tiket.
- Delapan game pilihan: pencarian judul, publisher, tanggal, genre, AppID; filter genre; pengurutan; detail dan tautan resmi Steam.
- Favorit disimpan pada browser melalui localStorage.
- Steam Access memakai skema sekali bayar/lifetime; harga dan link pembelian belum tersedia. Premium Access Coming Soon; pendaftaran notifikasi belum tersedia.
- Steam Available; EA, Ubisoft, dan dukungan terkait Denuvo Coming Soon.
- Menu mobile, dialog native, 18 FAQ produk, dan dukungan reduced motion.
- Footer Product, Support, Legal, dan Platforms. Terms/refund masih menampilkan keterangan belum tersedia; Privacy Policy menjelaskan perilaku landing.

Status kepemilikan dan instalasi pada preview merupakan ilustrasi. Integrasi akun Steam, instalasi, update, dan menjalankan game membutuhkan aplikasi desktop dan belum diimplementasikan pada landing ini. Link download dan harga layanan belum tersedia.

## Statistik katalog opsional

Klaim 70.000+ supported games mengikuti copy produk yang diberikan pengguna, dan tidak dihitung dari data lokal. Tanpa konfigurasi database, preview menampilkan delapan game kurasi. Salin `.env.example` ke `.env.local` dan isi `SUPABASE_URL` serta `SUPABASE_ANON_KEY` jika ingin menampilkan jumlah baris `public.game_lists` yang boleh dibaca oleh role anon. Jangan gunakan service-role key. Query hanya menghitung baris; kartu game tetap berasal dari katalog kurasi lokal. Jika akses gagal, halaman menggunakan jumlah preview.

## Artwork dan metadata

Artwork resmi Steam tersimpan di `public/steam/`; metadata di `src/data/games.json`. Provenance dan waktu pengambilan tercatat di `public/steam/sources.json`. Genre untuk penjelajahan adalah label kurasi. Untuk menyegarkan aset dan metadata dengan Python 3 dan internet:

```powershell
npm run assets:sync
```

## File utama

- `src/components/library-landing.tsx`: konten, interaksi, dan Framer Motion.
- `src/components/catalog-discovery.tsx` dan `.module.css`: panel katalog, sorotan game, pencarian/filter, dan kartu artwork landscape.
- `src/data/product-copy.ts`: FAQ dan informasi Request Game, Support Center, serta tautan resource.
- `src/app/library.css`: layout, token visual, dan responsive.
- `src/app/api/steam/price/route.ts`: endpoint harga Steam untuk AppID katalog, tidak ditampilkan pada landing produk terbaru.
- `src/lib/catalog-stats.ts`: jumlah katalog opsional dari Supabase.
- `src/app/layout.tsx`: font lokal dan metadata situs.

## Verifikasi

```powershell
npm run lint
npm run typecheck
npm run build
npx playwright install chromium
npx playwright test
```

Tes browser memeriksa pencarian/filter, detail, persistensi favorit, status download/platform, menu mobile, FAQ, lebar viewport, dan artwork. Screenshot tersimpan di `.artifacts/` (diabaikan Git).

## Admin workspace

Buka http://localhost:3000/admin. Saat development tanpa konfigurasi admin, panel memakai preview lokal: delapan game kurasi dan tabel lain kosong. CRUD, import, audit preview, dan pencarian dapat dicoba; perubahan tersimpan di localStorage browser. Tombol Reset preview mengembalikan data awal. Preview tidak terhubung dengan Supabase dan tidak menyimpan password atau payload terenkripsi.

Menu mengikuti `ADMIN_PANEL_MENU_SPEC.md`: Dashboard, Game List, Import Games, Sync Status, Game Assets, Import Assets, User List, Add User, User Libraries, Transactions, App Versions, dan Audit Logs. Layout memakai panel bersarang, floating sidebar, palette hitam–lime, Phosphor Light, Framer Motion, menu mobile, dan reduced motion.

### Mengaktifkan database asli

1. Salin `.env.example` ke `.env.local` dan isi konfigurasi server. `SUPABASE_SERVICE_ROLE_KEY` hanya digunakan oleh API server. Jangan menambahkan prefix `NEXT_PUBLIC_`.
2. Isi `ADMIN_LOGIN_EMAIL`, `ADMIN_LOGIN_PASSWORD` (minimal 12 karakter), dan `ADMIN_SESSION_SECRET` (acak, minimal 32 karakter). Untuk membuat secret melalui PowerShell:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

3. Pilih `ADMIN_ASSET_ID_KIND=app_id` jika `game_assets.game_id` berisi Steam AppID, atau `id` jika berisi identity `game_lists.id`. Schema saat ini tidak memiliki FK pada `game_assets`, sehingga mapping ini harus mengikuti data yang sudah digunakan aplikasi. Preview memakai AppID.
4. Opsional: `ADMIN_ACTOR_USER_ID` harus merupakan ID `public.user` yang valid untuk `import_jobs.created_by`. Jika kosong, audit mencatat operator email dengan actor ID null.
5. Jika memakai HTTPS di balik reverse proxy, set `ADMIN_APP_ORIGIN=https://domain-admin-anda` (tanpa trailing slash) untuk pemeriksaan origin.
6. Jalankan SQL di `supabase/migrations/202610040001_admin_panel.sql` melalui Supabase SQL Editor. Migration ini menambahkan empat fungsi RPC pada schema yang diberikan, tanpa membuat ulang tabel maupun identity ID. Fungsi hanya dapat dipanggil oleh `service_role`. Migration belum diterapkan ke Supabase asli.
7. Restart `npm run dev`, kemudian login di `/admin`. Production yang belum dikonfigurasi menampilkan halaman setup; preview production hanya diaktifkan jika `ADMIN_ALLOW_PREVIEW=true`.

Login operator menggunakan kredensial server terpisah. Role admin belum diikat ke `public.user`, karena mapping role code dan mekanisme login aplikasi existing belum ditentukan. Session memakai cookie httpOnly, SameSite Strict, Secure pada production, bertanda tangan HMAC, dan kedaluwarsa 4 jam. Login memiliki batas 10 percobaan per proses dalam 15 menit; deployment dengan beberapa instance memerlukan rate limiter bersama.

### Perilaku data

- Identity `id` dibentuk database; form/import tidak mengisi identity secara manual. Bigint ID dikirim sebagai string agar tidak kehilangan presisi JavaScript.
- Games: CRUD, search, pagination, dan CSV. Default INSERT ONLY melewati `app_id` yang sudah ada; UPSERT memperbarui kolom yang disertakan. Relasi library/transaksi dapat menolak delete game.
- Assets: daftar availability Lua/metadata, CRUD bytea hex, dan CSV INSERT/UPSERT/DELETE eksplisit. Payload harus sudah terenkripsi; panel tidak melakukan enkripsi/dekripsi. Saat edit manual, bytea kosong mempertahankan payload; centang hapus payload untuk mengosongkannya. Pada CSV UPSERT, kolom bytea kosong menjadi null. Penghapusan record membutuhkan action DELETE dan konfirmasi.
- Users: add/edit, verify/unverify, role code/name, reset machine melalui form konfirmasi save, dan reset password. Password diproses server dengan bcrypt cost 12 dan tidak dikembalikan dalam API/audit. Verifikasi kompatibilitas bcrypt dengan login aplikasi existing sebelum membuat akun production. Delete/disable user belum tersedia karena schema tidak mempunyai status disabled dan policy delete belum ditentukan.
- Libraries: read-only dengan email pengguna dan nama game; search live memakai User ID/App ID. Transactions: read detail dan Mark Processed, mempertahankan kolom existing `is_procces`; delete tidak tersedia.
- App Versions: CRUD nomor versi; dashboard memakai record dengan ID terbaru. Sync Status membaca `game_sync_runs`; menjalankan workflow GitHub Actions tetap dilakukan oleh workflow existing.
- Audit CRUD disimpan dalam transaksi yang sama dengan perubahan. Import memakai transaksi per baris: baris valid dapat tersimpan sementara baris gagal dicatat di `import_jobs.errors`; jumlah inserted/updated/skipped/deleted ditampilkan.
- `Supabase Snippet Untitled query.csv` berisi 100 game_id saja. ID tersebut tersedia sebagai referensi pada dashboard/assets; daftar ini tidak cukup untuk import metadata game atau payload assets.

Template CSV dapat diunduh dari masing-masing halaman import. Maksimal 500 baris/5 MB per file. Array Games menerima JSON, PostgreSQL text array, atau pemisah `|`. Import Assets mendukung alias `metadata` dan `encryption`, termasuk versi `v1`.

### Verifikasi admin

```powershell
node scripts/test-admin-database.mjs
npx playwright test
npm run build
npx playwright test --config playwright.admin-auth.config.ts
```

Tes database menjalankan migration pada PostgreSQL lokal (PGlite) dengan fixture schema yang sama: bigint, CRUD/audit atomicity, relasi, import modes, explicit delete, redaction, dan izin RPC. Tes browser memeriksa preview CRUD/import, user support, versi, mobile, dan batas akses API. Tes login production menggunakan server Supabase HTTP fixture lokal; memeriksa cookie, login/logout, origin, session tampering, dan hashing password di server. Hasil ini bukan verifikasi koneksi ke Supabase production.
