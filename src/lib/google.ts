export type GoogleSheetUrl = {
  spreadsheetId: string;
  sheetId?: number;
};

export type GoogleDriveUrl = {
  fileId: string;
};

export type SheetMetadata = {
  locale?: string;
  spreadsheetId: string;
  title: string;
  sheets: Array<{ sheetId: number; title: string; rowCount?: number; columnCount?: number }>;
};

export type HeaderField = "registered_at" | "raw_name" | "facility" | "meeting_point" | "raincoat_option" | "proof_refs" | "contact_phone";

export type HeaderSuggestion = {
  field: HeaderField;
  header: string | null;
  index: number | null;
  confidence: number;
  required: boolean;
  reason: string;
};

export class GoogleApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 500, code = "google_api_error") {
    super(message);
    this.name = "GoogleApiError";
    this.status = status;
    this.code = code;
  }
}

const sheetAliases: Record<HeaderField, string[]> = {
  registered_at: ["timestamp", "registered at", "tanggal daftar", "waktu daftar", "submitted at"],
  raw_name: ["nama lengkap", "nama", "name", "full name", "peserta"],
  facility: ["fasilitas", "facility", "paket", "tipe", "layanan"],
  meeting_point: ["mepo", "meeting point", "titik kumpul", "pickup", "pick up"],
  raincoat_option: ["jas hujan", "raincoat", "ponco"],
  proof_refs: ["bukti transfer", "registrasi", "upload bukti", "proof", "payment proof", "file upload"],
  contact_phone: ["no whatsapp", "whatsapp", "wa", "phone", "telepon", "nomor hp", "contact phone"],
};

const requiredFields = new Set<HeaderField>(["registered_at", "raw_name", "facility", "meeting_point"]);

export function parseGoogleSheetsUrl(input: string): GoogleSheetUrl {
  const value = input.trim();
  const direct = value.match(/^[a-zA-Z0-9-_]{20,}$/);
  if (direct) return { spreadsheetId: value };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new GoogleApiError("Invalid spreadsheet URL.", 400, "invalid_sheet_url");
  }

  if (url.protocol !== "https:" || url.hostname !== "docs.google.com") throw new GoogleApiError("Gunakan URL Google Sheets resmi (https://docs.google.com).", 400, "invalid_host");
  const spreadsheetId = url.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1];
  if (!spreadsheetId) throw new GoogleApiError("The spreadsheet URL has no spreadsheet ID.", 400, "missing_spreadsheet_id");

  const gid = url.searchParams.get("gid") ?? url.hash.match(/gid=([0-9]+)/)?.[1];
  return { spreadsheetId, sheetId: gid ? Number(gid) : undefined };
}

export function parseGoogleDriveUrl(input: string): GoogleDriveUrl {
  const value = input.trim();
  if (/^[a-zA-Z0-9-_]{20,}$/.test(value)) return { fileId: value };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new GoogleApiError("Invalid Drive URL.", 400, "invalid_drive_url");
  }

  if (url.protocol !== "https:" || !["drive.google.com", "docs.google.com"].includes(url.hostname)) throw new GoogleApiError("Gunakan URL Google Drive resmi.", 400, "invalid_host");
  const fileId = url.pathname.match(/\/file\/d\/([a-zA-Z0-9-_]+)/)?.[1] ?? url.searchParams.get("id");
  if (fileId && !/^[a-zA-Z0-9_-]+$/.test(fileId)) throw new GoogleApiError("Invalid file ID.", 400, "invalid_file_id");
  if (!fileId) throw new GoogleApiError("The Drive URL has no file ID.", 400, "missing_file_id");
  return { fileId };
}

export function suggestHeaderMappings(headers: string[], sampleRows: string[][] = []): HeaderSuggestion[] {
  const normalizedHeaders = headers.map(normalizeHeader);
  return (Object.keys(sheetAliases) as HeaderField[]).map((field) => {
    const aliases = sheetAliases[field].map(normalizeHeader);
    let index = normalizedHeaders.findIndex((header) => aliases.includes(header));
    let confidence = index >= 0 ? 0.95 : 0;
    let reason = index >= 0 ? "header alias matched" : "not found";

    if (index < 0) {
      const partial = normalizedHeaders.findIndex((header) => header.length > 0 && aliases.some((alias) => header.includes(alias) || alias.includes(header)));
      if (partial >= 0) {
        index = partial;
        confidence = 0.7;
        reason = "header resembles alias";
      }
    }

    if (index < 0) {
      const inferred = inferByValueShape(field, sampleRows);
      if (inferred !== null) {
        index = inferred;
        confidence = 0.55;
        reason = "value shape matched";
      }
    }

    return { field, header: index === -1 ? null : headers[index], index: index === -1 ? null : index, confidence, required: requiredFields.has(field), reason };
  });
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9 +]/g, "").trim();
}

function inferByValueShape(field: HeaderField, rows: string[][]) {
  if (!rows.length) return null;
  const width = Math.max(...rows.map((row) => row.length));
  let best = { index: -1, score: 0 };
  for (let index = 0; index < width; index += 1) {
    const values = rows.map((row) => row[index] ?? "").filter(Boolean).slice(0, 20);
    const score = values.filter((value) => matchesFieldShape(field, value)).length;
    if (score > best.score) best = { index, score };
  }
  return best.score >= Math.max(2, Math.ceil(Math.min(rows.length, 20) * 0.4)) ? best.index : null;
}

function matchesFieldShape(field: HeaderField, value: string) {
  if (field === "registered_at") return !Number.isNaN(Date.parse(value));
  if (field === "contact_phone") return /(?:\+62|62|0)\d{8,13}/.test(value.replace(/[\s-]/g, ""));
  if (field === "proof_refs") return /https?:\/\//.test(value) || /^[a-zA-Z0-9-_]{20,}$/.test(value.trim());
  if (field === "raincoat_option") return /ya|tidak|yes|no|jas|raincoat/i.test(value);
  return false;
}
