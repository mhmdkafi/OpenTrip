import { fetchSheetMetadata, fetchSheetRows, parseGoogleSheetsUrl } from "@/lib/google";
import { googleAccessToken } from "./google-auth";
import { detectSheetHeader } from "./auto-import";
import { DomainError } from "./commands";

export async function readAuthenticatedSheet(tenantId: string, spreadsheetUrl: string) {
  const parsed = parseGoogleSheetsUrl(spreadsheetUrl);
  // Never fall back to public scraping: a missing/revoked connection must be
  // visible so manual and scheduled imports use the same tenant credentials.
  const token = await googleAccessToken(tenantId);
  const metadata = await fetchSheetMetadata(parsed.spreadsheetId, token);
  const candidates = parsed.sheetId !== undefined
    ? metadata.sheets.filter(sheet => sheet.sheetId === parsed.sheetId)
    : [...metadata.sheets].sort((a, b) => Number(/responses|jawaban|respons/i.test(b.title)) - Number(/responses|jawaban|respons/i.test(a.title)));
  if (!candidates.length) throw new DomainError("The tab in this link was not found.");
  for (const sheet of candidates.slice(0, 10)) {
    const sample = await fetchSheetRows(parsed.spreadsheetId, sheet.title, token, 1, 100);
    const preview = [sample.headers, ...sample.rows];
    let headerRow: number;
    try { headerRow = detectSheetHeader(preview).headerRow; }
    catch (error) { if (error instanceof DomainError) continue; throw error; }
    const data = await fetchSheetRows(parsed.spreadsheetId, sheet.title, token, headerRow, 5001);
    if (data.rows.length > 5000) throw new DomainError("Import exceeds the 5,000-response limit. Split sources per trip.");
    return { metadata, sheet, values: [...preview.slice(0, headerRow - 1), data.headers, ...data.rows] };
  }
  throw new DomainError("Headers not recognized. Use the responses tab link with Timestamp, Nama Lengkap, Fasilitas, and Mepo columns.");
}
