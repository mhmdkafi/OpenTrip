import { NextRequest, NextResponse } from "next/server";
import { parseGoogleSheetsUrl, suggestHeaderMappings, fetchSheetMetadata, fetchSheetRows, GoogleApiError } from "@/lib/google";

const connections = new Map<string, unknown>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { tripId?: string; spreadsheetUrl?: string; accessToken?: string; sheetId?: number; headerRow?: number };
    if (!body.tripId) return NextResponse.json({ error: "tripId wajib diisi." }, { status: 400 });
    if (!body.spreadsheetUrl) return NextResponse.json({ error: "spreadsheetUrl wajib diisi." }, { status: 400 });

    const parsed = parseGoogleSheetsUrl(body.spreadsheetUrl);
    const accessToken = body.accessToken ?? process.env.GOOGLE_ACCESS_TOKEN;
    if (!accessToken) return NextResponse.json({ error: "Token Google wajib dikirim atau diset di GOOGLE_ACCESS_TOKEN." }, { status: 400 });

    const metadata = await fetchSheetMetadata(parsed.spreadsheetId, accessToken);
    const targetSheetId = body.sheetId ?? parsed.sheetId ?? metadata.sheets[0]?.sheetId;
    const sheet = metadata.sheets.find((item) => item.sheetId === targetSheetId);
    if (!sheet) return NextResponse.json({ error: "Tab spreadsheet tidak ditemukan." }, { status: 404 });

    const rows = await fetchSheetRows(parsed.spreadsheetId, sheet.title, accessToken, body.headerRow ?? 1, 25);
    const mapping = suggestHeaderMappings(rows.headers, rows.rows);
    const missing = mapping.filter((item) => item.required && item.index === null);
    const connectionId = `${body.tripId}:${parsed.spreadsheetId}:${sheet.sheetId}`;
    if ([...connections.keys()].some((key) => key !== connectionId && key.endsWith(`:${parsed.spreadsheetId}:${sheet.sheetId}`))) {
      return NextResponse.json({ error: "Sumber yang sama sudah terhubung ke trip lain." }, { status: 409 });
    }

    const payload = { connectionId, tripId: body.tripId, spreadsheetId: parsed.spreadsheetId, sheetId: sheet.sheetId, sheetTitle: sheet.title, headerRow: body.headerRow ?? 1, mapping, preview: rows.rows.slice(0, 5), anomalies: missing.map((item) => `Field wajib ${item.field} belum terpetakan.`) };
    connections.set(connectionId, payload);
    return NextResponse.json(payload, { status: missing.length ? 422 : 200 });
  } catch (error) {
    if (error instanceof GoogleApiError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    return NextResponse.json({ error: "Koneksi gagal divalidasi." }, { status: 500 });
  }
}

export { connections };
