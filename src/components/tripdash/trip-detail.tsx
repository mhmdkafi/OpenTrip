"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Ban, FileDown, Pencil, Trash2, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "./context";
import { Modal, Select } from "./ui";
import { TripForm } from "./trip-form";
import { Participants } from "./participants";
import { dateLabel, statusLabel, todayWib, tripStatus } from "@/lib/workspace/presentation";
import { formatRupiah } from "@/lib/money";
import type { Trip } from "@/lib/workspace/types";

export function TripDetail({ tripId }: { tripId: string }) {
  const { state, basePath, run, mutate, busy } = useWorkspace();
  const router = useRouter();
  const [editing, setEditing] = useState(false), [deleting, setDeleting] = useState(false), [cancelling, setCancelling] = useState(false);
  const trip = state.trips.find(t => t.id === tripId);
  const people = state.participants.filter(p => p.tripId === tripId && p.status === "active");
  const missing = people.some(p => !p.name.trim() || !p.meetingPoint.trim());
  if (!trip) return <section className="td-panel"><h1>Trip not found</h1><Link href={`${basePath}/trips`} className="text-link">Back to schedule</Link></section>;
  async function print() {
    await run(async () => {
      const response = await fetch("/api/attendance/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tripId }) });
      if (!response.ok) throw new Error((await response.json()).error ?? "Could not generate the PDF.");
      const url = URL.createObjectURL(await response.blob()); const link = document.createElement("a"); link.href = url; link.download = `attendance-${tripId}.pdf`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }
  return <div className="section-stack"><Link className="text-link" href={`${basePath}/trips`}><ArrowLeft size={16}/> Trip Schedule</Link><header className="trip-detail-heading"><div><h1>{trip.title}{trip.volume ? ` ${trip.volume}` : ""}</h1><p>{trip.departureDate && `${new Date(`${trip.departureDate}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long" })}, `}{dateLabel(trip.departureDate, true)} <span>·</span> {people.length} participants{trip.location && ` · ${trip.location}`}</p></div><span className={`badge ${`status-${tripStatus(trip, state, todayWib())}`}`}>{statusLabel[tripStatus(trip, state, todayWib())]}</span></header>
    <div className="detail-actions"><button className="td-secondary" onClick={() => setEditing(true)}><Pencil size={15}/> Edit trip</button><button className="td-button" disabled={busy || !people.length || missing} onClick={() => void print()}><FileDown size={15}/>Download attendance PDF</button><Link href={`${basePath}/finance?trip=${tripId}`} className="td-secondary"><Wallet size={15}/> Trip finances</Link>{trip.status !== "cancelled" && <button className="td-secondary warn-button" onClick={() => setCancelling(true)}><Ban size={15}/> Cancel trip</button>}<button className="td-secondary danger-button" onClick={() => setDeleting(true)}><Trash2 size={15}/> Delete trip</button></div>
    {(!people.length || missing) && <p className="inline-warning">{!people.length ? "Import participants before printing attendance." : "Fill in every participant's name and meeting point before printing attendance."}</p>}
    {(!trip.departureDate || (!trip.fullPrice && !trip.nonPrice)) && <p className="inline-warning">Add the departure date and prices via Edit trip before reviewing participant bills.</p>}
    <details className="trip-settings"><summary>Prices, meeting points, and trip status</summary><div className="trip-facts"><div><span>Full Transport</span><strong>{formatRupiah(trip.fullPrice)}</strong></div><div><span>Non Transport</span><strong>{formatRupiah(trip.nonPrice)}</strong></div><div><span>Raincoat</span><strong>{formatRupiah(trip.raincoatPrice)}</strong></div><div><span>Minimum participants</span><strong>{trip.minimumParticipants ?? 7} people · warning D-{trip.riskDays ?? 7}</strong></div><div><span>Meeting points</span><strong>{trip.meetingPoints?.join(", ") || "Follows registration data"}</strong></div><div><span>Bank account</span><strong>{trip.bankAccount || "Not set"}</strong></div></div><Select label="Operational status" value={trip.status} onChange={value => void run(() => mutate({ action: "trip.status", tripId, status: value as Trip["status"] }))}><option value="active">Active</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="archived">Archived</option></Select></details>
    <Participants key={tripId} fixedTripId={tripId}/>
    {editing && <TripForm trip={trip} onClose={() => setEditing(false)}/>}
    {cancelling && <Modal title="Cancel trip" onClose={() => setCancelling(false)}>
      <p className="empty-note">Mark {trip.title} as cancelled? The trip is kept and can be reactivated from its operational status.</p>
      <div className="confirm-actions">
        <button className="td-secondary" onClick={() => setCancelling(false)}>Back</button>
        <button className="td-button danger-solid" disabled={busy} onClick={() => void run(async () => { await mutate({ action: "trip.status", tripId, status: "cancelled" }); setCancelling(false); })}>Cancel trip</button>
      </div>
    </Modal>}
    {deleting && <Modal title="Delete trip" onClose={() => setDeleting(false)}>
      <p className="empty-note">Delete {trip.title} and all of its registered participants? This cannot be undone.</p>
      <div className="confirm-actions">
        <button className="td-secondary" onClick={() => setDeleting(false)}>Back</button>
        <button className="td-button danger-solid" disabled={busy} onClick={() => void run(async () => { await mutate({ action: "trip.delete", tripId }); router.push(`${basePath}/trips`); })}>Delete trip</button>
      </div>
    </Modal>}
  </div>;
}
