import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchSheetMetadata, fetchSheetRows, parseGoogleSheetsUrl } from "@/lib/google";
import { apiError, loadWorkspace, requireWorkspace, saveWorkspace } from "@/lib/workspace/server";
import { googleAccessToken } from "@/lib/workspace/google-auth";
import { DomainError } from "@/lib/workspace/commands";
import { detectSheetHeader, importSpreadsheet } from "@/lib/workspace/auto-import";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireWorkspace();
    const body = z.object({ spreadsheetUrl: z.url().max(1000), revision: z.number().int().nonnegative(), tripId: z.uuid().optional() }).parse(await request.json());
    const parsed = parseGoogleSheetsUrl(body.spreadsheetUrl);
    const current = await loadWorkspace(auth.tenantId);
    if (current.revision !== body.revision) throw new DomainError("Data berubah. Muat ulang sebelum mengimpor.", 409);
    const token=await googleAccessToken(auth.tenantId);
    const metadata = await fetchSheetMetadata(parsed.spreadsheetId, token);
    // A gid in the URL is authoritative; without it, locate the response tab.
    const candidates = parsed.sheetId !== undefined ? metadata.sheets.filter(s => s.sheetId === parsed.sheetId) : [...metadata.sheets].sort((a,b) => Number(/responses|jawaban|respons/i.test(b.title)) - Number(/responses|jawaban|respons/i.test(a.title)));
    if (!candidates.length) throw new DomainError("Tab pada tautan tidak ditemukan.");
    let selected: { sheet: typeof candidates[number]; headerRow: number; prefix: string[][] } | undefined;
    for (const sheet of candidates.slice(0, 10)) {
      const sample = await fetchSheetRows(parsed.spreadsheetId, sheet.title, token, 1, 100);
      try { const values=[sample.headers,...sample.rows]; const headerRow=detectSheetHeader(values).headerRow; selected = { sheet, headerRow, prefix:values.slice(0,headerRow-1) }; break; }
      catch (error) { if (!(error instanceof DomainError)) throw error; }
    }
    if (!selected) throw new DomainError("Header tidak dikenali. Gunakan tautan tab respons dengan kolom Timestamp, Nama Lengkap, Fasilitas, dan Mepo.");
    const data = await fetchSheetRows(parsed.spreadsheetId, selected.sheet.title, token, selected.headerRow, 5001);
    const values = [...selected.prefix, data.headers, ...data.rows];
    const result = importSpreadsheet(current.state, metadata, selected.sheet, values, auth.userId, body.tripId);
    const revision = await saveWorkspace(auth.tenantId, current.revision, result.state, current.exists);
    return NextResponse.json({ ...result, revision });
  } catch (error) { return apiError(error); }
}
