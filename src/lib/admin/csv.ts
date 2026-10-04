import { positiveId, validate, type Row } from "./model";

export type ImportRow = {
  action: "INSERT" | "UPSERT" | "DELETE";
  data: Row;
  row: number;
};
export type ImportPreview = {
  rows: ImportRow[];
  errors: { row: number; message: string }[];
  headers: string[];
};
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let closed = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
        closed = true;
      } else field += char;
      continue;
    }
    if (char === '"') {
      if (field || closed) throw new Error("CSV memiliki quote tidak valid.");
      quoted = true;
    } else if (char === "," || char === "\n" || char === "\r") {
      row.push(field);
      field = "";
      closed = false;
      if (char !== ",") {
        if (row.some((v) => v.trim())) rows.push(row);
        row = [];
        if (char === "\r" && text[i + 1] === "\n") i++;
      }
    } else {
      if (closed && char.trim())
        throw new Error("Ada teks setelah penutup quote CSV.");
      if (!closed) field += char;
    }
  }
  if (quoted) throw new Error("Quote CSV belum ditutup.");
  row.push(field);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}
function arrayValue(text: string): string[] {
  if (!text.trim()) return [];
  if (text.trim().startsWith("[")) {
    const arr = JSON.parse(text);
    if (!Array.isArray(arr) || arr.some((v) => typeof v !== "string"))
      throw new Error("Array CSV harus berupa teks.");
    return arr;
  }
  if (text.startsWith("{") && text.endsWith("}")) {
    const result: string[] = [];
    let part = "";
    let quote = false;
    for (let i = 1; i < text.length - 1; i++) {
      const c = text[i];
      if (c === "\\") {
        if (++i >= text.length - 1)
          throw new Error("Escape array tidak valid.");
        part += text[i];
      } else if (c === '"') quote = !quote;
      else if (c === "," && !quote) {
        result.push(part.trim());
        part = "";
      } else part += c;
    }
    if (quote) throw new Error("Quote array tidak valid.");
    if (part || result.length) result.push(part.trim());
    return result;
  }
  return text
    .split("|")
    .map((v) => v.trim())
    .filter(Boolean);
}
export function previewCsv(
  text: string,
  entity: "games" | "assets",
): ImportPreview {
  if (text.length > 5_000_000) throw new Error("CSV maksimal 5 MB.");
  const parsed = parseCsv(text);
  if (parsed.length < 2) throw new Error("CSV harus berisi header dan data.");
  if (parsed.length > 501)
    throw new Error(
      "Maksimal 500 baris per import. Pisahkan file yang lebih besar.",
    );
  const headers = parsed[0]
    .map((h) => h.trim().toLowerCase())
    .map((h) =>
      entity === "assets"
        ? { metadata: "meta_data", encryption: "encryption_version" }[h] || h
        : h,
    );
  if (new Set(headers).size !== headers.length)
    throw new Error("Header CSV duplikat.");
  if (!headers.includes(entity === "games" ? "app_id" : "game_id"))
    throw new Error(
      entity === "games"
        ? "Import Games membutuhkan app_id dan name. Daftar game_id saja tidak berisi metadata game."
        : "Import Assets membutuhkan game_id.",
    );
  if (entity === "assets" && !headers.includes("action"))
    throw new Error(
      "Import Assets wajib memiliki action eksplisit: INSERT, UPSERT, atau DELETE.",
    );
  const rows: ImportRow[] = [];
  const errors: ImportPreview["errors"] = [];
  const seen = new Set<string>();
  parsed.slice(1).forEach((values, index) => {
    const row = index + 2;
    try {
      if (values.length !== headers.length)
        throw new Error("Jumlah kolom tidak sama dengan header.");
      const data: Record<string, unknown> = Object.fromEntries(
        headers.map((h, i) => [h, values[i]]),
      );
      const action =
        entity === "assets"
          ? String(data.action).trim().toUpperCase()
          : "UPSERT";
      if (!["INSERT", "UPSERT", "DELETE"].includes(action))
        throw new Error("Action harus INSERT, UPSERT, atau DELETE.");
      const key = entity === "games" ? "app_id" : "game_id";
      data[key] = positiveId(data[key]);
      if (seen.has(String(data[key])))
        throw new Error(`ID ${data[key]} duplikat dalam file.`);
      seen.add(String(data[key]));
      for (const k of ["genre", "categories", "publishers"])
        if (k in data) data[k] = arrayValue(String(data[k]));
      if (entity === "assets" && data.encryption_version)
        data.encryption_version = String(data.encryption_version).replace(
          /^v/i,
          "",
        );
      const normalized =
        action === "DELETE"
          ? { game_id: String(data.game_id) }
          : validate(entity, data, true);
      rows.push({
        row,
        action: action as ImportRow["action"],
        data: normalized,
      });
    } catch (error) {
      errors.push({
        row,
        message: error instanceof Error ? error.message : "Data tidak valid.",
      });
    }
  });
  return { rows, errors, headers };
}
