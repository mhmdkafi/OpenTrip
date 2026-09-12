import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchSheetMetadata, fetchSheetRows, parseGoogleSheetsUrl, suggestHeaderMappings } from "@/lib/google";
import { apiError, loadWorkspace, requireWorkspace } from "@/lib/workspace/server";
import { googleAccessToken } from "@/lib/workspace/google-auth";
import { DomainError } from "@/lib/workspace/commands";
export async function POST(request: NextRequest) {
  try {
    const auth = await requireWorkspace();
    const body = z.object({ tripId: z.string().uuid(), spreadsheetUrl: z.string().max(1000), sheetId: z.number().int().nonnegative().optional(), headerRow: z.number().int().min(1).max(100).default(1) }).parse(await request.json());
    const { state } = await loadWorkspace(auth.tenantId);
    if (!state.trips.some(t => t.id === body.tripId)) throw new DomainError("Trip tidak ditemukan.", 404);
    const parsed = parseGoogleSheetsUrl(body.spreadsheetUrl);
    const token = await googleAccessToken(auth.tenantId);
    const metadata = await fetchSheetMetadata(parsed.spreadsheetId, token);
    const sheet = metadata.sheets.find(s => s.sheetId === (body.sheetId ?? parsed.sheetId ?? metadata.sheets[0]?.sheetId));
    if (!sheet) throw new DomainError("Tab tidak ditemukan.");
    const rows = await fetchSheetRows(parsed.spreadsheetId, sheet.title, token, body.headerRow, 25);
    const mapping = suggestHeaderMappings(rows.headers, rows.rows);
    return NextResponse.json({ spreadsheetId: parsed.spreadsheetId, sheetId: sheet.sheetId, sheetTitle: sheet.title, sheets: metadata.sheets, headerRow: body.headerRow, headers: rows.headers, mapping, preview: rows.rows.slice(0, 3).map(r => Object.fromEntries(mapping.filter(m => m.index !== null).map(m => [m.field, r[m.index!] ?? ""]))) });
  } catch (e) { return apiError(e); }
}
