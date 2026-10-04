"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowClockwise,
  CaretLeft,
  CaretRight,
  ChartPieSlice,
  Check,
  Database,
  DownloadSimple,
  Eye,
  FileCsv,
  GameController,
  GearSix,
  List,
  Plus,
  ShieldCheck,
  SignOut,
  Stack,
  SteamLogo,
  Trash,
  Users,
  X,
  PencilSimple,
  MagnifyingGlass,
  Clock,
  Receipt,
} from "@phosphor-icons/react";
import {
  entities,
  isEntity,
  menu,
  type Entity,
  type Json,
  type Row,
  type Section,
} from "@/lib/admin/model";
import {
  previewChange,
  previewImport,
  seedPreview,
  type PreviewStore,
} from "@/lib/admin/preview";
import { previewCsv } from "@/lib/admin/csv";
import { useMotionPreference } from "@/lib/use-motion-preference";
import reference from "@/data/admin-reference.json";
import RecordEditor from "./record-editor";
import LibraryEditor from "./library-editor";
import ImportWorkspace from "./import-workspace";
import styles from "./admin.module.css";

const icons = {
  dashboard: ChartPieSlice,
  games: GameController,
  "import-games": FileCsv,
  sync: ArrowClockwise,
  assets: Stack,
  "import-assets": DownloadSimple,
  users: Users,
  libraries: Database,
  transactions: Receipt,
  versions: GearSix,
  audit: ShieldCheck,
  admins: ShieldCheck,
};
const descriptions: Record<Section, string> = {
  admins: "Tambahkan admin dan kelola akses ke seluruh workspace.",
  dashboard: "Satu workspace untuk seluruh library.",
  games: "Kelola metadata game dan Steam App ID.",
  "import-games": "Tambahkan katalog melalui CSV yang sudah divalidasi.",
  sync: "Pantau hasil sinkronisasi katalog Steam.",
  assets: "Kelola payload terenkripsi untuk setiap game.",
  "import-assets": "Import payload dengan action eksplisit di setiap baris.",
  users: "Kelola akun, akses, dan machine binding.",
  libraries: "Tambahkan game pembelian atau game special ke library pengguna.",
  transactions: "Tinjau invoice dan proses transaksi yang tertunda.",
  versions: "Kelola versi aplikasi yang diterbitkan.",
  audit: "Jejak perubahan untuk membantu penelusuran.",
};
type Modal = {
  kind: "edit" | "view" | "delete";
  entity: Entity;
  record: Row | null;
};
const key = "nextgame-admin-preview-v1";
const display = (value: Json | undefined): string =>
  value === null || value === undefined || value === ""
    ? "—"
    : Array.isArray(value)
      ? value.map((v) => String(v)).join(", ")
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
function timestamp(value: Json | undefined) {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.valueOf())
    ? display(value)
    : new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}
function formatCell(field: string, value: Json | undefined) {
  if (field.endsWith("_at")) return timestamp(value);
  if (field === "is_processed") return value ? "Processed" : "Pending";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return display(value);
}
function Frame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${styles.frame} ${className}`}>
      <div className={styles.core}>{children}</div>
    </div>
  );
}
function Dialog({
  children,
  onClose,
  label,
}: {
  children: ReactNode;
  onClose: () => void;
  label: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.dialogCore}>
        <div className={styles.dialogTitle}>
          <span className={styles.eyebrow}>WORKSPACE / {label}</span>
          <button
            aria-label="Tutup dialog"
            className={styles.iconButton}
            onClick={onClose}
          >
            <X size={20} weight="light" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

export default function AdminConsole({
  section,
  mode,
  operator,
}: {
  section: Section;
  mode: "preview" | "live";
  operator: string;
}) {
  const router = useRouter();
  const reduce = useMotionPreference();
  const [store, setStore] = useState<PreviewStore>(seedPreview);
  const [ready, setReady] = useState(false);
  const [liveRows, setLiveRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Row>({});
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(mode === "live");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState<Modal | null>(null);
  const [mobile, setMobile] = useState(false);
  const [showIds, setShowIds] = useState(false);
  const importEntity =
    section === "import-games"
      ? "games"
      : section === "import-assets"
        ? "assets"
        : null;
  const entity: Entity | null = isEntity(section)
    ? section
    : importEntity
      ? "jobs"
      : null;
  const title =
    menu
      .map((group) => group.items.find((item) => item[0] === section)?.[1])
      .find(Boolean) || "Dashboard";
  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const saved = localStorage.getItem(key);
        if (saved) {
          const data = JSON.parse(saved);
          if (
            Object.keys(seedPreview()).every(
              (k) => k === "admins" || Array.isArray(data[k]),
            )
          )
            setStore({
              ...data,
              admins: Array.isArray(data.admins) ? data.admins : [],
            });
        }
      } catch {
        localStorage.removeItem(key);
      }
      setReady(true);
    });
  }, []);
  useEffect(() => {
    if (ready && mode === "preview")
      localStorage.setItem(key, JSON.stringify(store));
  }, [store, ready, mode]);
  useEffect(() => {
    if (mode !== "live") return;
    const controller = new AbortController();
    const timer = setTimeout(
      async () => {
        setLoading(true);
        setError("");
        try {
          const response = await fetch(
            `/api/admin/${entity || "dashboard"}?page=${page}&q=${encodeURIComponent(query)}`,
            { signal: controller.signal },
          );
          const data = await response.json();
          if (response.status === 401) router.refresh();
          if (!response.ok) throw new Error(data.error);
          if (entity) {
            setLiveRows(data.rows);
            setTotal(data.total);
          } else setSummary(data);
        } catch (error) {
          if (!controller.signal.aborted)
            setError(
              error instanceof Error ? error.message : "Data gagal dimuat.",
            );
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      },
      query ? 250 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [mode, entity, page, query, revision, router]);
  async function change(
    target: Entity,
    action: "INSERT" | "UPDATE" | "DELETE",
    record: Row | null,
    data: Row,
  ) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const id = record ? String(record[entities[target].pk]) : null;
      if (mode === "preview")
        setStore(previewChange(store, target, action, id, data));
      else {
        const response = await fetch(`/api/admin/${target}`, {
          method:
            action === "INSERT"
              ? "POST"
              : action === "UPDATE"
                ? "PATCH"
                : "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, data, confirm: action === "DELETE" }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setRevision((value) => value + 1);
      }
      setNotice(
        mode === "preview"
          ? "Perubahan tersimpan di preview lokal."
          : "Perubahan dan audit tersimpan.",
      );
      setModal(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Perubahan gagal.";
      setError(message);
      throw error;
    } finally {
      setBusy(false);
    }
  }
  async function runImport(
    csv: string,
    importMode: string,
    filename: string,
    confirm: boolean,
  ): Promise<Row> {
    setBusy(true);
    try {
      if (!importEntity) throw new Error("Module import tidak valid.");
      if (mode === "preview") {
        const preview = previewCsv(csv, importEntity);
        if (preview.errors.length)
          throw new Error("Perbaiki error CSV sebelum import.");
        if (preview.rows.some((row) => row.action === "DELETE") && !confirm)
          throw new Error("Konfirmasi DELETE diperlukan.");
        const result = previewImport(
          store,
          importEntity,
          preview.rows,
          importMode,
          filename,
        );
        setStore(result.store);
        return result.result;
      }
      const response = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: importEntity,
          csv,
          mode: importMode,
          filename,
          confirmDeletes: confirm,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRevision((value) => value + 1);
      return data;
    } finally {
      setBusy(false);
    }
  }
  const data =
    mode === "preview"
      ? {
          games: store.games.length,
          users: store.users.length,
          verified: store.users.filter((row) => row.is_verified).length,
          unverified: store.users.filter((row) => !row.is_verified).length,
          assets: store.assets.length,
          transactions: store.transactions.length,
          pending: store.transactions.filter((row) => !row.is_processed).length,
          completed: store.transactions.filter((row) => row.is_processed)
            .length,
          lastSync: store.sync[0] || null,
          currentVersion: store.versions[0] || null,
        }
      : summary;
  const source = entity
    ? mode === "preview"
      ? store[entity].map((row) =>
          entity === "assets"
            ? {
                ...row,
                app_id:
                  store.games.find((game) => game.app_id === row.game_id)
                    ?.app_id || null,
                game_name:
                  store.games.find((game) => game.app_id === row.game_id)
                    ?.name || null,
              }
            : entity === "libraries" || entity === "transactions"
              ? {
                  ...row,
                  user_email:
                    store.users.find((user) => user.user_id === row.user_id)
                      ?.email || null,
                  catalog_id:
                    store.games.find((game) => game.app_id === row.app_id_buy)
                      ?.id || null,
                  invoice_number:
                    store.transactions.find(
                      (purchase) => purchase.id === row.purchase_id,
                    )?.invoice_number || null,
                  game_name:
                    store.games.find(
                      (game) =>
                        game[entity === "libraries" ? "app_id" : "id"] ===
                        row[entity === "libraries" ? "app_id_buy" : "game_id"],
                    )?.name || null,
                }
              : row,
        )
      : liveRows
    : [];
  const filtered =
    mode === "preview"
      ? source.filter((row) =>
          Object.values(row).some((value) =>
            display(value).toLowerCase().includes(query.toLowerCase()),
          ),
        )
      : source;
  const count = mode === "preview" ? filtered.length : total;
  const rows =
    mode === "preview" ? filtered.slice((page - 1) * 20, page * 20) : filtered;
  const lastSync = data.lastSync as Row | null;
  const currentVersion = data.currentVersion as Row | null;
  const navigation = (
    <>
      <Link href="/" className={styles.brand}>
        <SteamLogo size={29} weight="light" />
        nextgame<span>.</span>
      </Link>
      <div className={styles.workspaceLabel}>
        <span className={styles.statusDot} />
        ADMIN WORKSPACE <b>01</b>
      </div>
      <nav aria-label="Admin navigation">
        {menu.map((group) => (
          <div className={styles.navGroup} key={group.group}>
            <span>{group.group}</span>
            {group.items.map(([name, label]) => {
              const Icon = icons[name];
              return (
                <Link
                  key={name}
                  href={name === "dashboard" ? "/admin" : `/admin/${name}`}
                  aria-current={section === name ? "page" : undefined}
                  className={section === name ? styles.active : undefined}
                  onClick={() => setMobile(false)}
                >
                  <Icon size={19} weight="light" />
                  {label}
                  {section === name && (
                    <ArrowUpRight size={13} weight="light" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className={styles.sidebarFoot}>
        <span className={styles.avatar}>NG</span>
        <div>
          <strong>Catalog operations</strong>
          <small>Steam workspace</small>
        </div>
      </div>
    </>
  );
  return (
    <div className={styles.app}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarCore}>{navigation}</div>
      </aside>
      {mobile && (
        <Dialog label="Navigation" onClose={() => setMobile(false)}>
          <div className={styles.mobileNav}>{navigation}</div>
        </Dialog>
      )}
      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <button
              className={`${styles.iconButton} ${styles.mobileToggle}`}
              aria-label="Buka menu admin"
              onClick={() => setMobile(true)}
            >
              <List size={22} weight="light" />
            </button>
            <span>Workspace</span>
            <CaretRight size={12} />
            <strong>{title}</strong>
          </div>
          <div>
            <span className={styles.mode}>
              <i />
              {mode === "preview" ? "LOCAL PREVIEW" : "ADMIN SESSION"}
            </span>
            <span className={styles.operator} title={operator}>
              {operator}
            </span>
            {mode === "live" && (
              <button
                className={styles.iconButton}
                aria-label="Logout admin"
                onClick={async () => {
                  await fetch("/api/admin/session", { method: "DELETE" });
                  router.refresh();
                }}
              >
                <SignOut size={18} weight="light" />
              </button>
            )}
          </div>
        </header>
        {mode === "preview" && (
          <div className={styles.previewBar}>
            <span>
              <span className={styles.statusDot} />
              Preview lokal. Perubahan disimpan di browser ini dan tidak menulis
              Supabase.
            </span>
            <button
              onClick={() => {
                setStore(seedPreview());
                setNotice("Preview dikembalikan ke data awal.");
              }}
            >
              Reset preview <ArrowClockwise size={13} />
            </button>
          </div>
        )}
        <motion.div
          key={section}
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className={styles.pageHeading}>
            <div>
              <span className={styles.eyebrow}>NEXTGAME / OPERATIONS</span>
              <h1>
                {section === "dashboard" ? (
                  <>
                    Your library.
                    <br />
                    <em>Under control.</em>
                  </>
                ) : (
                  title
                )}
              </h1>
              <p>{descriptions[section]}</p>
            </div>
            <div className={styles.headerActions}>
              <button
                className={styles.secondary}
                onClick={() => setRevision((value) => value + 1)}
                aria-label="Refresh data"
              >
                <ArrowClockwise size={16} weight="light" />
                Refresh
              </button>
              {entity && entities[entity].create && (
                <button
                  className={styles.primary}
                  onClick={() =>
                    setModal({ kind: "edit", entity, record: null })
                  }
                >
                  <Plus size={17} weight="light" />
                  Add{" "}
                  {entity === "games"
                    ? "Game"
                    : entity === "assets"
                      ? "Asset"
                      : entity === "libraries"
                        ? "Library"
                        : entity === "admins"
                          ? "Admin"
                          : "Version"}
                  <span>
                    <ArrowUpRight size={16} weight="light" />
                  </span>
                </button>
              )}
            </div>
          </div>
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className={styles.notice}>
              <Check size={17} />
              {notice}
            </p>
          )}
          {section === "dashboard" ? (
            <>
              <div className={styles.metrics}>
                {[
                  {
                    label: "Games in catalog",
                    value: data.games,
                    detail: "Steam App IDs",
                    icon: GameController,
                  },
                  {
                    label: "Registered users",
                    value: data.users,
                    detail: `${data.verified ?? "—"} verified · ${data.unverified ?? "—"} unverified`,
                    icon: Users,
                  },
                  {
                    label: "Game assets",
                    value: data.assets,
                    detail: "Encrypted payloads",
                    icon: Stack,
                  },
                  {
                    label: "Transactions",
                    value: data.transactions,
                    detail: `${data.pending ?? "—"} pending · ${data.completed ?? "—"} completed`,
                    icon: Receipt,
                  },
                ].map((metric) => (
                  <Frame key={metric.label}>
                    <div className={styles.metricLabel}>
                      <span>{metric.label}</span>
                      <metric.icon size={24} weight="light" />
                    </div>
                    <strong className={styles.metricValue}>
                      {loading ? "…" : display(metric.value)}
                    </strong>
                    <small>{metric.detail}</small>
                  </Frame>
                ))}
              </div>
              <div className={styles.dashboardGrid}>
                <Frame className={styles.catalogCard}>
                  <div className={styles.cardTitle}>
                    <span className={styles.eyebrow}>CATALOG / STEAM</span>
                    <GameController size={23} weight="light" />
                  </div>
                  <h2>
                    A growing library.
                    <br />
                    One clear view.
                  </h2>
                  <p>
                    Metadata, artwork, dan assets dalam workspace yang sama.
                  </p>
                  <div className={styles.artworkStrip}>
                    {seedPreview()
                      .games.slice(0, 4)
                      .map((game) => (
                        <div
                          key={String(game.app_id)}
                          style={{ backgroundImage: `url("${game.image}")` }}
                        >
                          <span>{display(game.name)}</span>
                        </div>
                      ))}
                  </div>
                  <Link href="/admin/games" className={styles.primary}>
                    Buka game list
                    <span>
                      <ArrowUpRight size={17} weight="light" />
                    </span>
                  </Link>
                  <small className={styles.artworkLabel}>
                    Artwork pilihan Steam · ilustrasi katalog
                  </small>
                </Frame>
                <Frame>
                  <span className={styles.eyebrow}>SYNC / LAST RUN</span>
                  <div className={styles.orbit}>
                    <ArrowClockwise size={39} weight="light" />
                    <span />
                  </div>
                  <h3>
                    {lastSync ? display(lastSync.status) : "Belum ada sync"}
                  </h3>
                  <p>
                    {lastSync
                      ? timestamp(lastSync.started_at)
                      : "Riwayat akan muncul setelah workflow katalog menulis game_sync_runs."}
                  </p>
                  <div className={styles.rule}>
                    <span>New games found</span>
                    <b>{lastSync ? display(lastSync.new_games_found) : "—"}</b>
                  </div>
                  <div className={styles.rule}>
                    <span>Inserted games</span>
                    <b>{lastSync ? display(lastSync.inserted_games) : "—"}</b>
                  </div>
                  <Link className={styles.textLink} href="/admin/sync">
                    Lihat sync status <ArrowRight size={16} />
                  </Link>
                </Frame>
                <Frame>
                  <span className={styles.eyebrow}>SYSTEM / RELEASE</span>
                  <h3 className={styles.version}>
                    {currentVersion
                      ? display(currentVersion.version)
                      : "No release yet."}
                  </h3>
                  <p>
                    {currentVersion
                      ? `Dibuat ${timestamp(currentVersion.created_at)}`
                      : "Publikasikan nomor versi aplikasi dari App Versions."}
                  </p>
                  <Link href="/admin/versions" className={styles.textLink}>
                    Kelola versi <ArrowUpRight size={15} />
                  </Link>
                </Frame>
              </div>
              <div className={styles.bottomGrid}>
                <Frame>
                  <div className={styles.cardTitle}>
                    <h3>Quick actions</h3>
                    <span>Catalog maintenance</span>
                  </div>
                  <div className={styles.quickActions}>
                    {[
                      ["import-games", "Import game catalog", FileCsv],
                      ["import-assets", "Import encrypted assets", Stack],
                      ["libraries", "Kelola user libraries", Users],
                    ].map(([path, label, Icon]) => {
                      const Component = Icon as typeof Users;
                      return (
                        <Link key={String(path)} href={`/admin/${path}`}>
                          <Component size={23} weight="light" />
                          <span>{String(label)}</span>
                          <ArrowUpRight size={18} />
                        </Link>
                      );
                    })}
                  </div>
                </Frame>
                <Frame>
                  <span className={styles.eyebrow}>REFERENCE / CSV</span>
                  <h3>{reference.ids.length} game IDs</h3>
                  <p>
                    File referensi hanya berisi game_id. Lengkapi metadata atau
                    payload sebelum import.
                  </p>
                  <button
                    className={styles.textLink}
                    onClick={() => setShowIds(true)}
                  >
                    Lihat ID referensi <ArrowUpRight size={15} />
                  </button>
                </Frame>
              </div>
            </>
          ) : (
            <>
              {importEntity && (
                <ImportWorkspace
                  key={importEntity}
                  entity={importEntity}
                  busy={busy}
                  onImport={runImport}
                />
              )}
              {section === "sync" && (
                <Frame className={styles.pipeline}>
                  <div className={styles.cardTitle}>
                    <h3>Daily Steam catalog sync</h3>
                    <span>Insert only</span>
                  </div>
                  <div className={styles.pipelineSteps}>
                    {[
                      "leinstay/steamdb",
                      "steamdb.min.json.gz",
                      "GitHub Actions",
                      "kind = steam",
                      "compare app_id",
                      "insert new games",
                    ].map((step, i) => (
                      <div key={step}>
                        <span>{String(i + 1).padStart(2, "0")}</span>
                        <strong>{step}</strong>
                        {i < 5 && <ArrowRight size={15} />}
                      </div>
                    ))}
                  </div>
                  <p>
                    Panel ini membaca game_sync_runs. Workflow dijalankan oleh
                    GitHub Actions; game yang sudah ada dipertahankan.
                  </p>
                </Frame>
              )}
              {section === "assets" && (
                <div className={styles.contextNote}>
                  <ShieldCheck size={19} weight="light" />
                  <span>
                    Payload tidak ditampilkan di tabel atau audit. Mapping Game
                    ID dipilih lewat konfigurasi server; preview memakai Steam
                    App ID.
                  </span>
                  <button onClick={() => setShowIds(true)}>
                    {reference.ids.length} ID referensi{" "}
                    <ArrowUpRight size={13} />
                  </button>
                </div>
              )}
              {section === "admins" && (
                <div className={styles.contextNote}>
                  <ShieldCheck size={19} weight="light" />
                  <span>
                    Akun tambahan memiliki akses penuh ke workspace. Akun utama
                    dari environment tetap tersedia dan tidak ditampilkan dalam
                    daftar ini. Edit untuk reset password atau ubah status
                    aktif.
                  </span>
                </div>
              )}
              {entity && (
                <Frame className={styles.listFrame}>
                  <div className={styles.tableToolbar}>
                    <div>
                      <span className={styles.eyebrow}>
                        {importEntity
                          ? "IMPORT HISTORY"
                          : entities[entity].title.toUpperCase()}
                      </span>
                      <strong>
                        {loading ? "…" : count.toLocaleString("id-ID")} records
                      </strong>
                    </div>
                    <div>
                      <label className={styles.search}>
                        <MagnifyingGlass size={18} weight="light" />
                        <input
                          aria-label="Cari record"
                          placeholder={
                            entity === "libraries"
                              ? "Cari User ID atau App ID…"
                              : "Cari nama, ID, atau status…"
                          }
                          value={query}
                          onChange={(event) => {
                            setQuery(event.target.value);
                            setPage(1);
                          }}
                        />
                      </label>
                      {(entity === "games" || entity === "assets") && (
                        <Link
                          href={`/admin/import-${entity}`}
                          className={styles.secondary}
                        >
                          <FileCsv size={16} weight="light" />
                          Import CSV
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className={styles.tableScroll}>
                    <table>
                      <thead>
                        <tr>
                          <th>
                            {entities[entity].pk === "id"
                              ? "ID"
                              : entities[entity].pk === "user_id"
                                ? "User ID"
                                : "Asset"}
                          </th>
                          {entities[entity].columns.map(([field, label]) => (
                            <th key={field}>{label}</th>
                          ))}
                          <th className={styles.actionHeading}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!loading &&
                          rows.map((row) => (
                            <tr key={String(row[entities[entity].pk])}>
                              <td className={styles.idCell}>
                                #{display(row[entities[entity].pk])}
                              </td>
                              {entities[entity].columns.map(([field]) => (
                                <td key={field}>
                                  {field === "name" ? (
                                    <div className={styles.gameCell}>
                                      {row.image && (
                                        <span
                                          className={styles.gameThumb}
                                          style={{
                                            backgroundImage: `url("${String(row.image).replaceAll('"', "%22")}")`,
                                          }}
                                        />
                                      )}
                                      <strong>{display(row[field])}</strong>
                                    </div>
                                  ) : typeof row[field] === "boolean" ||
                                    field === "status" ? (
                                    <span
                                      className={`${styles.badge} ${row[field] === false || row[field] === "failed" ? styles.mutedBadge : ""}`}
                                    >
                                      {formatCell(field, row[field])}
                                    </span>
                                  ) : (
                                    <span
                                      className={styles.cellText}
                                      title={formatCell(field, row[field])}
                                    >
                                      {formatCell(field, row[field])}
                                    </span>
                                  )}
                                </td>
                              ))}
                              <td>
                                <div className={styles.rowActions}>
                                  <button
                                    aria-label={`View ${display(row[entities[entity].pk])}`}
                                    onClick={() =>
                                      setModal({
                                        kind: "view",
                                        entity,
                                        record: row,
                                      })
                                    }
                                  >
                                    <Eye size={18} weight="light" />
                                  </button>
                                  {entities[entity].edit && (
                                    <button
                                      aria-label={`Edit ${display(row[entities[entity].pk])}`}
                                      onClick={() =>
                                        setModal({
                                          kind: "edit",
                                          entity,
                                          record: row,
                                        })
                                      }
                                    >
                                      <PencilSimple size={17} weight="light" />
                                    </button>
                                  )}
                                  {entities[entity].remove && (
                                    <button
                                      aria-label={`Delete ${display(row[entities[entity].pk])}`}
                                      onClick={() =>
                                        setModal({
                                          kind: "delete",
                                          entity,
                                          record: row,
                                        })
                                      }
                                    >
                                      <Trash size={17} weight="light" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  {(loading || !rows.length) && (
                    <div className={styles.empty}>
                      <Database size={35} weight="light" />
                      <h3>
                        {loading
                          ? "Memuat data…"
                          : query
                            ? "Tidak ada hasil."
                            : "Belum ada record."}
                      </h3>
                      <p>
                        {loading
                          ? "Mengambil data dari Supabase."
                          : query
                            ? "Ubah kata pencarian untuk mencoba kembali."
                            : mode === "preview"
                              ? "Preview dimulai tanpa data pengguna, transaksi, assets, dan sync. Tambahkan data untuk mencoba alurnya."
                              : "Data akan tampil saat record tersedia di database."}
                      </p>
                    </div>
                  )}
                  <div className={styles.pagination}>
                    <span>
                      Halaman {page} / {Math.max(1, Math.ceil(count / 20))} · 20
                      per halaman
                    </span>
                    <div>
                      <button
                        aria-label="Halaman sebelumnya"
                        disabled={page === 1 || loading}
                        onClick={() => setPage((value) => value - 1)}
                      >
                        <CaretLeft size={17} />
                      </button>
                      <button
                        aria-label="Halaman berikutnya"
                        disabled={page * 20 >= count || loading}
                        onClick={() => setPage((value) => value + 1)}
                      >
                        <CaretRight size={17} />
                      </button>
                    </div>
                  </div>
                </Frame>
              )}
            </>
          )}
        </motion.div>
        <footer className={styles.footer}>
          <span>NEXTGAME / ADMIN WORKSPACE</span>
          <span>
            {mode === "preview"
              ? "Browser storage · local only"
              : "Server API · authenticated session"}
          </span>
        </footer>
      </main>
      {showIds && (
        <Dialog label="CSV reference" onClose={() => setShowIds(false)}>
          <h2>100 game IDs.</h2>
          <p className={styles.hint}>
            {reference.source} · daftar referensi, tanpa metadata atau payload.
          </p>
          <div className={styles.idGrid}>
            {reference.ids.map((id) => (
              <code key={id}>{id}</code>
            ))}
          </div>
        </Dialog>
      )}
      {modal && (
        <Dialog
          key={`${modal.kind}-${modal.entity}-${modal.record?.[entities[modal.entity].pk] || "new"}`}
          label={`${modal.kind} ${entities[modal.entity].title}`}
          onClose={() => {
            if (!busy) {
              setModal(null);
              setError("");
            }
          }}
        >
          <h2>
            {modal.kind === "delete"
              ? "Hapus record ini?"
              : modal.kind === "edit"
                ? modal.record
                  ? modal.entity === "libraries"
                    ? "Kelola akses game."
                    : "Edit record."
                  : modal.entity === "libraries"
                    ? "Tambahkan game ke library."
                    : "Tambah record."
                : "Record detail."}
          </h2>
          {mode === "preview" && (
            <p className={styles.hint}>
              Preview lokal · tidak menulis Supabase.
            </p>
          )}
          {modal.kind === "edit" ? (
            modal.entity === "libraries" ? (
              <LibraryEditor
                record={modal.record}
                mode={mode}
                store={store}
                busy={busy}
                onSave={(data) =>
                  change(
                    "libraries",
                    modal.record ? "UPDATE" : "INSERT",
                    modal.record,
                    data,
                  )
                }
              />
            ) : (
              <RecordEditor
                entity={modal.entity}
                record={modal.record}
                busy={busy}
                onSave={(data) =>
                  change(
                    modal.entity,
                    modal.record ? "UPDATE" : "INSERT",
                    modal.record,
                    data,
                  )
                }
              />
            )
          ) : modal.kind === "delete" ? (
            <>
              <p>
                Record #{display(modal.record?.[entities[modal.entity].pk])}{" "}
                akan dihapus. Relasi yang masih memakai record ini dapat menolak
                penghapusan.
              </p>
              {error && (
                <p role="alert" className={styles.error}>
                  {error}
                </p>
              )}
              <div className={styles.confirmActions}>
                <button
                  className={styles.secondary}
                  disabled={busy}
                  onClick={() => setModal(null)}
                >
                  Batal
                </button>
                <button
                  className={styles.danger}
                  disabled={busy}
                  onClick={() =>
                    void change(modal.entity, "DELETE", modal.record, {}).catch(
                      () => {},
                    )
                  }
                >
                  <Trash size={17} /> {busy ? "Menghapus…" : "Hapus record"}
                </button>
              </div>
            </>
          ) : (
            <>
              <dl className={styles.details}>
                {Object.entries(modal.record || {}).map(([field, value]) => (
                  <div key={field}>
                    <dt>{field.replaceAll("_", " ")}</dt>
                    <dd>
                      {typeof value === "object" && value !== null ? (
                        <pre>{JSON.stringify(value, null, 2)}</pre>
                      ) : (
                        formatCell(field, value)
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
              {modal.entity === "sync" && (
                <p className={styles.hint}>
                  <Clock size={15} /> Duration:{" "}
                  {modal.record?.finished_at && modal.record.started_at
                    ? `${Math.max(0, Math.round((Date.parse(String(modal.record.finished_at)) - Date.parse(String(modal.record.started_at))) / 1000))}s`
                    : "—"}
                </p>
              )}
              {modal.entity === "users" && (
                <div className={styles.supportActions}>
                  <button
                    className={styles.secondary}
                    disabled={busy}
                    onClick={() =>
                      void change("users", "UPDATE", modal.record, {
                        is_verified: !modal.record?.is_verified,
                      }).catch(() => {})
                    }
                  >
                    <ShieldCheck size={16} />
                    {modal.record?.is_verified ? "Unverify" : "Verify user"}
                  </button>
                  <button
                    className={styles.secondary}
                    disabled={busy}
                    onClick={() => setModal({ ...modal, kind: "edit" })}
                  >
                    <PencilSimple size={16} />
                    Change role / reset password
                  </button>
                  <button
                    className={styles.secondary}
                    disabled={busy}
                    onClick={() =>
                      setModal({
                        kind: "edit",
                        entity: "users",
                        record: { ...modal.record, machine_info: null },
                      })
                    }
                  >
                    <ArrowClockwise size={16} />
                    Reset machine binding
                  </button>
                </div>
              )}
              {modal.entity === "transactions" && (
                <button
                  className={styles.primary}
                  disabled={busy}
                  onClick={() => setModal({ ...modal, kind: "edit" })}
                >
                  Edit status / user
                  <span>
                    <Check size={18} />
                  </span>
                </button>
              )}
              {error && (
                <p role="alert" className={styles.error}>
                  {error}
                </p>
              )}
            </>
          )}
        </Dialog>
      )}
    </div>
  );
}
