"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  MagnifyingGlass,
  UserCircle,
  Check,
  GameController,
  Receipt,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import { validate, type Row } from "@/lib/admin/model";
import { hasGameAsset, type PreviewStore } from "@/lib/admin/preview";
import styles from "./admin.module.css";

function Picker({
  entity,
  value,
  onChange,
  mode,
  store,
  assetsOnly,
}: {
  entity: "users" | "games";
  value: Row | null;
  onChange: (row: Row | null) => void;
  mode: string;
  store: PreviewStore;
  assetsOnly?: boolean;
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
                  (!assetsOnly || hasGameAsset(store, row.app_id)) &&
                  (String(row[entity === "users" ? "email" : "name"])
                    .toLowerCase()
                    .includes(query.toLowerCase()) ||
                    String(row[entity === "users" ? "user_id" : "app_id"]) ===
                      query),
              )
              .slice(0, 8),
          );
        else {
          const response = await fetch(
            `/api/admin/${entity}?lookup=true${assetsOnly ? "&assets_only=true" : ""}&q=${encodeURIComponent(query)}`,
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
  }, [entity, query, mode, store, assetsOnly]);
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
          <p>{isUser ? "Pemilik transaksi" : "Game yang dibeli"}</p>
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
                {isUser ? "User ID" : "Game ID"} / {id(value)}
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
                      {isUser ? "User ID" : "Game ID"} / {id(row)}
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
                    {isUser
                      ? "Belum ada pengguna"
                      : "Belum ada game dengan asset"}
                  </strong>
                  <p>
                    {isUser
                      ? "Pengguna akan tampil setelah terdaftar melalui service registrasi."
                      : "Hanya game dengan data asset tersedia yang bisa ditambahkan. Coba pencarian lain atau lengkapi Game Assets."}
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

export default function TransactionEditor({
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
          id: record.game_id,
          app_id: record.game_id,
          name: record.game_name,
        }
      : null,
  );
  const [invoiceNumber, setInvoiceNumber] = useState(
    String(record?.invoice_number || ""),
  );
  const [platform, setPlatform] = useState(
    String(record?.platform || "manual"),
  );
  const [isProcessed, setIsProcessed] = useState(
    record ? Boolean(record.is_procces) : false,
  );
  const [isInvoiceUsed, setIsInvoiceUsed] = useState(
    record ? Boolean(record.is_invoice_used) : false,
  );
  const [error, setError] = useState("");

  return (
    <form
      className={`${styles.editor} ${styles.libraryEditor}`}
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        try {
          if (!user) throw new Error("Pilih pengguna terlebih dahulu.");
          if (!game) throw new Error("Pilih game terlebih dahulu.");
          if (!invoiceNumber.trim())
            throw new Error("Nomor invoice wajib diisi.");
          await onSave(
            validate(
              "transactions",
              {
                user_id: user.user_id,
                game_id: game.id,
                invoice_number: invoiceNumber.trim(),
                platform,
                is_procces: isProcessed,
                is_invoice_used: isInvoiceUsed,
              },
              !record,
            ),
          );
        } catch (error) {
          setError(
            error instanceof Error ? error.message : "Transaksi gagal disimpan.",
          );
        }
      }}
    >
      <div className={`${styles.formGrid} ${styles.libraryGrid}`}>
        <Picker
          entity="users"
          value={user}
          onChange={setUser}
          mode={mode}
          store={store}
        />
        <Picker
          entity="games"
          value={game}
          onChange={setGame}
          mode={mode}
          store={store}
          assetsOnly={false}
        />
        <label className={styles.wide}>
          Nomor Invoice
          <input
            aria-label="Nomor invoice"
            type="text"
            required
            value={invoiceNumber}
            onChange={(event) => setInvoiceNumber(event.target.value)}
            className={styles.secondary}
            placeholder="INV/2026/001"
          />
        </label>
        <div className={styles.transactionRow}>
          <label>
            Platform
            <select
              aria-label="Platform"
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
              className={styles.secondary}
            >
              <option value="manual">Manual (admin)</option>
              <option value="qris">QRIS</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            <span className={styles.checkbox}>
              <input
                aria-label="Sudah diproses"
                type="checkbox"
                checked={isProcessed}
                onChange={(event) => setIsProcessed(event.target.checked)}
              />
              Sudah diproses
            </span>
          </label>
          <label>
            <span className={styles.checkbox}>
              <input
                aria-label="Invoice sudah dipakai"
                type="checkbox"
                checked={isInvoiceUsed}
                onChange={(event) => setIsInvoiceUsed(event.target.checked)}
              />
              Invoice terpakai
            </span>
          </label>
        </div>
      </div>
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
            : "Buat transaksi"}
        <span>
          <ArrowUpRight size={17} weight="light" />
        </span>
      </button>
    </form>
  );
}
