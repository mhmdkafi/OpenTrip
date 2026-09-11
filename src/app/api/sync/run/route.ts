import { NextRequest, NextResponse } from "next/server";
import { connections } from "../connect/route";
import { fetchSheetRows, GoogleApiError } from "@/lib/google";
import { reconcileSourceRows } from "@/lib/sync";

const snapshots = new Map<string, ReturnType<typeof reconcileSourceRows>>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { connectionId?: string; accessToken?: string; mapping?: Record<string, number> };
    if (!body.connectionId) return NextResponse.json({ error: "connectionId wajib diisi." }, { status: 400 });
    const connection = connections.get(body.connectionId) as { spreadsheetId: string; sheetTitle: string; headerRow: number } | undefined;
    if (!connection) return NextResponse.json({ error: "Koneksi tidak ditemukan." }, { status: 404 });
    const accessToken = body.accessToken ?? process.env.GOOGLE_ACCESS_TOKEN;
    if (!accessToken) return NextResponse.json({ error: "Token Google wajib dikirim." }, { status: 400 });

    const source = await fetchSheetRows(connection.spreadsheetId, connection.sheetTitle, accessToken, connection.headerRow, 5000);
    const mapping = body.mapping ?? Object.fromEntries(source.headers.map((header, index) => [header, index]));
    const rows = source.rows.map((values, index) => ({ rowNumber: connection.headerRow + index + 1, values: Object.fromEntries(Object.entries(mapping).map(([field, column]) => [field, values[column] ?? ""])) }));
    const previous = snapshots.get(body.connectionId) ?? [];
    const results = reconcileSourceRows(rows, previous.map((item) => ({ bookingId: item.bookingId ?? `row-${item.row.rowNumber}`, rowNumber: item.row.rowNumber, fingerprint: item.fingerprint, snapshot: item.row.values })));
    snapshots.set(body.connectionId, results);
    return NextResponse.json({ status: "completed", connectionId: body.connectionId, stats: { newCount: results.filter((item) => item.action === "new").length, changedCount: results.filter((item) => item.action === "update").length, anomalyCount: results.filter((item) => item.action === "review").length }, results });
  } catch (error) {
    if (error instanceof GoogleApiError) return NextResponse.json({ status: "failed", error: error.message, code: error.code }, { status: error.status });
    return NextResponse.json({ status: "failed", error: "Sinkronisasi gagal." }, { status: 500 });
  }
}
