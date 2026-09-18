"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileDown, FileSpreadsheet, Pencil } from "lucide-react";
import { useWorkspace } from "./context";
import { Modal, Select } from "./ui";
import { TripForm } from "./trip-form";
import { SpreadsheetImport } from "./spreadsheet-import";
import { Participants } from "./participants";
import { dateLabel, demoToday, statusLabel, todayWib, tripStatus } from "@/lib/workspace/presentation";
import { formatRupiah } from "@/lib/money";
import { renderAttendanceTemplate } from "@/lib/pdf/attendance-template";
import type { Trip } from "@/lib/workspace/types";

export function TripDetail({ tripId }: { tripId: string }) {
  const { state, basePath, prototype, revision, run, mutate, busy } = useWorkspace();
  const [editing, setEditing] = useState(false), [importing, setImporting] = useState(false);
  const trip = state.trips.find(t => t.id === tripId);
  const people = state.participants.filter(p => p.tripId === tripId && p.status === "active");
  const missing = people.some(p => !p.name.trim() || !p.meetingPoint.trim());
  if (!trip) return <section className="td-panel"><h1>Trip tidak ditemukan</h1><Link href={`${basePath}/trips`} className="text-link">Kembali ke jadwal</Link></section>;
  async function print() {
    await run(async () => {
      if (prototype) {
        const popup = window.open("", "_blank", "width=900,height=700");
        if (!popup) throw new Error("Izinkan pop-up untuk mencetak absensi.");
        popup.document.write(renderAttendanceTemplate({ tripId, title: `Absensi ${trip!.title} — SIMULASI`, organizer: "Rimbaloka Trip", version: revision, snapshotAt: new Date() }, people));
        popup.document.close(); popup.focus(); setTimeout(() => popup.print(), 300);
      } else {
        const response = await fetch("/api/attendance/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tripId }) });
        if (!response.ok) throw new Error((await response.json()).error ?? "PDF gagal dibuat.");
        const url = URL.createObjectURL(await response.blob()); const link = document.createElement("a"); link.href = url; link.download = `absensi-${tripId}.pdf`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    });
  }
  return <div className="section-stack"><Link className="text-link" href={`${basePath}/trips`}><ArrowLeft size={16}/> Trip Schedule</Link><header className="trip-detail-heading"><div><span className="detail-kicker">{trip.volume ? `Edisi ${trip.volume}` : "Detail perjalanan"}</span><h1>{trip.title}</h1><p>{trip.departureDate && `${new Date(`${trip.departureDate}T12:00:00`).toLocaleDateString("id-ID", { weekday: "long" })}, `}{dateLabel(trip.departureDate, true)} <span>·</span> {people.length} peserta{trip.location && ` · ${trip.location}`}</p></div><span className={`badge ${`status-${tripStatus(trip, state, prototype ? demoToday : todayWib())}`}`}>{statusLabel[tripStatus(trip, state, prototype ? demoToday : todayWib())]}</span></header>
    <div className="detail-actions"><button className="td-secondary" onClick={() => setEditing(true)}><Pencil size={15}/> Edit trip</button><button className="td-secondary" onClick={() => setImporting(true)}><FileSpreadsheet size={15}/> Impor spreadsheet</button><button className="td-button" disabled={busy || !people.length || missing} onClick={() => void print()}><FileDown size={15}/>{prototype ? "Cetak / simpan PDF" : "Unduh PDF absensi"}</button><Link href={`${basePath}/finance?trip=${tripId}`} className="text-link">Keuangan trip</Link></div>
    {(!people.length || missing) && <p className="inline-warning">{!people.length ? "Impor peserta terlebih dahulu untuk mencetak absensi." : "Lengkapi nama dan mepo peserta sebelum mencetak absensi."}</p>}
    {(!trip.departureDate || (!trip.fullPrice && !trip.nonPrice)) && <p className="inline-warning">Lengkapi tanggal keberangkatan dan tarif melalui Edit trip sebelum meninjau tagihan peserta.</p>}
    <details className="trip-settings"><summary>Tarif, mepo, dan status trip</summary><div className="trip-facts"><div><span>Full Transport</span><strong>{formatRupiah(trip.fullPrice)}</strong></div><div><span>Non Transport</span><strong>{formatRupiah(trip.nonPrice)}</strong></div><div><span>Jas hujan</span><strong>{formatRupiah(trip.raincoatPrice)}</strong></div><div><span>Minimum peserta</span><strong>{trip.minimumParticipants ?? 7} orang · peringatan H-{trip.riskDays ?? 7}</strong></div><div><span>Titik mepo</span><strong>{trip.meetingPoints?.join(", ") || "Mengikuti data pendaftaran"}</strong></div><div><span>Rekening</span><strong>{trip.bankAccount || "Belum diisi"}</strong></div></div><Select label="Status operasional" value={trip.status} onChange={value => void run(() => mutate({ action: "trip.status", tripId, status: value as Trip["status"] }))}><option value="active">Aktif</option><option value="completed">Selesai</option><option value="cancelled">Dibatalkan</option><option value="archived">Arsip</option></Select></details>
    <Participants key={tripId} fixedTripId={tripId}/>
    {editing && <TripForm trip={trip} onClose={() => setEditing(false)}/>}{importing && <Modal title={`Impor peserta — ${trip.title}`} onClose={() => setImporting(false)} wide><SpreadsheetImport initialTripId={tripId}/></Modal>}
  </div>;
}
