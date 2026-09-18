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

export type SheetRows = {
  headers: string[];
  rows: string[][];
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
let lastRequestAt = 0;

export function parseGoogleSheetsUrl(input: string): GoogleSheetUrl {
  const value = input.trim();
  const direct = value.match(/^[a-zA-Z0-9-_]{20,}$/);
  if (direct) return { spreadsheetId: value };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new GoogleApiError("URL spreadsheet tidak valid.", 400, "invalid_sheet_url");
  }

  if (url.protocol !== "https:" || url.hostname !== "docs.google.com") throw new GoogleApiError("Gunakan URL Google Sheets resmi (https://docs.google.com).", 400, "invalid_host");
  const spreadsheetId = url.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1];
  if (!spreadsheetId) throw new GoogleApiError("URL spreadsheet tidak berisi spreadsheet ID.", 400, "missing_spreadsheet_id");

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
    throw new GoogleApiError("URL Drive tidak valid.", 400, "invalid_drive_url");
  }

  if (url.protocol !== "https:" || !["drive.google.com", "docs.google.com"].includes(url.hostname)) throw new GoogleApiError("Gunakan URL Google Drive resmi.", 400, "invalid_host");
  const fileId = url.pathname.match(/\/file\/d\/([a-zA-Z0-9-_]+)/)?.[1] ?? url.searchParams.get("id");
  if (fileId && !/^[a-zA-Z0-9_-]+$/.test(fileId)) throw new GoogleApiError("File ID tidak valid.", 400, "invalid_file_id");
  if (!fileId) throw new GoogleApiError("URL Drive tidak berisi file ID.", 400, "missing_file_id");
  return { fileId };
}

export function suggestHeaderMappings(headers: string[], sampleRows: string[][] = []): HeaderSuggestion[] {
  const normalizedHeaders = headers.map(normalizeHeader);
  return (Object.keys(sheetAliases) as HeaderField[]).map((field) => {
    const aliases = sheetAliases[field].map(normalizeHeader);
    let index = normalizedHeaders.findIndex((header) => aliases.includes(header));
    let confidence = index >= 0 ? 0.95 : 0;
    let reason = index >= 0 ? "alias header cocok" : "tidak ditemukan";

    if (index < 0) {
      const partial = normalizedHeaders.findIndex((header) => header.length > 0 && aliases.some((alias) => header.includes(alias) || alias.includes(header)));
      if (partial >= 0) {
        index = partial;
        confidence = 0.7;
        reason = "header mirip alias";
      }
    }

    if (index < 0) {
      const inferred = inferByValueShape(field, sampleRows);
      if (inferred !== null) {
        index = inferred;
        confidence = 0.55;
        reason = "bentuk nilai cocok";
      }
    }

    return { field, header: index === -1 ? null : headers[index], index: index === -1 ? null : index, confidence, required: requiredFields.has(field), reason };
  });
}

export async function fetchSheetMetadata(spreadsheetId: string, accessToken: string): Promise<SheetMetadata> {
  const data = await googleFetch<{ properties?: { title?: string; locale?: string }; sheets?: Array<{ properties?: { sheetId?: number; title?: string; gridProperties?: { rowCount?: number; columnCount?: number } } }> }>(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,properties.locale,sheets.properties`, accessToken);
  return {
    spreadsheetId,
    title: data.properties?.title ?? spreadsheetId,
    locale: data.properties?.locale,
    sheets: (data.sheets ?? []).map((sheet) => ({
      sheetId: sheet.properties?.sheetId ?? 0,
      title: sheet.properties?.title ?? "Sheet",
      rowCount: sheet.properties?.gridProperties?.rowCount,
      columnCount: sheet.properties?.gridProperties?.columnCount,
    })),
  };
}

export async function fetchSheetRows(spreadsheetId: string, sheetTitle: string, accessToken: string, headerRow = 1, maxRows = 500): Promise<SheetRows> {
  const range = `${escapeSheetTitle(sheetTitle)}!A${headerRow}:ZZ${headerRow + maxRows}`;
  const data = await googleFetch<{ values?: string[][] }>(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`, accessToken);
  const values = data.values ?? [];
  return { headers: values[0] ?? [], rows: values.slice(1) };
}

export async function verifyDriveEvidence(input: string, accessToken: string) {
  const { fileId } = parseGoogleDriveUrl(input);
  const data = await googleFetch<{ id: string; name?: string; mimeType?: string; webViewLink?: string; size?: string }>(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,webViewLink,size`, accessToken);
  return { fileId: data.id, name: data.name ?? data.id, mimeType: data.mimeType, webViewLink: data.webViewLink, size: data.size ? Number(data.size) : undefined, accessible: true };
}

async function googleFetch<T>(url: string, accessToken: string, attempt = 0): Promise<T> {
  await throttle();
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (response.status === 429 && attempt < 4) {
    await sleep(2 ** attempt * 500);
    return googleFetch<T>(url, accessToken, attempt + 1);
  }
  if (!response.ok) {
    throw new GoogleApiError(resolveGoogleErrorMessage(response.status), response.status, "google_request_failed");
  }
  return response.json() as Promise<T>;
}

async function throttle() {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < 250) await sleep(250 - elapsed);
  lastRequestAt = Date.now();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function escapeSheetTitle(title: string) {
  return `'${title.replace(/'/g, "''")}'`;
}

function resolveGoogleErrorMessage(status: number) {
  if (status === 401) return "Token Google tidak valid atau sudah dicabut.";
  if (status === 403) return "Akun Google tidak memiliki izin membaca file.";
  if (status === 404) return "File atau tab Google tidak ditemukan.";
  if (status === 429) return "Kuota Google API terlampaui. Coba lagi nanti.";
  return "Google API gagal dipanggil.";
}
