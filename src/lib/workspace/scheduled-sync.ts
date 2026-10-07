import { fetchSheetMetadata, fetchSheetRows } from "@/lib/google";
import { googleAccessToken } from "./google-auth";
import { loadWorkspace, saveWorkspace } from "./server";
import { importRows } from "./import";
import { DomainError } from "./commands";

export async function syncTenant(tenantId:string) {
  const token = await googleAccessToken(tenantId);
  const initial = await loadWorkspace(tenantId);
  if (initial.state.sources.length > 10) throw new DomainError("At most 10 sources per schedule; split workers for large workspaces.");
  const failures:string[]=[];
  for (const source of initial.state.sources) {
    try {
      const metadata = await fetchSheetMetadata(source.spreadsheetId,token);
      const sheet = metadata.sheets.find(s=>s.sheetId===source.sheetId);
      if (!sheet) throw new DomainError("Source tab not found.");
      const rows = await fetchSheetRows(source.spreadsheetId,sheet.title,token,source.headerRow,5001);
      if (rows.rows.length > 5000) throw new DomainError("The source exceeds 5,000 responses.");
      // Reload after network I/O. CAS still rejects edits arriving during parsing/save.
      const current = await loadWorkspace(tenantId);
      const latest = current.state.sources.find(s=>s.id===source.id);
      if (!latest || JSON.stringify(latest.mapping)!==JSON.stringify(source.mapping) || latest.headerRow!==source.headerRow || latest.spreadsheetId!==source.spreadsheetId || latest.sheetId!==source.sheetId || latest.dateOrder!==source.dateOrder) throw new DomainError("The source configuration changed. It will retry on the next schedule.",409);
      if (JSON.stringify(rows.headers)!==JSON.stringify(latest.headers)) throw new DomainError("Headers changed; import manually to review the mapping.");
      const result = importRows(current.state,latest,rows.rows,"scheduled-sync");
      await saveWorkspace(tenantId,current.revision,result.state,current.exists);
    } catch (error) {
      failures.push(`${source.id}: ${error instanceof DomainError ? error.message : "Source sync failed; check the Google connection."}`);
    }
  }
  if (failures.length) throw new DomainError(failures.join("; "));
}
