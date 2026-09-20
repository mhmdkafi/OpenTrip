import { createSourceFingerprint } from "@/lib/sync";
import { parseGoogleDriveUrl } from "@/lib/google";
import { splitName } from "@/lib/split-name";
import { DomainError } from "./commands";
import type { Workspace, Source } from "./types";

export const importFields = ["registered_at", "raw_name", "facility", "meeting_point", "raincoat_option", "proof_refs", "contact_phone"] as const;
export function registrationDate(value: string, dateOrder: "dmy" | "mdy" = "dmy") {
  const match = value.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ ,]+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?)?$/);
  let input = value.trim();
  if (match) { const [, first, second, y, h = "0", min = "0", s = "0"] = match; const [d,m] = dateOrder === "mdy" ? [second,first] : [first,second]; input = `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}T${h.padStart(2,"0")}:${min}:${s.padStart(2,"0")}+07:00`; }
  else if (/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?$/.test(input)) input = input.length === 10 ? `${input}T00:00:00+07:00` : `${input.replace(" ", "T")}+07:00`;
  else if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(input)) throw new DomainError("Format timestamp tidak dikenali. Gunakan DD/MM/YYYY HH:mm:ss atau ISO.");
  const date = new Date(input);
  if (!Number.isFinite(date.getTime())) throw new DomainError("Timestamp pendaftaran tidak valid.");
  const calendar = input.match(/^(\d{4})-(\d{2})-(\d{2})/)!;
  const calendarDate = new Date(Date.UTC(Number(calendar[1]), Number(calendar[2])-1, Number(calendar[3])));
  if (calendarDate.getUTCFullYear() !== Number(calendar[1]) || calendarDate.getUTCMonth()+1 !== Number(calendar[2]) || calendarDate.getUTCDate() !== Number(calendar[3])) throw new DomainError("Tanggal pendaftaran tidak valid.");
  return date.toISOString();
}
export function canonicalProof(value: string) {
  if (!value.trim()) return "";
  try { return `https://drive.google.com/file/d/${parseGoogleDriveUrl(value).fileId}/view`; } catch { return ""; }
}
export function importRows(original: Workspace, source: Source, rows: string[][], userId: string) {
  const state = structuredClone(original);
  const trip = state.trips.find(t => t.id === source.tripId);
  if (!trip) throw new DomainError("Trip tidak ditemukan.", 404);
  const review: string[] = []; let added = 0; let unchanged = 0;
  const seen = new Set<string>();
  const identities = new Map<string, Set<string>>();
  for (const row of rows) {
    try {
      const stamp=registrationDate(String(row[source.mapping.registered_at]??""),source.dateOrder);
      const name=String(row[source.mapping.raw_name]??"").trim();
      const key=JSON.stringify([stamp,name]);
      const versions=identities.get(key)??new Set<string>();
      versions.add(JSON.stringify(importFields.map(field=>source.mapping[field]===undefined?"":String(row[source.mapping[field]]??"").trim())));
      identities.set(key,versions);
    } catch { /* Invalid rows are reported below with their spreadsheet row. */ }
  }
  for (const [index, row] of rows.entries()) {
    if (row.every(v => !String(v).trim())) continue;
    const values = Object.fromEntries(importFields.filter(f => source.mapping[f] !== undefined).map(f => [f, String(row[source.mapping[f]] ?? "").trim()]));
    const fingerprint = createSourceFingerprint(values);
    const rowLabel = `Baris ${source.headerRow + index + 1}`;
    if (seen.has(fingerprint)) { review.push(`${rowLabel}: respons identik; tidak diimpor dua kali.`); continue; }
    seen.add(fingerprint);
    try {
      const registeredAt = registrationDate(values.registered_at ?? "", source.dateOrder);
      if ((identities.get(JSON.stringify([registeredAt,values.raw_name]))?.size??0)>1) {
        review.push(`${rowLabel}: beberapa respons memiliki timestamp dan nama sama tetapi isi berbeda; tinjau sumber terlebih dahulu.`); continue;
      }
      if (state.bookings.some(b => b.sourceId === source.id && b.fingerprint === fingerprint)) { unchanged++; continue; }
      const names = splitName(values.raw_name ?? "").names.map(n => n.name);
      if (!names.length) throw new DomainError("Nama peserta kosong.");
      const candidates = state.bookings.filter(b => b.sourceId === source.id && (b.registeredAt === registeredAt || b.rawName === values.raw_name));
      if (candidates.length) {
        const booking = candidates[0];
        const previous = booking.sourceSnapshot;
        // Only a stable timestamp AND name establish identity for automatic updates.
        if (candidates.length !== 1 || !previous || booking.registeredAt !== registeredAt || booking.rawName !== values.raw_name) {
          review.push(`${rowLabel}: identitas ambigu atau snapshot lama tidak tersedia; data database dipertahankan.`); continue;
        }
        const changed = [...new Set([...Object.keys(previous),...Object.keys(values)])].filter(key=>previous[key]!==values[key]);
        const safe = new Set(["contact_phone","meeting_point","proof_refs"]);
        if (changed.some(key=>!safe.has(key))) {
          review.push(`${rowLabel}: perubahan identitas/tagihan (${changed.join(", ")}); database menang. Koreksi melalui detail trip.`); continue;
        }
        const people = state.participants.filter(p=>p.bookingId===booking.id);
        for (const field of changed) {
          let localConflict=false;
          if (field === "contact_phone") {
            localConflict=booking.phone!==(previous.contact_phone||"");
            if (!localConflict) booking.phone=values.contact_phone||"";
          } else if (field === "proof_refs") {
            localConflict=booking.proof!==canonicalProof(previous.proof_refs||"");
            if (!localConflict) booking.proof=canonicalProof(values.proof_refs||"");
          } else {
            localConflict=people.some(p=>p.meetingPoint!==(previous.meeting_point||""));
            if (!localConflict) people.forEach(p=>{p.meetingPoint=values.meeting_point||"";});
          }
          if (localConflict) review.push(`${rowLabel}: ${field} sudah diedit lokal; nilai database dipertahankan.`);
        }
        booking.sourceSnapshot=values; booking.fingerprint=fingerprint;
        continue;
      }
      const rawFacility = (values.facility ?? "").toLowerCase().replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
      const facility = ["full", "full transport"].includes(rawFacility) ? "Full Transport" : ["non", "non transport"].includes(rawFacility) ? "Non Transport" : values.facility ?? "";
      const rain = (values.raincoat_option ?? "").toLowerCase();
      const quantity = source.mapping.raincoat_option === undefined ? 0 : /^(tidak|ngga|nggak|no|tidak mau)(\b|,)/.test(rain) ? 0 : /^(mau|ya|yes)$/.test(rain) && names.length === 1 ? 1 : null;
      const bookingId = crypto.randomUUID();
      state.bookings.push({ id: bookingId, tripId: trip.id, sourceId: source.id, fingerprint, registeredAt, rawName: values.raw_name, proof: canonicalProof(values.proof_refs ?? ""), phone: values.contact_phone ?? "", sourceSnapshot: values });
      const base = facility === "Full Transport" ? trip.fullPrice : facility === "Non Transport" ? trip.nonPrice : 0;
      for (const name of names) state.participants.push({ id: crypto.randomUUID(), bookingId, tripId: trip.id, name, meetingPoint: values.meeting_point ?? "", facility, raincoats: quantity, charge: base + (quantity ?? 0) * trip.raincoatPrice, reviewed: Boolean(base && quantity !== null && names.length === 1), status: "active" });
      added++;
    } catch (e) { review.push(`${rowLabel}: ${e instanceof Error ? e.message : "Data tidak valid"}`); }
  }
  const missing = state.bookings.filter(b => b.sourceId === source.id && !seen.has(b.fingerprint)).length;
  if (missing) review.push(`${missing} booking berubah atau tidak ditemukan pada sumber; peserta dan transaksi tetap disimpan.`);
  const saved = { ...source, lastSuccessAt: new Date().toISOString(), lastError: undefined, review };
  state.sources = [...state.sources.filter(s => s.id !== source.id), saved];
  trip.meetingPoints = [...new Set([...(trip.meetingPoints??[]),...state.participants.filter(p=>p.tripId===trip.id).map(p=>p.meetingPoint).filter(Boolean)])];
  state.audit.push({ id: crypto.randomUUID(), userId, at: saved.lastSuccessAt, action: "sync.completed", detail: `${added} respons baru; ${unchanged} tetap; ${review.length} perlu diperiksa` });
  return { state, stats: { added, unchanged, review: review.length } };
}
