"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  MagnifyingGlass,
  UserCircle,
  Check,
  GameController,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import { validate, type Row } from "@/lib/admin/model";
import type { PreviewStore } from "@/lib/admin/preview";
import styles from "./admin.module.css";

function Picker({
  entity,
  value,
  onChange,
  mode,
  store,
}: {
  entity: "users" | "games";
  value: Row | null;
  onChange: (row: Row | null) => void;
  mode: string;
  store: PreviewStore;
}) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setError("");
        if (mode === "preview")
          setRows(
            store[entity]
              .filter(
                (row) =>
                  String(row[entity === "users" ? "email" : "name"])
                    .toLowerCase()
                    .includes(query.toLowerCase()) ||
                  String(row[entity === "users" ? "user_id" : "app_id"]) ===
                    query,
              )
              .slice(0, 8),
          );
        else {
          const response = await fetch(
            `/api/admin/${entity}?q=${encodeURIComponent(query)}`,
            { signal: controller.signal },
          );
          const result = await response.json();
          if (!response.ok) throw new Error(result.error);
          setRows(result.rows.slice(0, 8));
        }
      } catch (error) {
        if (!controller.signal.aborted)
          setError(error instanceof Error ? error.message : "Pencarian gagal.");
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [entity, query, mode, store]);
  const reduced = useReducedMotion();
  const isUser = entity === "users";
  const title = (row: Row) => String(row[isUser ? "email" : "name"] || "?");
  const id = (row: Row) => String(row[isUser ? "user_id" : "app_id"]);
  function visual(row: Row) {
    return isUser ? (
      <span className={styles.libraryAvatar}>
        <UserCircle size={28} weight="light" />
      </span>
    ) : (
      <span
        className={styles.libraryArtwork}
        style={{
          backgroundImage: `url("${String(row.image || "/steam/" + row.app_id + "-header.jpg").replaceAll('"', "%22")}")`,
        }}
      />
    );
  }
  return (
    <section
      className={styles.libraryPicker}
      aria-label={isUser ? "Pilih pengguna" : "Pilih game"}
    >
      <header>
        <span className={styles.libraryStep}>{isUser ? "01" : "02"}</span>
        <div>
          <h3>{isUser ? "Pilih pengguna" : "Pilih game"}</h3>
          <p>{isUser ? "Penerima akses game" : "Dari koleksi Steam"}</p>
        </div>
        {isUser ? (
          <UserCircle size={22} weight="light" />
        ) : (
          <GameController size={22} weight="light" />
        )}
      </header>
      <div className={styles.libraryPickerCore}>
        {value ? (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={styles.librarySelected}
          >
            {visual(value)}
            <div>
              <strong>{title(value)}</strong>
              <small>
                {isUser ? "User ID" : "Steam AppID"} / {id(value)}
              </small>
            </div>
            <Check size={18} weight="light" />
            <button type="button" onClick={() => onChange(null)}>
              Ganti
            </button>
          </motion.div>
        ) : (
          <>
            <label className={styles.librarySearch}>
              <MagnifyingGlass size={18} weight="light" />
              <input
                aria-label={
                  isUser ? "Cari pengguna existing" : "Cari game katalog"
                }
                placeholder={
                  isUser ? "Email atau User ID" : "Nama game atau AppID"
                }
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div className={styles.libraryResults}>
              {rows.map((row, index) => (
                <motion.button
                  initial={reduced ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.025,
                    ease: [0.32, 0.72, 0, 1],
                  }}
                  type="button"
                  className={styles.libraryOption}
                  key={id(row)}
                  onClick={() => onChange(row)}
                >
                  {visual(row)}
                  <span>
                    <strong>{title(row)}</strong>
                    <small>
                      {isUser ? "User ID" : "Steam AppID"} / {id(row)}
                    </small>
                  </span>
                  <ArrowUpRight size={17} weight="light" />
                </motion.button>
              ))}
              {!rows.length && !error && (
                <div className={styles.libraryEmpty}>
                  {isUser ? (
                    <UserCircle size={32} weight="light" />
                  ) : (
                    <GameController size={32} weight="light" />
                  )}
                  <strong>
                    {isUser ? "Belum ada pengguna" : "Game tidak ditemukan"}
                  </strong>
                  <p>
                    {isUser
                      ? "Pengguna akan tampil setelah terdaftar melalui service registrasi."
                      : "Coba nama game atau Steam AppID lain."}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
      </div>
    </section>
  );
}

export default function LibraryEditor({
  record,
  mode,
  store,
  busy,
  onSave,
}: {
  record: Row | null;
  mode: string;
  store: PreviewStore;
  busy: boolean;
  onSave: (data: Row) => Promise<void>;
}) {
  const [user, setUser] = useState<Row | null>(
    record ? { user_id: record.user_id, email: record.user_email } : null,
  );
  const [game, setGame] = useState<Row | null>(
    record
      ? {
          id: record.catalog_id,
          app_id: record.app_id_buy,
          name: record.game_name,
        }
      : null,
  );
  const [source, setSource] = useState(
    record?.purchase_id ? "purchase" : "special",
  );
  const [purchase, setPurchase] = useState(String(record?.purchase_id || ""));
  const [invoices, setInvoices] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const linked = Boolean(record?.purchase_id);
  useEffect(() => {
    const controller = new AbortController();
    Promise.resolve().then(async () => {
      if (!user || !game || source !== "purchase") {
        setInvoices([]);
        return;
      }
      try {
        if (mode === "preview")
          setInvoices(
            store.transactions.filter(
              (row) => row.user_id === user.user_id && row.game_id === game.id,
            ),
          );
        else {
          const response = await fetch(
            `/api/admin/transactions?user_id=${user.user_id}&game_id=${game.id}`,
            { signal: controller.signal },
          );
          const result = await response.json();
          if (!response.ok) throw new Error(result.error);
          setInvoices(result.rows);
        }
      } catch (error) {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error ? error.message : "Invoice gagal dimuat.",
          );
      }
    });
    return () => controller.abort();
  }, [user, game, source, mode, store]);
  return (
    <form
      className={`${styles.editor} ${styles.libraryEditor}`}
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        try {
          if (!user || !game)
            throw new Error("Pilih pengguna dan game terlebih dahulu.");
          if (source === "purchase" && !purchase)
            throw new Error("Pilih invoice pembelian.");
          await onSave(
            validate(
              "libraries",
              {
                user_id: user.user_id,
                app_id_buy: game.app_id,
                purchase_id: source === "purchase" ? purchase : null,
                is_from_free_claim: record?.is_from_free_claim ?? false,
              },
              !record,
            ),
          );
        } catch (error) {
          setError(
            error instanceof Error ? error.message : "Game gagal ditambahkan.",
          );
        }
      }}
    >
      <div className={`${styles.formGrid} ${styles.libraryGrid}`}>
        {linked ? (
          <div className={styles.wide}>
            <p className={styles.hint}>
              Game ini sudah terhubung ke invoice. Pengguna, game, dan invoice
              dipertahankan.
            </p>
            <p>
              {String(record?.user_email || record?.user_id)} ·{" "}
              {String(record?.game_name || record?.app_id_buy)} ·{" "}
              {String(record?.invoice_number || record?.purchase_id)}
            </p>
          </div>
        ) : (
          <>
            <Picker
              entity="users"
              value={user}
              onChange={(value) => {
                setUser(value);
                setPurchase("");
              }}
              mode={mode}
              store={store}
            />
            <Picker
              entity="games"
              value={game}
              onChange={(value) => {
                setGame(value);
                setPurchase("");
              }}
              mode={mode}
              store={store}
            />
          </>
        )}
        <label className={`${styles.wide} ${styles.librarySource}`}>
          Sumber game
          <select
            aria-label="Sumber game"
            disabled={linked}
            value={source}
            onChange={(event) => {
              setSource(event.target.value);
              setPurchase("");
              setError("");
            }}
            className={styles.secondary}
          >
            <option value="special">
              Special / pemberian manual tanpa invoice
            </option>
            <option value="purchase">Pembelian dengan invoice</option>
          </select>
        </label>
        {source === "purchase" && (
          <label className={styles.wide}>
            Invoice pembelian
            <select
              aria-label="Invoice pembelian"
              required
              disabled={linked}
              value={purchase}
              onChange={(event) => setPurchase(event.target.value)}
              className={styles.secondary}
            >
              <option value="">Pilih invoice</option>
              {linked && (
                <option value={String(record?.purchase_id)}>
                  {String(record?.invoice_number || record?.purchase_id)}
                </option>
              )}
              {!linked &&
                invoices.map((row) => (
                  <option key={String(row.id)} value={String(row.id)}>
                    {String(row.invoice_number)} · #{String(row.id)}
                  </option>
                ))}
            </select>
            <small>
              Invoice harus milik pengguna ini dan sesuai game. Status processed
              / used diubah manual pada Transactions.
            </small>
          </label>
        )}
      </div>
      {source === "special" && (
        <p className={styles.hint}>
          Game diberikan langsung ke pengguna existing. Status transaksi tidak
          berubah.
        </p>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <button disabled={busy} className={styles.primary}>
        {busy
          ? "Menyimpan…"
          : record
            ? "Simpan perubahan"
            : "Tambahkan ke library"}
        <span>
          <ArrowUpRight size={17} weight="light" />
        </span>
      </button>
    </form>
  );
}
