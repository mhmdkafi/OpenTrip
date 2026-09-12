import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchSheetMetadata, fetchSheetRows } from "@/lib/google";
import { apiError, loadWorkspace, requireWorkspace, saveWorkspace } from "@/lib/workspace/server";
import { googleAccessToken } from "@/lib/workspace/google-auth";
import { DomainError } from "@/lib/workspace/commands";
import { importFields, importRows } from "@/lib/workspace/import";
export async function POST(request: NextRequest) {
  try {
    const auth = await requireWorkspace();
    const body = z.object({ tripId: z.string().uuid(), revision: z.number().int(), spreadsheetId: z.string().regex(/^[\w-]{20,}$/), sheetId: z.number().int().nonnegative(), headerRow: z.number().int().min(1).max(100), headers: z.array(z.string()), mapping: z.partialRecord(z.enum(importFields), z.number().int().min(0).max(701)) }).parse(await request.json());
    const current = await loadWorkspace(auth.tenantId);
    if (body.revision !== current.revision) throw new DomainError("Data berubah. Muat ulang sebelum sinkronisasi.", 409);
    if (!current.state.trips.some(t => t.id === body.tripId)) throw new DomainError("Trip tidak ditemukan.", 404);
    for (const f of ["registered_at", "raw_name", "facility", "meeting_point"] as const) if (body.mapping[f] === undefined) throw new DomainError(`Mapping ${f} wajib dipilih.`);
    const indexes = Object.values(body.mapping);
    if (new Set(indexes).size !== indexes.length) throw new DomainError("Satu kolom tidak boleh dipetakan ke dua field.");
    if (current.state.sources.some(s => s.spreadsheetId === body.spreadsheetId && s.sheetId === body.sheetId && s.tripId !== body.tripId)) throw new DomainError("Sumber ini sudah terhubung ke trip lain.", 409);
    const existing = current.state.sources.find(s => s.tripId === body.tripId);
    if (existing && (existing.spreadsheetId !== body.spreadsheetId || existing.sheetId !== body.sheetId)) throw new DomainError("Trip sudah memiliki sumber. Buat trip baru untuk sumber yang berbeda.");
    const token = await googleAccessToken(auth.tenantId);
    const metadata = await fetchSheetMetadata(body.spreadsheetId, token);
    const sheet = metadata.sheets.find(s => s.sheetId === body.sheetId);
    if (!sheet) throw new DomainError("Tab hilang dari spreadsheet.");
    const data = await fetchSheetRows(body.spreadsheetId, sheet.title, token, body.headerRow, 5001);
    if (data.rows.length > 5000) throw new DomainError("Impor melebihi batas 5.000 respons. Pisahkan sumber per trip.");
    if (JSON.stringify(body.headers) !== JSON.stringify(data.headers)) throw new DomainError("Header berubah. Buka preview dan konfirmasikan mapping kembali.");
    if (indexes.some(i => i === undefined || i >= data.headers.length)) throw new DomainError("Kolom mapping tidak tersedia.");
    const result = importRows(current.state, { id: existing?.id ?? crypto.randomUUID(), tripId: body.tripId, spreadsheetId: body.spreadsheetId, sheetId: body.sheetId, sheetTitle: sheet.title, headerRow: body.headerRow, headers: data.headers, mapping: body.mapping as Record<string, number>, lastSuccessAt: "", review: [] }, data.rows, auth.userId);
    const revision = await saveWorkspace(auth.tenantId, current.revision, result.state, current.exists);
    return NextResponse.json({ ...result, revision });
  } catch (e) { return apiError(e); }
}
