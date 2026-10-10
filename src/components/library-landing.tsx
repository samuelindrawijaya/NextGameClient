"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  ArrowUpRight,
  ArrowRight,
  Heart,
  MagnifyingGlass,
  Check,
  Plus,
  X,
  WindowsLogo,
  SteamLogo,
  SquaresFour,
  Books,
  DownloadSimple,
  ArrowsClockwise,
  HardDrives,
  CheckCircle,
  ShieldCheck,
  ChatCircle,
  Headset,
} from "@phosphor-icons/react";
import type { CatalogStats } from "@/lib/catalog-stats";
import type { Game } from "@/lib/game";
import { useMotionPreference } from "@/lib/use-motion-preference";
import CatalogDiscovery from "./catalog-discovery";
import AppPreview from "./desktop-app-preview";
import {
  faq,
  requestStatuses,
  supportCategories,
  ticketStatuses,
  resourceInfo,
} from "@/data/product-copy";

type Panel =
  | Game
  | "download"
  | "access"
  | "premium"
  | "favorites"
  | "privacy"
  | keyof typeof resourceInfo
  | null;
const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

function Brand() {
  return (
    <a href="#" className="brand" aria-label="NextGame, kembali ke atas">
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M4 5h8l12 22h-8L4 5Zm17 0h7v22h-7V5Z" fill="currentColor" />
      </svg>
      <span>
        nextgame<span>.</span>
      </span>
    </a>
  );
}

function Action({
  children,
  href,
  onClick,
  primary = false,
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  primary?: boolean;
}) {
  const inner = (
    <>
      {children}
      <span className="action-orb">
        <ArrowUpRight size={18} weight="light" />
      </span>
    </>
  );
  return href ? (
    <a
      className={`action ${primary ? "primary" : ""}`}
      href={href}
      onClick={onClick}
    >
      {inner}
    </a>
  ) : (
    <button className={`action ${primary ? "primary" : ""}`} onClick={onClick}>
      {inner}
    </button>
  );
}

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useMotionPreference();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.8, ease, delay }}
    >
      {children}
    </motion.div>
  );
}

export default function LibraryLanding({
  games,
  stats,
}: {
  games: Game[];
  stats: CatalogStats;
}) {
  const reduced = useMotionPreference();
  const [favorites, setFavorites] = useState<number[]>([]);
  const [panel, setPanel] = useState<Panel>(null);
  const info =
    typeof panel === "string" && panel in resourceInfo
      ? resourceInfo[panel as keyof typeof resourceInfo]
      : null;
  const [menu, setMenu] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [toast, setToast] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(
        localStorage.getItem("nextgame-favorites") || "[]",
      );
      if (Array.isArray(stored)) {
        const valid = stored.filter(
          (id): id is number =>
            typeof id === "number" && games.some((g) => g.app_id === id),
        );
        const frame = requestAnimationFrame(() => setFavorites(valid));
        return () => cancelAnimationFrame(frame);
      }
    } catch {
      /* Keep the catalog usable when storage is blocked. */
    }
  }, [games]);

  useEffect(() => {
    if (panel && !dialog.current?.open) dialog.current?.showModal();
    if (!panel && dialog.current?.open) dialog.current.close();
    document.body.style.overflow = panel || menu ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [panel, menu]);

  useEffect(() => {
    if (!menu) return;
    const trigger = document.querySelector<HTMLButtonElement>(".menu-toggle");
    const links = Array.from(
      document.querySelectorAll<HTMLAnchorElement>("#mobile-menu a"),
    );
    const frame = requestAnimationFrame(() => links[0]?.focus());
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenu(false);
      const controls = [trigger, ...links].filter(Boolean);
      if (
        e.key === "Tab" &&
        e.shiftKey &&
        document.activeElement === controls[0]
      ) {
        e.preventDefault();
        links.at(-1)?.focus();
      } else if (
        e.key === "Tab" &&
        !e.shiftKey &&
        document.activeElement === links.at(-1)
      ) {
        e.preventDefault();
        trigger?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [menu]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function toggleFavorite(id: number) {
    const next = favorites.includes(id)
      ? favorites.filter((i) => i !== id)
      : [...favorites, id];
    setFavorites(next);
    try {
      localStorage.setItem("nextgame-favorites", JSON.stringify(next));
    } catch {
      /* In-memory favorites still work. */
    }
    setToast(
      next.includes(id)
        ? "Game disimpan ke favorit"
        : "Game dihapus dari favorit",
    );
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 2500);
  }

  const nav = [
    ["Fitur", "fitur"],
    ["Discover", "katalog"],
    ["Steam Access", "akses"],
    ["Platforms", "platform"],
    ["FAQ", "faq"],
  ];
  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("id-ID", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(date));

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.65, ease }}>
      <a className="skip-link" href="#main">
        Lewati ke konten
      </a>
      <header className={`nav-island ${menu ? "menu-open" : ""}`}>
        <Brand />
        <nav aria-label="Navigasi utama">
          {nav.map(([label, id]) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
        </nav>
        <div className="nav-right">
          <button
            className="favorite-nav"
            onClick={() => setPanel("favorites")}
            aria-label={`Favorit, ${favorites.length} game`}
          >
            <Heart size={18} weight="light" />
            {favorites.length > 0 && <b>{favorites.length}</b>}
          </button>
          <button className="nav-download" onClick={() => setPanel("download")}>
            Download App{" "}
            <span>
              <ArrowUpRight size={16} weight="light" />
            </span>
          </button>
          <button
            className={`menu-toggle ${menu ? "opened" : ""}`}
            onClick={() => setMenu(!menu)}
            aria-label={menu ? "Tutup menu" : "Buka menu"}
            aria-expanded={menu}
            aria-controls="mobile-menu"
          >
            <motion.span
              animate={{ rotate: menu ? 45 : 0, y: menu ? 0 : -3 }}
            />
            <motion.span
              animate={{ rotate: menu ? -45 : 0, y: menu ? 0 : 3 }}
            />
          </button>
        </div>
      </header>
      <AnimatePresence>
        {menu && (
          <motion.div
            className="mobile-menu"
            id="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div>
              <span className="eyebrow">YOUR GAMES. ONE LIBRARY.</span>
              {nav.map(([label, id], i) => (
                <motion.a
                  key={id}
                  href={`#${id}`}
                  initial={reduced ? false : { opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 * i, ease }}
                  onClick={() => setMenu(false)}
                >
                  {label}
                  <ArrowUpRight weight="light" />
                </motion.a>
              ))}
              <button
                className="mobile-download"
                onClick={() => {
                  setMenu(false);
                  setPanel("download");
                }}
              >
                Download App <DownloadSimple weight="light" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main id="main" inert={menu}>
        <section className="hero">
          <div className="hero-orbit" aria-hidden="true" />
          <div className="container hero-layout">
            <motion.div
              className="hero-copy"
              initial={reduced ? false : { opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="eyebrow hero-badge">
                <span className="status-dot" /> STEAM ACCESS / DESKTOP PLATFORM
              </span>
              <h1>
                <span className="hero-count">70.000+ Game.</span>
                <br />
                <span>Satu Library.</span>
              </h1>
              <p className="hero-lead">Terus Bertambah.</p>
              <p>
                Jelajahi ribuan game Steam yang didukung langsung dari satu
                desktop app. Cari game yang kamu mau, aktifkan aksesnya,
                tambahkan ke library, lalu kelola semuanya dari satu tempat.
              </p>
              <div className="hero-actions">
                <Action onClick={() => setPanel("download")} primary>
                  Download App
                </Action>
                <button
                  className="download-link"
                  onClick={() =>
                    document.getElementById("katalog")?.scrollIntoView({
                      behavior: reduced ? "instant" : "smooth",
                    })
                  }
                >
                  <SquaresFour weight="light" size={18} /> Lihat Katalog
                </button>
              </div>
              <div className="hero-support">
                <span>
                  <SteamLogo weight="light" size={17} /> Steam tersedia sekarang{" "}
                  <CheckCircle size={12} weight="fill" />
                </span>
                <small>
                  EA · Ubisoft · Denuvo <span>Coming Soon</span>
                </small>
              </div>
            </motion.div>
            <motion.div
              className="hero-product"
              initial={reduced ? false : { opacity: 0, y: 45, rotate: 2 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ duration: 1.1, delay: 0.15, ease }}
            >
              <div className="product-caption">
                <span>
                  <SquaresFour size={12} weight="light" /> ONE APP. EVERY NEXT
                  ADVENTURE.
                </span>
                <span>WINDOWS / STEAM</span>
              </div>
              <AppPreview games={games} onAction={() => setPanel("download")} />
              <motion.div
                className="sync-island"
                initial={reduced ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65, ease }}
              >
                <span className="sync-icon">
                  <ArrowsClockwise size={23} weight="light" />
                </span>
                <span>
                  Everything in its place.
                  <small>Your library, beautifully organized.</small>
                </span>
                <CheckCircle weight="fill" size={18} />
              </motion.div>
            </motion.div>
          </div>
          <div className="container hero-bottom">
            <span>70.000+ SUPPORTED TITLES</span>
            <span>
              <ArrowsClockwise size={15} weight="light" /> Regular Catalog
              Updates
            </span>
            <a href="#fitur">
              Lifetime Steam Access <ArrowRight size={14} weight="light" />
            </a>
          </div>
        </section>

        <section className="intro-section container">
          <Reveal className="intro-layout">
            <span className="eyebrow">SEBUAH LIBRARY, BUKAN PENJUAL KEY</span>
            <h2>
              Cari. Aktifkan.
              <br />
              <span>Mainkan.</span>
            </h2>
            <p>
              Buka aplikasi dan jelajahi 70.000+ game Steam yang didukung,
              dengan jumlah yang terus bertambah. Tidak perlu mencari key atau
              menukarkan kode satu per satu.
            </p>
          </Reveal>
          <Reveal className="library-flow">
            {["CARI", "AKTIFKAN", "TAMBAHKAN KE LIBRARY", "MAINKAN"].map(
              (step, i) => (
                <div key={step}>
                  <span>0{i + 1}</span>
                  <strong>{step}</strong>
                  {i < 3 && <ArrowRight size={18} weight="light" />}
                </div>
              ),
            )}
          </Reveal>
        </section>

        <section className="section container" id="fitur">
          <Reveal className="section-heading">
            <div>
              <span className="eyebrow">01 / STEAM ACCESS</span>
              <h2>
                Steam.
                <br />
                <span>Tersedia sekarang.</span>
              </h2>
            </div>
            <p>
              Jelajahi katalog Steam langsung dari aplikasi. Informasi game,
              artwork, genre, kategori, publisher, dan status library dalam satu
              interface.
            </p>
          </Reveal>
          <div className="bento-grid">
            <Reveal className="bezel library-bento">
              <div className="bezel-core">
                <div className="bento-heading">
                  <span className="icon-tile">
                    <Books size={25} weight="light" />
                  </span>
                  <span className="micro-label">
                    BROWSE WITHOUT THE BACK-AND-FORTH
                  </span>
                </div>
                <h3>
                  70.000+ Games.
                  <br />
                  Cari dari satu tempat.
                </h3>
                <p>
                  Cari judul atau deskripsi game, lalu persempit hasil dengan
                  filter kategori dan genre di aplikasi desktop.
                </p>
                <div className="mini-search">
                  <MagnifyingGlass size={15} weight="light" />
                  <span>Cari game...</span>
                  <span className="micro-label">KATALOG</span>
                </div>
                <div className="actual-mini-filters">
                  <span>Semua kategori</span>
                  <span>Semua genre</span>
                </div>
                <div className="actual-game-grid">
                  {games.slice(0, 4).map((g) => (
                    <button
                      key={g.app_id}
                      onClick={() => setPanel(g)}
                      aria-label={`Lihat detail ${g.name}`}
                    >
                      <Image src={g.header} alt="" width={240} height={112} />
                      <small>{g.genres.slice(0, 2).join(" / ")}</small>
                      <strong>{g.name}</strong>
                      <span>Lihat informasi dan detail game.</span>
                    </button>
                  ))}
                </div>
              </div>
            </Reveal>
            <Reveal className="bezel ownership-bento" delay={0.08}>
              <div className="bezel-core">
                <span className="icon-tile">
                  <CheckCircle size={25} weight="light" />
                </span>
                <span className="eyebrow">02 / LIBRARY KAMU</span>
                <h3>
                  Koleksi kamu.
                  <br />
                  Dalam satu library.
                </h3>
                <p>
                  Game yang kamu klaim masuk ke koleksi. Cari berdasarkan nama
                  atau App ID, urutkan berdasarkan nama atau terakhir
                  ditambahkan, lalu buka detail game.
                </p>
                <div className="actual-library-toolbar">
                  <span>Semua game</span>
                  <span>Cari koleksimu...</span>
                  <span>Terakhir ditambahkan</span>
                </div>
                <div className="actual-game-grid">
                  {games.slice(0, 4).map((g) => (
                    <button
                      key={g.app_id}
                      onClick={() => setPanel(g)}
                      aria-label={`Buka koleksi ${g.name}`}
                    >
                      <Image src={g.header} alt="" width={240} height={112} />
                      <small>{g.genres.slice(0, 2).join(" / ")}</small>
                      <strong>{g.name}</strong>
                      <span>Lihat informasi dan detail game.</span>
                    </button>
                  ))}
                </div>
                <span className="preview-note">
                  Preview tampilan koleksi aplikasi desktop
                </span>
              </div>
            </Reveal>
            <Reveal className="bezel actions-bento" delay={0.1}>
              <div className="bezel-core">
                <div>
                  <span className="eyebrow">
                    03 / KLAIM. BUKA STEAM. MAINKAN.
                  </span>
                  <h3>
                    Dari library.
                    <br />
                    Langsung ke game.
                  </h3>
                  <p>
                    Buka detail game dan klaim game yang tersedia. Setelah klaim
                    berhasil, buka Steam Library untuk melanjutkan instalasi dan
                    bermain melalui Steam.
                  </p>
                </div>
                <div className="action-console">
                  <div className="action-console-title">
                    <HardDrives size={15} weight="light" />
                    <span>YOUR GAME. YOUR NEXT MOVE.</span>
                  </div>
                  <div className="action-buttons">
                    {[
                      ["Lihat detail", <Books key="detail" weight="light" />],
                      [
                        "Klaim Game",
                        <CheckCircle key="claim" weight="light" />,
                      ],
                      [
                        "Buka Steam Library",
                        <SteamLogo key="steam" weight="light" />,
                      ],
                    ].map(([label, icon]) => (
                      <button
                        key={String(label)}
                        onClick={() => setPanel("download")}
                        className={label === "Klaim Game" ? "play" : ""}
                      >
                        {icon}
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="launcher-note">
                    <ShieldCheck size={15} weight="light" />
                    <span>
                      Lanjutkan di Steam
                      <small>
                        Instalasi dan bermain dilanjutkan melalui Steam Library.
                      </small>
                    </span>
                  </div>
                  <span className="preview-note">
                    Preview alur aplikasi desktop
                  </span>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="catalog-sync-section">
          <div className="container sync-layout">
            <Reveal>
              <span className="eyebrow">04 / KATALOG SELALU DIPERBARUI</span>
              <h2>
                Library terus
                <br />
                <span>bertambah.</span>
              </h2>
              <p>
                Game baru dan metadata katalog diperbarui secara berkala tanpa
                kamu harus mengelola semuanya secara manual.
              </p>
              <div className="sync-label">
                <ArrowsClockwise size={16} weight="light" /> Regular catalog
                updates <span>/ NEW RELEASES</span>
              </div>
            </Reveal>
            <Reveal className="sync-stats" delay={0.1}>
              <div>
                <strong>
                  70.000+
                  <span>↗</span>
                </strong>
                <span>Supported Games</span>
              </div>
              <div className="stats-bottom">
                <div>
                  <strong>Regular</strong>
                  <span>Catalog Updates</span>
                </div>
                <div>
                  <strong>Growing</strong>
                  <span>Library · New Titles Added</span>
                </div>
              </div>
              <p>
                {stats.source === "supabase"
                  ? `${new Intl.NumberFormat("id-ID").format(stats.count)} game terbaca dari database saat ini.`
                  : `${games.length} game pilihan ditampilkan pada preview katalog. Temukan lebih banyak judul melalui Steam Access.`}
              </p>
            </Reveal>
          </div>
        </section>

        <CatalogDiscovery
          games={games}
          favorites={favorites}
          onOpen={setPanel}
          onToggleFavorite={toggleFavorite}
          onOpenFavorites={() => setPanel("favorites")}
          onRequest={() => setPanel("request")}
        />

        <section className="section container help-grid">
          <div id="request-game">
            <Reveal className="bezel request-card">
              <div className="bezel-core">
                <span className="icon-tile">
                  <ChatCircle size={27} weight="light" />
                </span>
                <span className="eyebrow">06 / REQUEST GAME</span>
                <h2>
                  Game belum tersedia?
                  <br />
                  <span>Request saja.</span>
                </h2>
                <p>
                  Tidak menemukan game yang kamu cari? Kamu akan diundang ke
                  channel Discord untuk mengajukan request. Tim kami akan
                  meninjau judul tersebut untuk ditambahkan ke library.
                </p>
                <div className="request-flow">
                  <span>Join Discord</span>
                  <ArrowRight weight="light" />
                  <span>Channel Request</span>
                  <ArrowRight weight="light" />
                  <span>Request Game</span>
                </div>
                <div className="workflow-preview">
                  <span className="micro-label">REQUEST MELALUI DISCORD</span>
                  <div className="workflow-statuses">
                    {requestStatuses.map((status, i) => (
                      <span key={status} className={i === 0 ? "active" : ""}>
                        {status}
                      </span>
                    ))}
                  </div>
                </div>
                <Action onClick={() => setPanel("request")} primary>
                  Undangan Discord segera tersedia
                </Action>
              </div>
            </Reveal>
          </div>
          <div id="support">
            <Reveal className="bezel support-card" delay={0.08}>
              <div className="bezel-core">
                <span className="icon-tile">
                  <Headset size={27} weight="light" />
                </span>
                <span className="eyebrow">07 / SUPPORT CENTER</span>
                <h2>
                  Butuh bantuan?
                  <br />
                  <span>Kami siap membantu.</span>
                </h2>
                <p>
                  Ada masalah dengan aplikasi, account, activation, library,
                  atau game tertentu? Kamu akan diundang ke channel support
                  Discord untuk mendapatkan bantuan dari tim kami.
                </p>
                <div className="support-categories">
                  {supportCategories.map((category) => (
                    <span key={category}>{category}</span>
                  ))}
                </div>
                <div className="workflow-preview">
                  <span className="micro-label">BANTUAN MELALUI DISCORD</span>
                  <div className="workflow-statuses">
                    {ticketStatuses.map((status, i) => (
                      <span key={status} className={i === 0 ? "active" : ""}>
                        {status}
                      </span>
                    ))}
                  </div>
                </div>
                <Action onClick={() => setPanel("support")}>
                  Support via Discord
                </Action>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="section container" id="platform">
          <Reveal className="section-heading">
            <div>
              <span className="eyebrow">08 / MORE PLATFORMS ARE COMING</span>
              <h2>
                Steam hanyalah
                <br />
                <span>permulaan.</span>
              </h2>
            </div>
            <p>
              Satu library. Kemungkinan yang terus tumbuh.
              <br />
              Dukungan berikutnya sedang dipersiapkan.
            </p>
          </Reveal>
          <div className="platform-grid">
            <Reveal className="bezel platform-card steam-platform">
              <div className="bezel-core">
                <SteamLogo size={64} weight="light" />
                <span className="available-badge">
                  <span className="status-dot" /> AVAILABLE NOW
                </span>
                <h3>Steam</h3>
                <p>70.000+ game Steam yang didukung dan terus bertambah.</p>
                <WindowsLogo size={18} weight="light" />
              </div>
            </Reveal>
            {[
              {
                title: "EA",
                mark: "EA",
                text: "Dukungan untuk judul dan layanan EA sedang dikembangkan.",
              },
              {
                title: "Ubisoft",
                mark: "U",
                text: "Integrasi Ubisoft akan tersedia pada update mendatang.",
              },
              {
                title: "Denuvo",
                mark: "D+",
                text: "Dukungan untuk judul tertentu akan hadir melalui layanan mendatang.",
              },
            ].map((p, i) => (
              <Reveal
                className="bezel platform-card upcoming-platform"
                key={p.title}
                delay={0.05 * (i + 1)}
              >
                <div className="bezel-core">
                  <span className="platform-mark" aria-hidden="true">
                    {p.mark}
                  </span>
                  <span className="coming-badge">COMING SOON</span>
                  <h3>{p.title}</h3>
                  <p>{p.text}</p>
                  <span className="upcoming-line" />
                </div>
              </Reveal>
            ))}
          </div>
          <p className="platform-note">
            EA, Ubisoft, dan dukungan terkait judul Denuvo belum tersedia.
            Kebutuhan launcher pihak ketiga tetap ditampilkan pada informasi
            game.
          </p>
        </section>

        <section className="section container access-section" id="akses">
          <Reveal className="section-heading">
            <div>
              <span className="eyebrow">09 / STEAM ACCESS</span>
              <h2>
                Sekali bayar.
                <br />
                <span>Gunakan selamanya.</span>
              </h2>
            </div>
            <p>
              Akses desktop application dan fitur Steam yang tersedia.
              <br />
              Tanpa langganan bulanan.
            </p>
          </Reveal>
          <div className="access-grid">
            <Reveal className="bezel steam-access-card">
              <div className="bezel-core">
                <div className="access-heading">
                  <span className="icon-tile">
                    <SteamLogo size={28} weight="light" />
                  </span>
                  <span className="access-chip">ONE-TIME PURCHASE</span>
                </div>
                <span className="eyebrow">LIFETIME DESKTOP APP ACCESS</span>
                <h3>
                  Steam Access<span>.</span>
                </h3>
                <p>Satu akses untuk katalog, koleksi, dan game berikutnya.</p>
                <ul className="access-features">
                  {[
                    "70.000+ supported Steam titles",
                    "Aktivasi akses game yang didukung",
                    "Personal game library",
                    "Search & filtering",
                    "Install management & update status",
                    "Game metadata",
                    "Regular catalog updates",
                    "New supported titles",
                    "Desktop client updates",
                  ].map((item) => (
                    <li key={item}>
                      <Check size={15} weight="light" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="access-purchase">
                  <span>
                    <strong>Harga segera diumumkan</strong>
                    <small>Sekali bayar · akses lifetime</small>
                  </span>
                  <Action onClick={() => setPanel("access")} primary>
                    Get Steam Access
                  </Action>
                </div>
              </div>
            </Reveal>
            <Reveal className="bezel premium-access-card" delay={0.08}>
              <div className="bezel-core">
                <span className="icon-tile">
                  <SquaresFour size={28} weight="light" />
                </span>
                <span className="eyebrow">THE NEXT LEVEL</span>
                <h3>
                  Premium Access<span>.</span>
                </h3>
                <span className="premium-badge">COMING SOON</span>
                <p>
                  Platform dan layanan tambahan akan tersedia melalui Premium
                  Access.
                </p>
                <div className="premium-platforms">
                  <span>EA</span>
                  <span>Ubisoft</span>
                  <span>Denuvo</span>
                </div>
                <p className="premium-note">
                  Informasi peluncuran dan akses akan diumumkan setelah
                  tersedia.
                </p>
                <Action onClick={() => setPanel("premium")}>Notify Me</Action>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="section container reasons-section">
          <Reveal className="section-heading">
            <div>
              <span className="eyebrow">10 / KENAPA NEXTGAME?</span>
              <h2>
                Satu aplikasi.
                <br />
                <span>Banyak kemungkinan.</span>
              </h2>
            </div>
            <p>
              Lebih sedikit mengelola daftar.
              <br />
              Lebih banyak menemukan game berikutnya.
            </p>
          </Reveal>
          <Reveal className="reasons-list">
            {[
              ["Satu aplikasi.", "Cari dan kelola game dari satu tempat."],
              ["Library besar.", "Lebih dari 70.000 game Steam yang didukung."],
              ["Terus bertambah.", "Game baru ditambahkan secara berkala."],
              [
                "Cari dan filter.",
                "Cari judul atau deskripsi, lalu filter kategori dan genre.",
              ],
              [
                "Request Game.",
                "Belum tersedia? Ajukan request melalui channel Discord.",
              ],
              ["Support.", "Ada masalah? Hubungi tim melalui channel Discord."],
            ].map(([title, detail], i) => (
              <div key={title}>
                <span className="reason-number">0{i + 1}</span>
                <h3>{title}</h3>
                <p>{detail}</p>
                <ArrowUpRight weight="light" size={20} />
              </div>
            ))}
          </Reveal>
        </section>

        <section className="section container faq-section" id="faq">
          <Reveal className="faq-title">
            <span className="eyebrow">A LITTLE CLARITY BEFORE YOU PLAY</span>
            <h2>
              Ada pertanyaan?
              <br />
              <span>Kita jawab.</span>
            </h2>
            <p>
              Kenali desktop platform-mu.
              <br />
              Lalu kembali ke petualangan berikutnya.
            </p>
          </Reveal>
          <Reveal className="faq-list">
            {faq.map(([q, a], i) => (
              <div
                className={`faq-item ${faqOpen === i ? "expanded" : ""}`}
                key={q}
              >
                <h3>
                  <button
                    onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                    aria-expanded={faqOpen === i}
                    aria-controls={`faq-answer-${i}`}
                  >
                    {q}
                    <motion.span animate={{ rotate: faqOpen === i ? 45 : 0 }}>
                      <Plus size={20} weight="light" />
                    </motion.span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {faqOpen === i && (
                    <motion.div
                      id={`faq-answer-${i}`}
                      className="faq-answer"
                      initial={reduced ? false : { opacity: 0, y: -7 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -7 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p>{a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </Reveal>
        </section>

        <section className="closing container">
          <Reveal>
            <span className="eyebrow">YOUR COLLECTION. YOUR NEXT CHAPTER.</span>
            <h2>
              70.000+ Game
              <br />
              <span>Menunggu.</span>
            </h2>
            <p>
              Cari game yang kamu mau, aktifkan langsung dari aplikasi,
              <br />
              dan tambahkan ke library kamu.
            </p>
            <div className="closing-help">
              <a href="#request-game">Belum tersedia? Request saja.</a>
              <a href="#support">Butuh bantuan? Support tersedia.</a>
            </div>
            <div className="closing-actions">
              <Action onClick={() => setPanel("download")} primary>
                Download App
              </Action>
              <Action href="#katalog">Explore Games</Action>
              <Action onClick={() => setPanel("access")}>
                Get Steam Access
              </Action>
            </div>
            <span className="closing-support">
              <SteamLogo size={15} weight="light" /> Steam tersedia sekarang{" "}
              <span>·</span> EA / Ubisoft / Denuvo coming soon
            </span>
          </Reveal>
        </section>
      </main>
      <footer className="footer container" inert={menu}>
        <div className="footer-top">
          <div>
            <Brand />
            <p>
              70.000+ Game. Satu Library.
              <br />
              Terus Bertambah.
            </p>
          </div>
          <div className="footer-links">
            <div>
              <span>PRODUCT</span>
              <button onClick={() => setPanel("download")}>Download</button>
              <a href="#katalog">Game Catalog</a>
              <a href="#akses">Steam Access</a>
              <button onClick={() => setPanel("premium")}>
                Premium Access
              </button>
              <a href="#request-game">Request Game</a>
            </div>
            <div>
              <span>PLATFORMS</span>
              <a href="#platform">Steam — Available</a>
              <a href="#platform">EA — Coming Soon</a>
              <a href="#platform">Ubisoft — Coming Soon</a>
              <a href="#platform">Denuvo — Coming Soon</a>
            </div>
            <div>
              <span>SUPPORT</span>
              <a href="#faq">FAQ</a>
              <button onClick={() => setPanel("tutorial")}>Tutorial</button>
              <a href="#support">Support Center</a>
              <button onClick={() => setPanel("support")}>Contact</button>
              <button onClick={() => setPanel("status")}>Status</button>
            </div>
            <div>
              <span>LEGAL</span>
              <button onClick={() => setPanel("terms")}>
                Terms of Service
              </button>
              <button onClick={() => setPanel("privacy")}>
                Privacy Policy
              </button>
              <button onClick={() => setPanel("refund")}>Refund Policy</button>
              <span className="footer-platform">
                <WindowsLogo size={13} weight="light" /> PC / Windows
              </span>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 NextGame. Made for the love of play.</span>
          <span>
            Artwork milik publisher masing-masing. Tidak berafiliasi dengan
            Valve.
          </span>
          <span>
            <span className="status-dot" /> INDONESIA
          </span>
        </div>
      </footer>

      <dialog
        ref={dialog}
        className="dialog"
        aria-labelledby="dialog-title"
        onCancel={() => setPanel(null)}
        onClick={(e) => {
          if (e.target === dialog.current) setPanel(null);
        }}
      >
        <motion.div
          className="dialog-inner"
          key={typeof panel === "object" ? panel?.app_id : panel}
          initial={reduced ? false : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease }}
        >
          <button
            className="dialog-close"
            onClick={() => setPanel(null)}
            aria-label="Tutup dialog"
          >
            <X size={20} weight="light" />
          </button>
          {panel && typeof panel === "object" ? (
            <>
              <div className="dialog-art">
                <Image
                  src={panel.hero}
                  alt={panel.name}
                  width={1920}
                  height={620}
                  sizes="(max-width: 700px) 100vw, 720px"
                />
              </div>
              <div className="dialog-content">
                <span className="eyebrow">
                  STEAM · {panel.genres.join(" / ")}
                </span>
                <h2 id="dialog-title">{panel.name}</h2>
                <p>{panel.description}</p>
                <dl className="game-facts">
                  <div>
                    <dt>Publisher</dt>
                    <dd>{panel.publisher || "Belum tersedia"}</dd>
                  </div>
                  <div>
                    <dt>Tanggal rilis</dt>
                    <dd>
                      {panel.release_date
                        ? formatDate(panel.release_date)
                        : "Belum diumumkan"}
                    </dd>
                  </div>
                </dl>
                <div className="dialog-actions">
                  <a
                    className="action primary"
                    href={panel.steam_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Lihat di Steam
                    <span className="action-orb">
                      <ArrowUpRight size={17} weight="light" />
                    </span>
                  </a>
                  <button
                    className="dialog-save"
                    onClick={() => toggleFavorite(panel.app_id)}
                    aria-pressed={favorites.includes(panel.app_id)}
                  >
                    <Heart
                      size={19}
                      weight={
                        favorites.includes(panel.app_id) ? "fill" : "light"
                      }
                    />
                    {favorites.includes(panel.app_id)
                      ? "Tersimpan"
                      : "Simpan favorit"}
                  </button>
                </div>
              </div>
            </>
          ) : panel === "favorites" ? (
            <div className="dialog-content">
              <span className="eyebrow">YOUR NEXT ADVENTURES</span>
              <h2 id="dialog-title">
                Your favorites<span>.</span>
              </h2>
              <p>
                {favorites.length} game dalam daftar incaranmu. Daftar ini
                tersimpan pada browser, terpisah dari kepemilikan Steam.
              </p>
              {favorites.length ? (
                <div className="favorites-list">
                  {games
                    .filter((g) => favorites.includes(g.app_id))
                    .map((g) => (
                      <div className="favorite-row" key={g.app_id}>
                        <button onClick={() => setPanel(g)}>
                          <Image
                            src={g.header}
                            alt=""
                            width={110}
                            height={52}
                          />
                          <span>
                            {g.name}
                            <small>{g.genres.join(" · ")}</small>
                          </span>
                        </button>
                        <button
                          className="save-button saved"
                          onClick={() => toggleFavorite(g.app_id)}
                          aria-label={`Hapus ${g.name} dari favorit`}
                        >
                          <Heart size={19} weight="fill" />
                        </button>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Heart size={40} weight="light" />
                  <h3>Petualanganmu masih terbuka.</h3>
                  <p>Ketuk ikon hati pada game untuk menyimpannya di sini.</p>
                </div>
              )}
            </div>
          ) : panel === "access" || panel === "premium" ? (
            <div className="dialog-content info-dialog">
              <span className="icon-tile">
                <SteamLogo weight="light" size={27} />
              </span>
              <span className="eyebrow">
                NEXTGAME /{" "}
                {panel === "access" ? "ONE-TIME PURCHASE" : "COMING SOON"}
              </span>
              <h2 id="dialog-title">
                {panel === "access" ? "Steam Access." : "Premium Access."}
              </h2>
              <p>
                {panel === "access"
                  ? "Steam Access dirancang sebagai akses lifetime dengan sekali bayar. Harga dan tautan pembelian belum tersedia; informasi akan diperbarui setelah siap."
                  : "EA, Ubisoft, dan dukungan terkait Denuvo masih Coming Soon. Pendaftaran notifikasi belum tersedia; informasi peluncuran akan diumumkan pada halaman ini."}
              </p>
              <Action href="#katalog" onClick={() => setPanel(null)} primary>
                Lihat Katalog
              </Action>
            </div>
          ) : info ? (
            <div className="dialog-content info-dialog">
              <span className="icon-tile">
                <Books size={27} weight="light" />
              </span>
              <span className="eyebrow">
                NEXTGAME /{" "}
                {panel === "request" || panel === "support"
                  ? "DISCORD COMMUNITY"
                  : "INFORMATION"}
              </span>
              <h2 id="dialog-title">{info.title}</h2>
              <p>{info.text}</p>
              {panel === "request" || panel === "support" ? (
                <span className="discord-pending">
                  Undangan Discord tersedia nanti
                </span>
              ) : panel === "tutorial" ? (
                <Action onClick={() => setPanel("download")} primary>
                  Download App
                </Action>
              ) : null}
            </div>
          ) : panel === "download" ? (
            <div className="dialog-content info-dialog">
              <span className="icon-tile">
                <DownloadSimple weight="light" size={27} />
              </span>
              <span className="eyebrow">NEXTGAME / DESKTOP</span>
              <h2 id="dialog-title">
                Satu aplikasi.
                <br />
                Segera di desktop kamu.
              </h2>
              <p>
                Tautan unduhan aplikasi belum tersedia dan akan ditambahkan
                setelah siap. Aktivasi dan personal library digunakan melalui
                aplikasi desktop. Request Game dan Support Center akan melalui
                channel Discord; tombol pada preview halaman ini memperlihatkan
                alurnya.
              </p>
              <div className="download-platform">
                <WindowsLogo size={22} weight="light" />
                <span>
                  PC / Windows
                  <small>
                    Steam supported · EA, Ubisoft, Denuvo coming soon
                  </small>
                </span>
              </div>
              <Action
                onClick={() => {
                  setPanel(null);
                  document.getElementById("katalog")?.scrollIntoView({
                    behavior: reduced ? "instant" : "smooth",
                  });
                }}
                primary
              >
                Explore Games
              </Action>
            </div>
          ) : panel === "privacy" ? (
            <div className="dialog-content info-dialog">
              <span className="icon-tile">
                <ShieldCheck size={27} weight="light" />
              </span>
              <span className="eyebrow">YOUR DATA. YOUR DEVICE.</span>
              <h2 id="dialog-title">Privasi halaman ini.</h2>
              <p>
                Favorit disimpan lokal di browser. Halaman ini tidak meminta
                login Steam, informasi pembayaran, atau lokasi instalasi. Status
                owned dan installed pada preview merupakan ilustrasi, bukan
                pembacaan koleksi perangkatmu.
              </p>
              <p>
                Pembukaan tautan Steam mengikuti kebijakan Steam. Request Game
                dan Support Center akan ditangani melalui channel Discord;
                halaman ini tidak mengumpulkan request atau tiket bantuan.
              </p>
            </div>
          ) : null}
        </motion.div>
      </dialog>
      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            role="status"
            initial={{ opacity: 0, y: 15, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 15, x: "-50%" }}
          >
            <Check size={17} weight="light" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
