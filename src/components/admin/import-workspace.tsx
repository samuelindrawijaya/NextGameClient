"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  FileCsv,
  UploadSimple,
} from "@phosphor-icons/react";
import { previewCsv, type ImportPreview } from "@/lib/admin/csv";
import type { Row } from "@/lib/admin/model";
import styles from "./admin.module.css";

export default function ImportWorkspace({
  entity,
  busy,
  onImport,
}: {
  entity: "games" | "assets";
  busy: boolean;
  onImport: (
    csv: string,
    mode: string,
    filename: string,
    confirm: boolean,
  ) => Promise<Row>;
}) {
  const [csv, setCsv] = useState("");
  const [filename, setFilename] = useState("");
  const [mode, setMode] = useState("INSERT_ONLY");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<Row | null>(null);
  const deletes =
    preview?.rows.filter((row) => row.action === "DELETE").length || 0;
  function template() {
    const text =
      entity === "games"
        ? "app_id,name,image,description,genre,release_date,categories,publishers\n"
        : "game_id,action,lua_data,metadata,encryption\n";
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${entity}-template.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
  function inspect(text: string, name: string) {
    setCsv(text);
    setFilename(name);
    setError("");
    setResult(null);
    setConfirm(false);
    setPreview(null);
    try {
      setPreview(previewCsv(text, entity));
    } catch (error) {
      setError(error instanceof Error ? error.message : "CSV tidak valid.");
    }
  }
  return (
    <div className={styles.importGrid}>
      <div className={styles.frame}>
        <div className={styles.core}>
          <span className={styles.eyebrow}>01 / PREPARE YOUR FILE</span>
          <h2>
            Masukkan katalog.
            <br />
            Tetap pegang kendali.
          </h2>
          <p>
            Preview setiap baris sebelum import. Maksimal 500 baris dan 5 MB per
            file.
          </p>
          <label className={styles.dropzone}>
            <UploadSimple size={35} weight="light" />
            <strong>{filename || "Pilih file CSV"}</strong>
            <span>CSV UTF-8 · header wajib disertakan</span>
            <input
              aria-label="Upload CSV"
              type="file"
              accept=".csv,text/csv"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (file.size > 5_000_000) {
                  setError("CSV maksimal 5 MB.");
                  return;
                }
                inspect(await file.text(), file.name);
              }}
            />
          </label>
          <button className={styles.secondary} onClick={template}>
            <ArrowDown size={16} weight="light" />
            Download template
          </button>
          <details className={styles.paste}>
            <summary>Atau paste isi CSV</summary>
            <textarea
              aria-label="Isi CSV"
              value={csv}
              onChange={(event) => {
                setCsv(event.target.value);
                setPreview(null);
                setResult(null);
              }}
              rows={7}
              spellCheck={false}
            />
            <button
              className={styles.secondary}
              onClick={() => inspect(csv, "pasted.csv")}
            >
              Validasi CSV
            </button>
          </details>
        </div>
      </div>
      <div className={styles.frame}>
        <div className={styles.core}>
          <span className={styles.eyebrow}>02 / IMPORT RULES</span>
          <h2>
            {entity === "games"
              ? "App ID sebagai acuan."
              : "Action di setiap baris."}
          </h2>
          {entity === "games" ? (
            <>
              <label className={styles.field}>
                Mode import
                <select
                  value={mode}
                  onChange={(event) => setMode(event.target.value)}
                >
                  <option value="INSERT_ONLY">
                    INSERT ONLY — skip App ID yang ada
                  </option>
                  <option value="UPSERT">
                    UPSERT — update App ID yang ada
                  </option>
                </select>
              </label>
              <p>
                {mode === "INSERT_ONLY"
                  ? "Game yang sudah ada dipertahankan. Hanya App ID baru yang ditambahkan."
                  : "Kolom yang disertakan dalam CSV akan memperbarui game dengan App ID yang sama, termasuk nilai kosong."}
              </p>
              <p className={styles.hint}>
                Wajib: app_id, name. Array menerima JSON, PostgreSQL array, atau
                pemisah |. Kolom id tidak diimport; database membentuk identity
                otomatis.
              </p>
            </>
          ) : (
            <>
              <div className={styles.rule}>
                <b>INSERT</b>
                <span>Tambah baru; ID yang ada di-skip.</span>
              </div>
              <div className={styles.rule}>
                <b>UPSERT</b>
                <span>Tambah atau perbarui payload yang disertakan.</span>
              </div>
              <div className={styles.rule}>
                <b>DELETE</b>
                <span>Hapus hanya dengan action dan konfirmasi eksplisit.</span>
              </div>
              <p className={styles.hint}>
                Wajib: game_id, action. metadata → meta_data; encryption →
                encryption_version. Payload memakai bytea hex (\x...). Field
                kosong pada UPSERT mengosongkan payload, bukan menghapus record.
              </p>
            </>
          )}
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          {preview && (
            <>
              <div className={styles.previewSummary}>
                <FileCsv size={23} weight="light" />
                <strong>{preview.rows.length} baris valid</strong>
                <span>{preview.errors.length} error</span>
              </div>
              {preview.errors.length > 0 && (
                <ul className={styles.error} role="alert">
                  {preview.errors.slice(0, 8).map((error) => (
                    <li key={error.row}>
                      Baris {error.row}: {error.message}
                    </li>
                  ))}
                </ul>
              )}
              {deletes > 0 && (
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={confirm}
                    onChange={(event) => setConfirm(event.target.checked)}
                  />
                  Saya konfirmasi penghapusan {deletes} asset.
                </label>
              )}
              <button
                className={styles.primary}
                disabled={
                  busy ||
                  preview.errors.length > 0 ||
                  !preview.rows.length ||
                  (deletes > 0 && !confirm)
                }
                onClick={async () => {
                  setError("");
                  try {
                    setResult(await onImport(csv, mode, filename, confirm));
                  } catch (error) {
                    setError(
                      error instanceof Error ? error.message : "Import gagal.",
                    );
                  }
                }}
              >
                {busy ? "Mengimport…" : "Jalankan import"}
                <span>
                  <ArrowUpRight size={18} weight="light" />
                </span>
              </button>
            </>
          )}
        </div>
      </div>
      {preview && (
        <div className={`${styles.frame} ${styles.wide}`}>
          <div className={styles.core}>
            <div className={styles.cardTitle}>
              <h3>Preview file</h3>
              <span>5 baris pertama · {filename}</span>
            </div>
            <div className={styles.tableScroll}>
              <table>
                <thead>
                  <tr>
                    <th>Baris</th>
                    <th>Action</th>
                    <th>{entity === "games" ? "App ID" : "Game ID"}</th>
                    <th>{entity === "games" ? "Name" : "Encryption"}</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 5).map((row) => (
                    <tr key={row.row}>
                      <td>{row.row}</td>
                      <td>
                        <span className={styles.badge}>
                          {entity === "games" ? mode : row.action}
                        </span>
                      </td>
                      <td>
                        {String(
                          row.data[entity === "games" ? "app_id" : "game_id"],
                        )}
                      </td>
                      <td>
                        {String(
                          row.data[
                            entity === "games" ? "name" : "encryption_version"
                          ] || "—",
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {result && (
        <div className={`${styles.frame} ${styles.wide}`}>
          <div className={styles.core}>
            <div className={styles.cardTitle}>
              <h3>Hasil import #{String(result.id)}</h3>
              <span role="status">
                {Array.isArray(result.errors) && result.errors.length
                  ? "Selesai dengan error. Baris yang berhasil tetap tersimpan."
                  : "Import selesai"}
              </span>
            </div>
            <div className={styles.resultGrid}>
              {["inserted", "updated", "skipped", "deleted"].map((key) => (
                <div key={key}>
                  <strong>{String(result[`${key}_count`] || 0)}</strong>
                  <span>{key}</span>
                </div>
              ))}
            </div>
            {Array.isArray(result.errors) && result.errors.length > 0 && (
              <pre className={styles.error}>
                {JSON.stringify(result.errors, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
