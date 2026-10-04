"use client";

import { useState, type FormEvent } from "react";
import { ArrowUpRight } from "@phosphor-icons/react";
import { entities, validate, type Entity, type Row } from "@/lib/admin/model";
import styles from "./admin.module.css";

export default function RecordEditor({
  entity,
  record,
  onSave,
  busy,
}: {
  entity: Entity;
  record: Row | null;
  onSave: (data: Row) => Promise<void>;
  busy: boolean;
}) {
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const raw: Record<string, unknown> = {};
    try {
      for (const field of entities[entity].fields) {
        if (record && entity === "assets" && field.key === "game_id") continue;
        const value = String(form.get(field.key) || "");
        if (
          field.type === "bytes" &&
          record &&
          !value &&
          !form.has(`clear_${field.key}`)
        )
          continue;
        if (field.type === "password" && !value) continue;
        if (field.type === "bytes" && form.has(`clear_${field.key}`)) {
          raw[field.key] = null;
          continue;
        }
        raw[field.key] =
          field.type === "boolean"
            ? form.has(field.key)
            : field.type === "array"
              ? value
                  .split("|")
                  .map((v) => v.trim())
                  .filter(Boolean)
              : value;
      }
      await onSave(validate(entity, raw, !record));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Perubahan gagal.");
    }
  }
  return (
    <form onSubmit={submit} className={styles.editor}>
      <div className={styles.formGrid}>
        {entities[entity].fields.map((field) => {
          const initial = record?.[field.key] ?? field.default ?? "";
          const value = Array.isArray(initial)
            ? initial.join(" | ")
            : String(initial);
          return (
            <label
              key={field.key}
              className={
                field.type === "long" || field.type === "bytes"
                  ? styles.wide
                  : undefined
              }
            >
              <span>
                {field.label}
                {field.required || (!record && field.type === "password") ? (
                  <b aria-hidden="true"> *</b>
                ) : null}
              </span>
              {field.type === "boolean" ? (
                <span className={styles.checkbox}>
                  <input
                    aria-label={field.label}
                    type="checkbox"
                    name={field.key}
                    defaultChecked={Boolean(initial)}
                  />
                  Aktif
                </span>
              ) : field.type === "long" || field.type === "bytes" ? (
                <textarea
                  aria-label={field.label}
                  name={field.key}
                  defaultValue={value}
                  rows={field.type === "bytes" ? 3 : 4}
                  placeholder={
                    field.type === "bytes" ? "\\x diikuti byte hex" : undefined
                  }
                  spellCheck={false}
                />
              ) : (
                <input
                  aria-label={field.label}
                  name={field.key}
                  type={
                    field.type === "date"
                      ? "date"
                      : field.type === "password"
                        ? "password"
                        : field.type === "number"
                          ? "number"
                          : field.key === "email"
                            ? "email"
                            : "text"
                  }
                  inputMode={field.type === "id" ? "numeric" : undefined}
                  min={field.type === "number" ? 0 : undefined}
                  required={
                    field.required || (!record && field.type === "password")
                  }
                  disabled={Boolean(
                    record && entity === "assets" && field.key === "game_id",
                  )}
                  defaultValue={field.type === "password" ? "" : value}
                  autoComplete={
                    field.type === "password" ? "new-password" : "off"
                  }
                />
              )}
              {field.type === "array" && (
                <small>Pisahkan dengan |, misalnya Action | Adventure.</small>
              )}
              {field.type === "password" && (
                <small>
                  Minimal 12 karakter, maksimal 72 byte.
                  {record ? " Kosongkan untuk mempertahankan password." : ""}
                </small>
              )}
              {field.type === "bytes" && record && (
                <span className={styles.checkbox}>
                  <input
                    aria-label={`Hapus ${field.label}`}
                    type="checkbox"
                    name={`clear_${field.key}`}
                  />
                  Hapus payload ini. Kosong tanpa centang mempertahankan data.
                </span>
              )}
            </label>
          );
        })}
      </div>
      {entity === "users" && (
        <p className={styles.hint}>
          Role code dan nama harus mengikuti mapping aplikasi yang sudah
          digunakan.
        </p>
      )}
      {entity === "admins" && (
        <p className={styles.hint}>
          Admin ini dapat mengelola seluruh workspace, termasuk menambahkan
          admin lain. Mengganti password atau status akan membatalkan session
          akun tersebut.
        </p>
      )}
      {entity === "assets" && (
        <p className={styles.hint}>
          Payload harus sudah terenkripsi. Editor ini menyimpan bytea, tanpa
          mengubah enkripsi.
        </p>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <button className={styles.primary} disabled={busy}>
        {busy ? "Menyimpan…" : record ? "Simpan perubahan" : "Tambah record"}
        <span>
          <ArrowUpRight size={17} weight="light" />
        </span>
      </button>
    </form>
  );
}
