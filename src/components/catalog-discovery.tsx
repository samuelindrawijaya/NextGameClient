"use client";

import Image from "next/image";
import { useState, useSyncExternalStore } from "react";
import {
  ArrowRight,
  MagnifyingGlass,
  SteamLogo,
  CaretDown,
  X,
} from "@phosphor-icons/react";
import type { Game } from "@/lib/game";
import styles from "./catalog-discovery.module.css";

type Props = {
  games: Game[];
  favorites: number[];
  onOpen: (game: Game) => void;
  onToggleFavorite: (appId: number) => void;
  onOpenFavorites: () => void;
  onRequest: () => void;
};

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export default function CatalogDiscovery({ games, onOpen, onRequest }: Props) {
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("all");
  const [category, setCategory] = useState("all");
  const term = query.trim().toLowerCase();
  const genres = [...new Set(games.flatMap((game) => game.genres))].sort();
  const categories = [
    ...new Set(games.flatMap((game) => game.categories ?? [])),
  ].sort();
  const shown = games
    .filter(
      (game) =>
        (!term ||
          `${game.name} ${game.description}`.toLowerCase().includes(term)) &&
        (genre === "all" || game.genres.includes(genre)) &&
        (category === "all" || game.categories?.includes(category)),
    )
    .sort((a, b) => (b.release_date ?? "").localeCompare(a.release_date ?? ""));
  const narrowed = Boolean(term || genre !== "all" || category !== "all");
  const reset = () => {
    setQuery("");
    setGenre("all");
    setCategory("all");
  };

  return (
    <section
      className={`section container ${styles.section}`}
      id="katalog"
      aria-labelledby="catalog-title"
    >
      <div className={styles.heading}>
        <div>
          <span className="eyebrow">05 / DIBANGUN UNTUK KOLEKSI BESAR</span>
          <h2 id="catalog-title">
            Temukan game.
            <br />
            <span>Dari satu katalog.</span>
          </h2>
        </div>
        <div className={styles.headingAside}>
          <span className={styles.platform}>
            <SteamLogo size={16} /> STEAM CATALOG
          </span>
          <p>
            Cari judul atau deskripsi, pilih kategori dan genre, lalu buka
            detail game. Katalog desktop menampilkan 24 game per halaman.
          </p>
        </div>
      </div>
      <div className={styles.frame}>
        <div className={styles.inner}>
          <div className={styles.actualHeader}>
            <h3>Katalog</h3>
            <span>Preview aplikasi desktop</span>
          </div>
          <div className={styles.actualControls}>
            <label className={styles.search}>
              <span className={styles.searchIcon}>
                <MagnifyingGlass size={20} />
              </span>
              <input
                type="search"
                disabled={!ready}
                aria-label="Cari game"
                placeholder="Cari judul atau deskripsi"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && (
                <button
                  aria-label="Hapus pencarian"
                  onClick={() => setQuery("")}
                >
                  <X size={16} />
                </button>
              )}
            </label>
            <div className={styles.actualFilters}>
              <label className={styles.sort}>
                <select
                  aria-label="Filter kategori"
                  disabled={!ready}
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  <option value="all">Semua kategori</option>
                  {categories.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                <CaretDown size={12} />
              </label>
              <label className={styles.sort}>
                <select
                  aria-label="Filter genre"
                  disabled={!ready}
                  value={genre}
                  onChange={(event) => setGenre(event.target.value)}
                >
                  <option value="all">Semua genre</option>
                  {genres.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                <CaretDown size={12} />
              </label>
            </div>
            {narrowed && (
              <button className={styles.reset} onClick={reset}>
                Hapus filter
              </button>
            )}
          </div>
          <div className={styles.grid}>
            {shown.map((game) => (
              <article
                className={`game-shell ${styles.gameShell}`}
                key={game.app_id}
              >
                <button
                  className={styles.actualCard}
                  onClick={() => onOpen(game)}
                  aria-label={`Buka detail ${game.name}`}
                >
                  <div className={styles.imageButton}>
                    <Image
                      src={game.header}
                      alt=""
                      width={460}
                      height={215}
                      sizes="(max-width: 700px) 45vw, 22vw"
                    />
                    <span className={styles.actualOpen}>
                      <ArrowRight size={16} />
                    </span>
                  </div>
                  <div className={styles.cardInfo}>
                    <span className={styles.cardGenre}>
                      {game.genres.slice(0, 2).join(" / ") || "GAME"}
                    </span>
                    <h3>{game.name}</h3>
                    <p className={styles.actualDescription}>
                      {game.description || "Lihat informasi dan detail game."}
                    </p>
                  </div>
                </button>
              </article>
            ))}
          </div>
          {!shown.length && (
            <div className={`empty-state ${styles.emptyState}`}>
              <span className={styles.emptyIcon}>
                <MagnifyingGlass size={30} />
              </span>
              <h3>Tidak ada judul yang cocok</h3>
              <p>
                Coba kata kunci lain atau ajukan Request Game melalui Discord.
              </p>
              <div>
                <button className={styles.spotlightAction} onClick={onRequest}>
                  Request Game <ArrowRight size={16} />
                </button>
                <button className={styles.reset} onClick={reset}>
                  Hapus semua filter
                </button>
              </div>
            </div>
          )}
          <div className={styles.foot}>
            <span>
              PREVIEW KATALOG ? {shown.length} dari {games.length} game pilihan
            </span>
            <button onClick={onRequest}>
              Game belum ada? Request via Discord <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
