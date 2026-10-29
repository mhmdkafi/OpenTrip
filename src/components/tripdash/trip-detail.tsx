"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Ban, FileDown, MapPin, MoreHorizontal, Pencil, Trash2, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "./context";
import { Modal } from "./ui";
import { Dropdown } from "./dropdown";
import { TripForm } from "./trip-form";
import { Participants } from "./participants";
import { dateLabel, statusLabel, todayWib, tripStatus } from "@/lib/workspace/presentation";
import { formatRupiah } from "@/lib/money";
import type { Trip } from "@/lib/workspace/types";

const STATUS_OPTIONS = [{ value: "active", label: "Active" }, { value: "completed", label: "Completed" }, { value: "cancelled", label: "Cancelled" }, { value: "archived", label: "Archived" }];

type MenuItem = { label: string; icon: LucideIcon; tone: "warn" | "danger"; onSelect: () => void };
// Less frequent, destructive trip actions live behind a "more" button.
function MoreMenu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [open]);
  return <div className="td2-more" ref={root}>
    <button className="td-secondary td2-more-trigger" aria-label="More trip actions" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}><MoreHorizontal size={18}/></button>
    {open && <div className="td2-menu" role="menu">{items.map(({ label, icon: Icon, tone, onSelect }) => <button key={label} role="menuitem" className={`is-${tone}`} onClick={() => { setOpen(false); onSelect(); }}><Icon size={15}/> {label}</button>)}</div>}
  </div>;
}

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
      const url = URL.createObjectURL(await response.blob()); const link = document.createElement("a"); link.href = url; link.download = decodeURIComponent(response.headers.get("Content-Disposition")?.match(/filename\*=UTF-8''([^;]+)/)?.[1] ?? "") || "attendance.pdf"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }
  const status = tripStatus(trip, state, todayWib());
  return <div className="ov td2">
    <header className="td2-heading">
      <Link className="back-button" href={`${basePath}/trips`} aria-label="Back to Trip Schedule" title="Back to Trip Schedule"><ArrowLeft size={18}/></Link>
      <div className="td2-title">
        <div className="td2-name"><h1>{trip.title}{trip.volume ? ` ${trip.volume}` : ""}</h1><span className={`ov-badge ov-tone-${status}`}>{statusLabel[status]}</span></div>
        <p>{trip.departureDate && `${new Date(`${trip.departureDate}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long" })}, `}{dateLabel(trip.departureDate, true)}<span>·</span>{people.length} participants{trip.location && <><span>·</span>{trip.location}</>}</p>
      </div>
      <div className="td2-actions">
        <button className="td-secondary" onClick={() => setEditing(true)}><Pencil size={15}/> Edit trip</button>
        <button className="td-button" disabled={busy || !people.length || missing} onClick={() => void print()}><FileDown size={15}/> Download attendance PDF</button>
        <MoreMenu items={[...(trip.status !== "cancelled" ? [{ label: "Cancel trip", icon: Ban, tone: "warn", onSelect: () => setCancelling(true) } satisfies MenuItem] : []), { label: "Delete trip", icon: Trash2, tone: "danger", onSelect: () => setDeleting(true) }]}/>
      </div>
    </header>
    {(!people.length || missing) && <p className="inline-warning">{!people.length ? "Import participants before printing attendance." : "Fill in every participant's name and meeting point before printing attendance."}</p>}
    {(!trip.departureDate || (!trip.fullPrice && !trip.nonPrice)) && <p className="inline-warning">Add the departure date and prices via Edit trip before reviewing participant bills.</p>}
    <section className="ov-card td2-info" aria-label="Trip details">
      <div className="td2-group">
        <h2>Prices</h2>
        <dl className="td2-list">
          <div><dt>Full Transport</dt><dd>{formatRupiah(trip.fullPrice)}</dd></div>
          <div><dt>Non Transport</dt><dd>{formatRupiah(trip.nonPrice)}</dd></div>
          <div><dt>Raincoat</dt><dd>+{formatRupiah(trip.raincoatPrice)}</dd></div>
        </dl>
      </div>
      <div className="td2-group td2-stack">
        <div>
          <h2>Meeting points</h2>
          {trip.meetingPoints?.length ? <ul className="td2-chips">{trip.meetingPoints.map(point => <li key={point}><MapPin size={13} aria-hidden="true"/>{point}</li>)}</ul> : <p className="td2-muted">Taken from registrations</p>}
        </div>
        <div>
          <h2>Transfer to</h2>
          <p className="td2-value">{trip.bankAccount || <span className="td2-muted">Not set · add it via Edit trip</span>}</p>
        </div>
      </div>
      <div className="td2-group">
        <h2>Settings</h2>
        <dl className="td2-list">
          <div><dt>Min. participants</dt><dd>{trip.minimumParticipants ?? 7}</dd></div>
          <div><dt>At-risk warning</dt><dd>D-{trip.riskDays ?? 7}</dd></div>
          <div className="td2-status-row"><dt>Status</dt><dd className={`td2-status is-${trip.status}`}><Dropdown label="Operational status" value={trip.status} options={STATUS_OPTIONS} onChange={value => void run(() => mutate({ action: "trip.status", tripId, status: value as Trip["status"] }))}/></dd></div>
        </dl>
      </div>
    </section>
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
