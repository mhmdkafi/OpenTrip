import { createSourceFingerprint } from "@/lib/sync";
import { parseGoogleDriveUrl } from "@/lib/google";
import { splitName } from "@/lib/split-name";
import { DomainError } from "./commands";
import type { Workspace, Source } from "./types";

export const importFields = ["registered_at", "raw_name", "facility", "meeting_point", "raincoat_option", "proof_refs", "contact_phone"] as const;
export function registrationDate(value: string) {
  const match = value.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ ,]+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?)?$/);
  let input = value.trim();
  if (match) { const [, d, m, y, h = "0", min = "0", s = "0"] = match; input = `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}T${h.padStart(2,"0")}:${min}:${s.padStart(2,"0")}+07:00`; }
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
  for (const [index, row] of rows.entries()) {
    if (row.every(v => !String(v).trim())) continue;
    const values = Object.fromEntries(importFields.filter(f => source.mapping[f] !== undefined).map(f => [f, String(row[source.mapping[f]] ?? "").trim()]));
    const fingerprint = createSourceFingerprint(values);
    const rowLabel = `Baris ${source.headerRow + index + 1}`;
    if (seen.has(fingerprint)) { review.push(`${rowLabel}: respons identik; tidak diimpor dua kali.`); continue; }
    seen.add(fingerprint);
    if (state.bookings.some(b => b.sourceId === source.id && b.fingerprint === fingerprint)) { unchanged++; continue; }
    try {
      const registeredAt = registrationDate(values.registered_at ?? "");
      const names = splitName(values.raw_name ?? "").names.map(n => n.name);
      if (!names.length) throw new DomainError("Nama peserta kosong.");
      if (state.bookings.some(b => b.sourceId === source.id && (b.registeredAt === registeredAt || b.rawName === values.raw_name))) { review.push(`${rowLabel}: sumber berubah/identitas mirip. Data lama dipertahankan; periksa peserta sebelum mengimpor sebagai respons baru.`); continue; }
      const rawFacility = (values.facility ?? "").toLowerCase().replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
      const facility = ["full", "full transport"].includes(rawFacility) ? "Full Transport" : ["non", "non transport"].includes(rawFacility) ? "Non Transport" : values.facility ?? "";
      const rain = (values.raincoat_option ?? "").toLowerCase();
      const quantity = source.mapping.raincoat_option === undefined ? 0 : /^(tidak|ngga|nggak|no|tidak mau)(\b|,)/.test(rain) ? 0 : /^(mau|ya|yes)$/.test(rain) && names.length === 1 ? 1 : null;
      const bookingId = crypto.randomUUID();
      state.bookings.push({ id: bookingId, tripId: trip.id, sourceId: source.id, fingerprint, registeredAt, rawName: values.raw_name, proof: canonicalProof(values.proof_refs ?? ""), phone: values.contact_phone ?? "" });
      const base = facility === "Full Transport" ? trip.fullPrice : facility === "Non Transport" ? trip.nonPrice : 0;
      for (const name of names) state.participants.push({ id: crypto.randomUUID(), bookingId, tripId: trip.id, name, meetingPoint: values.meeting_point ?? "", facility, raincoats: quantity, charge: base + (quantity ?? 0) * trip.raincoatPrice, reviewed: Boolean(base && quantity !== null && names.length === 1), status: "active" });
      added++;
    } catch (e) { review.push(`${rowLabel}: ${e instanceof Error ? e.message : "Data tidak valid"}`); }
  }
  const missing = state.bookings.filter(b => b.sourceId === source.id && !seen.has(b.fingerprint)).length;
  if (missing) review.push(`${missing} booking berubah atau tidak ditemukan pada sumber; peserta dan transaksi tetap disimpan.`);
  const saved = { ...source, lastSuccessAt: new Date().toISOString(), lastError: undefined, review };
  state.sources = [...state.sources.filter(s => s.id !== source.id), saved];
  state.audit.push({ id: crypto.randomUUID(), userId, at: saved.lastSuccessAt, action: "sync.completed", detail: `${added} respons baru; ${unchanged} tetap; ${review.length} perlu diperiksa` });
  return { state, stats: { added, unchanged, review: review.length } };
}
