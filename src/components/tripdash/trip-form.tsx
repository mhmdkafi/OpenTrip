"use client";
import { useWorkspace } from "./context";
import { Field, Form, Modal, Submit, number, text } from "./ui";

import type { Trip } from "@/lib/workspace/types";

export function TripForm({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const { mutate } = useWorkspace();
  return <Modal title="Edit trip" onClose={onClose} wide><Form onSave={async data => {
    const fields = { title: text(data, "title"), departureDate: text(data, "date"), fullPrice: number(data, "full"), nonPrice: number(data, "non"), raincoatPrice: number(data, "rain"), volume: text(data, "volume"), location: text(data, "location"), bankAccount: text(data, "bank"), meetingPoints: text(data, "mepo").split("\n").map(value => value.trim()).filter(Boolean), minimumParticipants: number(data, "minimum"), riskDays: number(data, "risk") };
    await mutate({ action: "trip.update", tripId: trip.id, ...fields }); onClose();
  }}><div className="form-grid"><Field label="Nama trip" name="title" defaultValue={trip?.title} required maxLength={200}/><Field label="Volume / edisi" name="volume" defaultValue={trip?.volume} maxLength={80}/><Field label="Tanggal keberangkatan" type="date" name="date" defaultValue={trip.departureDate} required/><Field label="Lokasi" name="location" defaultValue={trip?.location} maxLength={200}/><Field label="Full Transport (Rp)" type="number" name="full" min={0} defaultValue={trip?.fullPrice ?? 175000} required/><Field label="Non Transport (Rp)" type="number" name="non" min={0} defaultValue={trip?.nonPrice ?? 110000} required/><Field label="Jas hujan per buah (Rp)" type="number" name="rain" min={0} defaultValue={trip?.raincoatPrice ?? 15000} required/><Field label="Minimum peserta" type="number" name="minimum" min={1} max={1000} defaultValue={trip?.minimumParticipants ?? 7} required/><Field label="Peringatan at risk (hari sebelum trip)" type="number" name="risk" min={1} max={60} defaultValue={trip?.riskDays ?? 7} required/><Field label="Informasi rekening" name="bank" defaultValue={trip?.bankAccount} maxLength={300}/></div><label className="form-label">Titik mepo — satu titik per baris<textarea className="td-input" name="mepo" rows={3} defaultValue={trip?.meetingPoints?.join("\n")}/></label><p className="empty-note">At risk muncul jika mendekati keberangkatan dan jumlah peserta belum mencapai minimum. Harga yang sudah menerima pembayaran tidak dapat diubah.</p><Submit>Simpan trip</Submit></Form></Modal>;
}
