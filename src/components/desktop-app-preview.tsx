"use client";

import Image from "next/image";
import "./desktop-app-preview.css";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowsClockwise,
  Books,
  Cloud,
  GameController,
  MagnifyingGlass,
  ShieldCheck,
  SquaresFour,
  SteamLogo,
  Wrench,
} from "@phosphor-icons/react";
import type { Game } from "@/lib/game";
import { useMotionPreference } from "@/lib/use-motion-preference";

const navigation = [
  ["My Library", GameController],
  ["Home", SquaresFour],
  ["Katalog", Books],
  ["Steam Connect", SteamLogo],
  ["Fixes", Wrench],
  ["Cloud Save", Cloud],
  ["Account", ShieldCheck],
] as const;

export default function DesktopAppPreview({
  games,
  onAction,
}: {
  games: Game[];
  onAction: () => void;
}) {
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useMotionPreference();
  const featured = games.slice(0, 5);
  const game = featured[selected % Math.max(1, featured.length)];
  useEffect(() => {
    if (paused || reduced || featured.length < 2) return;
    const timer = window.setInterval(
      () => setSelected((current) => (current + 1) % featured.length),
      5000,
    );
    return () => window.clearInterval(timer);
  }, [paused, reduced, featured.length, selected]);
  if (!game) return null;
  const move = (step: number) =>
    setSelected(
      (current) => (current + step + featured.length) % featured.length,
    );

  return (
    <div
      className="desktop-preview"
      aria-label="Preview aplikasi desktop NextGame"
    >
      <div className="dp-titlebar">
        <span>
          NextGame <small>/ Desktop Library</small>
        </span>
        <span>PRODUCT PREVIEW</span>
      </div>
      <div className="dp-body">
        <aside className="dp-sidebar" aria-label="Navigasi preview">
          <Image
            className="dp-logo"
            src="/desktop-app-logo.png"
            alt="NextGame"
            width={46}
            height={46}
          />
          <span className="dp-brand">
            NextGame<span>.</span>
            <small>DESKTOP LIBRARY</small>
          </span>
          <span className="dp-nav-label">YOUR SPACE</span>
          {navigation.map(([label, Icon], index) => (
            <button
              key={label}
              className={`dp-nav ${index === 0 ? "active" : ""}`}
              aria-label={label}
              title={label}
              onClick={onAction}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
          <div className="dp-account">
            <span>P</span>
            <small>
              Player
              <br />
              Preview account
            </small>
          </div>
        </aside>
        <div className="dp-main">
          <header className="dp-header">
            <div>
              <span>YOUR SPACE / MY LIBRARY</span>
              <h3>
                Your library<span>.</span>
              </h3>
            </div>
            <button onClick={onAction}>
              <ArrowsClockwise size={12} /> Muat ulang
            </button>
          </header>
          <div className="dp-toolbar">
            <span>
              Semua game <small>{games.length} judul</small>
            </span>
            <button onClick={onAction}>
              <MagnifyingGlass size={12} /> Cari koleksimu...
            </button>
            <span className="dp-sort">Terakhir ditambahkan</span>
          </div>
          <section
            className="dp-feature"
            aria-roledescription="carousel"
            aria-label="Game unggulan preview"
          >
            {featured.map((item, index) => (
              <div
                key={item.app_id}
                className={`dp-art ${index === selected ? "active" : ""}`}
                aria-hidden={index !== selected}
              >
                <Image
                  src={item.hero}
                  alt=""
                  fill
                  sizes="(max-width: 700px) 90vw, 620px"
                />
              </div>
            ))}
            <div className="dp-shade" />
            <div className="dp-feature-copy">
              <span>
                <i /> DALAM LIBRARY
              </span>
              <h4>{game.name}</h4>
              <button onClick={onAction}>
                Lihat game <ArrowRight size={13} />
              </button>
            </div>
            <div className="dp-controls">
              <button aria-label="Game sebelumnya" onClick={() => move(-1)}>
                <ArrowLeft size={12} />
              </button>
              <div className="dp-dots">
                {featured.map((item, index) => (
                  <button
                    key={item.app_id}
                    aria-label={`Slide ${index + 1}: ${item.name}`}
                    aria-current={selected === index ? "true" : undefined}
                    onClick={() => setSelected(index)}
                  />
                ))}
              </div>
              <span>
                {selected + 1} / {featured.length}
              </span>
              <button aria-label="Game berikutnya" onClick={() => move(1)}>
                <ArrowRight size={12} />
              </button>
              <button
                aria-label={paused ? "Putar slideshow" : "Jeda slideshow"}
                onClick={() => setPaused((current) => !current)}
              >
                {paused ? "Putar" : "Jeda"}
              </button>
            </div>
          </section>
          <div className="dp-collection-heading">
            <h4>
              Koleksi kamu<span>.</span>
            </h4>
            <span>{games.length} game</span>
          </div>
          <div className="dp-collection">
            {games.slice(0, 4).map((item) => (
              <button
                key={item.app_id}
                onClick={() => {
                  const index = featured.findIndex(
                    (g) => g.app_id === item.app_id,
                  );
                  if (index >= 0) setSelected(index);
                }}
              >
                <div className="dp-tile-art">
                  <Image src={item.header} alt="" width={240} height={112} />
                  <span>Dalam library</span>
                </div>
                <small>{item.genres[0] || "STEAM"}</small>
                <strong>{item.name}</strong>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="dp-footer">
        <span>NextGame Desktop</span>
        <span>Preview antarmuka · koleksi ilustratif</span>
      </div>
    </div>
  );
}
