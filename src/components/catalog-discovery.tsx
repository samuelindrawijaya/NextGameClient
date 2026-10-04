"use client";

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  ArrowRight,
  CaretDown,
  Heart,
  MagnifyingGlass,
  SlidersHorizontal,
  SquaresFour,
  SteamLogo,
  X,
} from "@phosphor-icons/react";
import type { Game } from "@/lib/game";
import { useMotionPreference } from "@/lib/use-motion-preference";
import styles from "./catalog-discovery.module.css";

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];
const genres = [
  "Semua",
  "Action",
  "RPG",
  "Adventure",
  "Open World",
  "Racing",
  "Strategy",
  "Simulation",
  "Indie",
  "Sports",
];

type Props = {
  games: Game[];
  favorites: number[];
  onOpen: (game: Game) => void;
  onToggleFavorite: (appId: number) => void;
  onOpenFavorites: () => void;
  onRequest: () => void;
};

export default function CatalogDiscovery({
  games,
  favorites,
  onOpen,
  onToggleFavorite,
  onOpenFavorites,
  onRequest,
}: Props) {
  const reduced = useMotionPreference();
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("Semua");
  const [sort, setSort] = useState("pilihan");
  const term = query.toLowerCase().trim();
  let shown = games.filter(
    (game) =>
      `${game.app_id} ${game.name} ${game.publisher} ${game.release_date || ""} ${game.genres.join(" ")}`
        .toLowerCase()
        .includes(term) &&
      (genre === "Semua" || game.genres.includes(genre)),
  );
  if (sort === "terbaru")
    shown = [...shown].sort((a, b) =>
      (b.release_date || "").localeCompare(a.release_date || ""),
    );
  if (sort === "nama")
    shown = [...shown].sort((a, b) => a.name.localeCompare(b.name));
  const spotlight =
    !term && genre === "Semua" && sort === "pilihan" ? games[0] : null;
  const reset = () => {
    setQuery("");
    setGenre("Semua");
  };

  return (
    <section
      className={`section container ${styles.section}`}
      id="katalog"
      aria-labelledby="catalog-title"
    >
      <motion.div
        className={styles.heading}
        initial={reduced ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.8, ease }}
      >
        <div>
          <span className="eyebrow">05 / DIBANGUN UNTUK KOLEKSI BESAR</span>
          <h2 id="catalog-title">
            Temukan game.
            <br />
            <span>Dalam hitungan detik.</span>
          </h2>
        </div>
        <div className={styles.headingAside}>
          <span className={styles.platform}>
            <SteamLogo size={16} weight="light" /> STEAM CATALOG
          </span>
          <p>
            Dunia baru, genre favorit, atau judul yang sudah lama kamu incar.
            Mulai pencarianmu di sini.
          </p>
        </div>
      </motion.div>

      <div className={styles.frame}>
        <div className={styles.inner}>
          <div className={styles.controls}>
            <div className={styles.searchRow}>
              <label className={styles.search}>
                <span className={styles.searchIcon}>
                  <MagnifyingGlass size={23} weight="light" />
                </span>
                <input
                  type="search"
                  aria-label="Cari game"
                  placeholder="Cari game, genre, publisher, tahun, atau AppID..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    aria-label="Hapus pencarian"
                  >
                    <X size={18} weight="light" />
                  </button>
                )}
              </label>
              <label className={styles.sort}>
                <SlidersHorizontal size={18} weight="light" />
                <select
                  aria-label="Urutkan game"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="pilihan">Pilihan NextGame</option>
                  <option value="terbaru">Rilis terbaru</option>
                  <option value="nama">Nama A–Z</option>
                </select>
                <CaretDown size={12} weight="light" />
              </label>
            </div>
            <div
              className={styles.filters}
              role="group"
              aria-label="Filter genre"
            >
              {genres.map((item) => (
                <button
                  key={item}
                  className={genre === item ? styles.active : ""}
                  aria-pressed={genre === item}
                  onClick={() => setGenre(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.resultsBar}>
            <div>
              <SquaresFour size={17} weight="light" />
              <h3>
                {term || genre !== "Semua"
                  ? "Hasil pencarian"
                  : "Pilihan untuk library-mu"}
              </h3>
              <span className={styles.resultCount} aria-live="polite">
                {shown.length} game
              </span>
            </div>
            <button
              className={styles.favorites}
              onClick={onOpenFavorites}
              aria-label={`Buka favorit, ${favorites.length} game`}
            >
              <Heart size={17} weight="light" />
              <span>Favorit</span>
              <b>{favorites.length}</b>
            </button>
          </div>

          {spotlight && (
            <motion.div
              className={styles.spotlight}
              initial={reduced ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.65, ease }}
            >
              <button
                className={styles.spotlightArt}
                onClick={() => onOpen(spotlight)}
                aria-label={`Lihat detail sorotan ${spotlight.name}`}
              >
                <Image
                  src={spotlight.hero}
                  alt={spotlight.name}
                  fill
                  sizes="(max-width: 700px) 90vw, 50vw"
                />
                <span className={styles.spotlightLabel}>
                  <span /> PILIHAN KURASI
                </span>
                <span className={styles.artCaption}>
                  A WORLD WORTH EXPLORING{" "}
                  <ArrowUpRight size={19} weight="light" />
                </span>
              </button>
              <div className={styles.spotlightInfo}>
                <span className={styles.overline}>MULAI DARI SINI</span>
                <h3>{spotlight.name}</h3>
                <div className={styles.tags}>
                  {spotlight.genres.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <p>{spotlight.description}</p>
                <button
                  className={styles.spotlightAction}
                  onClick={() => onOpen(spotlight)}
                >
                  Lihat detail
                  <span>
                    <ArrowUpRight size={18} weight="light" />
                  </span>
                </button>
              </div>
            </motion.div>
          )}

          <motion.div className={styles.grid} layout>
            <AnimatePresence mode="popLayout">
              {shown.map((game, i) => (
                <motion.article
                  key={game.app_id}
                  className={`game-shell ${styles.gameShell}`}
                  layout
                  initial={reduced ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{
                    duration: 0.35,
                    ease,
                    delay: Math.min(i * 0.025, 0.12),
                  }}
                >
                  <div className={styles.card}>
                    <div className={styles.cardArt}>
                      <button
                        className={styles.imageButton}
                        onClick={() => onOpen(game)}
                        aria-label={`Lihat detail ${game.name}`}
                      >
                        <Image
                          src={game.header}
                          alt={game.name}
                          width={460}
                          height={215}
                          sizes="(max-width: 700px) 45vw, (max-width: 1000px) 30vw, 22vw"
                        />
                      </button>
                      <span className={styles.steamMark}>
                        <SteamLogo size={15} weight="light" />
                      </span>
                      <button
                        className={`${styles.save} ${favorites.includes(game.app_id) ? styles.saved : ""}`}
                        onClick={() => onToggleFavorite(game.app_id)}
                        aria-pressed={favorites.includes(game.app_id)}
                        aria-label={`${favorites.includes(game.app_id) ? "Hapus" : "Simpan"} ${game.name} ${favorites.includes(game.app_id) ? "dari" : "ke"} favorit`}
                      >
                        <Heart
                          size={18}
                          weight={
                            favorites.includes(game.app_id) ? "fill" : "light"
                          }
                        />
                      </button>
                    </div>
                    <div className={styles.cardInfo}>
                      <span className={styles.cardGenre}>
                        {game.genres.join(" · ")}
                      </span>
                      <h3>
                        <button onClick={() => onOpen(game)}>
                          {game.name}
                        </button>
                      </h3>
                      <div className={styles.cardMeta}>
                        <span>
                          {game.release_date?.slice(0, 4) || "Belum diumumkan"}
                        </span>
                        <span title={game.publisher}>{game.publisher}</span>
                      </div>
                      <button
                        className={styles.cardAction}
                        onClick={() => onOpen(game)}
                      >
                        View Game
                        <span>
                          <ArrowUpRight size={15} weight="light" />
                        </span>
                      </button>
                    </div>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </motion.div>

          {shown.length === 0 && (
            <div className={`empty-state ${styles.emptyState}`}>
              <span className={styles.emptyIcon}>
                <MagnifyingGlass size={30} weight="light" />
              </span>
              <h3>Belum menemukan game-mu?</h3>
              <p>
                Coba kata kunci lain atau ajukan Request Game melalui aplikasi.
              </p>
              <div>
                <button className={styles.spotlightAction} onClick={onRequest}>
                  Request Game
                  <span>
                    <ArrowUpRight size={18} weight="light" />
                  </span>
                </button>
                <button className={styles.reset} onClick={reset}>
                  Reset pencarian <ArrowRight size={15} weight="light" />
                </button>
              </div>
            </div>
          )}

          <div className={styles.foot}>
            <span>
              PREVIEW KATALOG <b>·</b> {games.length} game pilihan dengan
              artwork & metadata Steam.
            </span>
            <button onClick={onRequest}>
              Game belum ada? Request saja{" "}
              <ArrowUpRight size={16} weight="light" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
