import { fetchSheetMetadata, fetchSheetRows } from "@/lib/google";
import { googleAccessToken } from "./google-auth";
import { loadWorkspace, saveWorkspace } from "./server";
import { importRows } from "./import";
import { DomainError } from "./commands";

export async function syncTenant(tenantId:string) {
  const token = await googleAccessToken(tenantId);
  const initial = await loadWorkspace(tenantId);
  if (initial.state.sources.length > 10) throw new DomainError("Maksimal 10 sumber per jadwal; pisahkan worker untuk workspace besar.");
  const failures:string[]=[];
  for (const source of initial.state.sources) {
    try {
      const metadata = await fetchSheetMetadata(source.spreadsheetId,token);
      const sheet = metadata.sheets.find(s=>s.sheetId===source.sheetId);
      if (!sheet) throw new DomainError("Tab sumber tidak ditemukan.");
      const rows = await fetchSheetRows(source.spreadsheetId,sheet.title,token,source.headerRow,5001);
      if (rows.rows.length > 5000) throw new DomainError("Sumber melebihi 5.000 respons.");
      // Reload after network I/O. CAS still rejects edits arriving during parsing/save.
      const current = await loadWorkspace(tenantId);
      const latest = current.state.sources.find(s=>s.id===source.id);
      if (!latest || JSON.stringify(latest.mapping)!==JSON.stringify(source.mapping) || latest.headerRow!==source.headerRow || latest.spreadsheetId!==source.spreadsheetId || latest.sheetId!==source.sheetId) throw new DomainError("Konfigurasi sumber berubah. Coba lagi pada jadwal berikutnya.",409);
      if (JSON.stringify(rows.headers)!==JSON.stringify(latest.headers)) throw new DomainError("Header berubah; impor manual untuk meninjau mapping.");
      const result = importRows(current.state,latest,rows.rows,"scheduled-sync");
      await saveWorkspace(tenantId,current.revision,result.state,current.exists);
    } catch (error) {
      failures.push(`${source.id}: ${error instanceof DomainError ? error.message : "Sinkronisasi sumber gagal; periksa koneksi Google."}`);
    }
  }
  if (failures.length) throw new DomainError(failures.join("; "));
}
