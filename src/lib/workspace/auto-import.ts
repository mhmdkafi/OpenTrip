import { suggestHeaderMappings, type SheetMetadata } from "@/lib/google";
import { paidFor } from "./types";
import { DomainError } from "./commands";
import { readTripDetails, sheetDateOrder } from "./sheet-details";
import { importRows } from "./import";
import type { Workspace } from "./types";

// Only named columns are accepted automatically; value-shape guesses can confuse
// registration dates, phone numbers and proof links.
export function detectSheetHeader(values: string[][]) {
  for (let index = 0; index < Math.min(values.length, 100); index++) {
    const headers = values[index];
    const suggestions = suggestHeaderMappings(headers);
    if (suggestions.some(s => s.required && s.index === null)) continue;
    const mapped = suggestions.filter(s => s.index !== null);
    if (new Set(mapped.map(s => s.index)).size !== mapped.length) continue;
    const normalized = headers.map(h => h.toLowerCase().trim());
    if (mapped.some(s => normalized.filter(h => h === normalized[s.index!]).length > 1)) continue;
    return { headerRow: index + 1, headers, mapping: Object.fromEntries(mapped.map(s => [s.field, s.index!])) };
  }
  throw new DomainError("Kolom pendaftaran belum dikenali. Spreadsheet perlu memiliki header Timestamp, Nama Lengkap, Fasilitas, dan Mepo yang tidak duplikat.");
}

export function importSpreadsheet(original: Workspace, metadata: Pick<SheetMetadata, "spreadsheetId" | "title"> & {locale?:string}, sheet: { sheetId: number; title: string }, values: string[][], userId: string, tripId?: string, departureDate?: string) {
  const detected = detectSheetHeader(values);
  const rows = values.slice(detected.headerRow);
  if (rows.length > 5000) throw new DomainError("Impor melebihi batas 5.000 respons. Pisahkan sumber per trip.");
  const dateOrder = sheetDateOrder(rows.map(row=>[row[detected.mapping.registered_at]??""]),metadata.locale);
  const details = readTripDetails(metadata.title,values,detected.headerRow,dateOrder);
  // Admin-provided departure date wins over anything guessed from the sheet,
  // so the trip is fully filled in without a follow-up edit.
  if (departureDate) details.departureDate = departureDate;
  const state = structuredClone(original);
  const linked = state.sources.find(s => s.spreadsheetId === metadata.spreadsheetId && s.sheetId === sheet.sheetId);
  if (tripId && linked && linked.tripId !== tripId) throw new DomainError("Spreadsheet ini sudah terhubung ke trip lain.", 409);
  let trip = state.trips.find(t => t.id === (tripId || linked?.tripId));
  if ((tripId || linked) && !trip) throw new DomainError("Trip tidak ditemukan.", 404);
  if (!trip) {
    trip = { id: crypto.randomUUID(), ...details, status: "active" };
    state.trips.push(trip);
  }
  // Fill missing source details on resync; preserve admin edits and paid prices.
  if(!trip.departureDate&&details.departureDate)trip.departureDate=details.departureDate;
  for(const key of ["volume","location","bankAccount"] as const)if(!trip[key]&&details[key])trip[key]=details[key];
  const people=state.participants.filter(p=>p.tripId===trip.id);
  if(people.every(p=>paidFor(state,p.id)===0)) {
    for(const key of ["fullPrice","nonPrice","raincoatPrice"] as const)if(!trip[key]&&details[key])trip[key]=details[key];
    for(const person of people) {
      if(["Full Transport","Non Transport"].includes(person.facility))person.charge=(person.facility==="Full Transport"?trip.fullPrice:trip.nonPrice)+(person.raincoats??0)*trip.raincoatPrice;
    }
  }
  const source = state.sources.find(s => s.tripId === trip.id);
  if (source && (source.spreadsheetId !== metadata.spreadsheetId || source.sheetId !== sheet.sheetId)) throw new DomainError("Trip ini sudah memiliki sumber spreadsheet lain.");
  const result = importRows(state, { id: source?.id ?? crypto.randomUUID(), tripId: trip.id, spreadsheetId: metadata.spreadsheetId, sheetId: sheet.sheetId, sheetTitle: sheet.title, ...detected, dateOrder, lastSuccessAt: "", review: [] }, rows, userId);
  const importedTrip = result.state.trips.find(t => t.id === trip.id)!;
  importedTrip.meetingPoints = [...new Set([...(importedTrip.meetingPoints ?? []), ...result.state.participants.filter(p => p.tripId === trip.id).map(p => p.meetingPoint).filter(Boolean)])];
  return { ...result, tripId: trip.id };
}
