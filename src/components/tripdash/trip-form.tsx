"use client";
import { useWorkspace } from "./context";
import { Field, Form, Modal, Submit, number, text } from "./ui";

import type { Trip } from "@/lib/workspace/types";

export function TripForm({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const { mutate } = useWorkspace();
  return <Modal title="Edit trip" onClose={onClose} wide><Form onSave={async data => {
    const fields = { title: text(data, "title"), departureDate: text(data, "date"), fullPrice: number(data, "full"), nonPrice: number(data, "non"), raincoatPrice: number(data, "rain"), volume: text(data, "volume"), location: text(data, "location"), bankAccount: text(data, "bank"), meetingPoints: text(data, "mepo").split("\n").map(value => value.trim()).filter(Boolean), minimumParticipants: number(data, "minimum"), riskDays: number(data, "risk") };
    await mutate({ action: "trip.update", tripId: trip.id, ...fields }); onClose();
  }}><div className="form-grid"><Field label="Trip name" name="title" defaultValue={trip?.title} required maxLength={200}/><Field label="Volume / edition" name="volume" defaultValue={trip?.volume} maxLength={80}/><Field label="Departure date" type="date" name="date" defaultValue={trip.departureDate} required/><Field label="Location" name="location" defaultValue={trip?.location} maxLength={200}/><Field label="Full Transport (Rp)" type="number" name="full" min={0} defaultValue={trip?.fullPrice ?? 175000} required/><Field label="Non Transport (Rp)" type="number" name="non" min={0} defaultValue={trip?.nonPrice ?? 110000} required/><Field label="Raincoat, per item (Rp)" type="number" name="rain" min={0} defaultValue={trip?.raincoatPrice ?? 15000} required/><Field label="Minimum participants" type="number" name="minimum" min={1} max={1000} defaultValue={trip?.minimumParticipants ?? 7} required/><Field label="At-risk warning (days before trip)" type="number" name="risk" min={1} max={60} defaultValue={trip?.riskDays ?? 7} required/><Field label="Bank account details" name="bank" defaultValue={trip?.bankAccount} maxLength={300}/></div><label className="form-label">Meeting points — one per line<textarea className="td-input" name="mepo" rows={3} defaultValue={trip?.meetingPoints?.join("\n")}/></label><p className="empty-note">A trip is at risk when departure is near and participants are below the minimum. Prices that already received payments cannot be changed.</p><Submit>Save trip</Submit></Form></Modal>;
}
