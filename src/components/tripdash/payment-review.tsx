"use client";
import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, ExternalLink, Pencil, X } from "lucide-react";
import { formatRupiah } from "@/lib/money";
import { paidFor, type Person } from "@/lib/workspace/types";
import { pendingProofs } from "@/lib/workspace/payment-queue";
import { useWorkspace } from "./context";
import { Modal } from "./ui";
import { ProofImage } from "./proof-image";

export function PaymentReview({ tripId, onClose, onReviewBill }: { tripId?: string; onClose: () => void; onReviewBill: (person: Person) => void }) {
  const { state, mutate, run, busy } = useWorkspace();
  const queue = pendingProofs(state, tripId);
  const [index, setIndex] = useState(0);
  const [partial, setPartial] = useState<number | null>(null);
  const position = Math.min(index, Math.max(0, queue.length - 1));
  const group = queue[position];
  const trip = group && state.trips.find(t => t.id === group.tripId);
  const needsReview = group?.people.filter(p => !p.reviewed) ?? [];
  const ids = group?.people.map(p => p.id) ?? [];
  // After an action the group leaves the queue, so the same position shows the next one.
  const act = (action: () => Promise<void>) => void run(async () => { await action(); setPartial(null); });
  const approve = (amount: number) => act(() => mutate({ action: "payment.verify", participantIds: ids, amount, method: "transfer", notes: amount < group.due ? "Partial payment" : "", fullyPaid: amount >= group.due }));

  return <Modal title="Payment review" onClose={onClose} wide>
    {!group ? <div className="pr-done"><Check size={28}/><h3>All payments reviewed</h3><p>No transfer proofs are waiting for review.</p><button className="td-button" onClick={onClose}>Close</button></div> : <div className="pr-layout">
      <div className="pr-proof"><ProofImage key={group.proof} url={group.proof}/><a className="td-secondary" href={group.proof} target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/> Open original proof</a></div>
      <div className="pr-details">
        <div className="pr-progress"><button className="cal-nav" aria-label="Previous proof" disabled={position === 0} onClick={() => { setIndex(position - 1); setPartial(null); }}><ChevronLeft size={16}/></button><span>{position + 1} of {queue.length}</span><button className="cal-nav" aria-label="Next proof" disabled={position >= queue.length - 1} onClick={() => { setIndex(position + 1); setPartial(null); }}><ChevronRight size={16}/></button></div>
        <h3>{trip?.title}{trip?.volume ? ` ${trip.volume}` : ""}</h3>
        <div className="pr-people">{group.people.map(person => <div key={person.id}><span>{person.name}<small>{person.facility}{person.raincoats ? ` · ${person.raincoats} raincoat` : ""}</small></span><strong>{formatRupiah(person.charge - paidFor(state, person.id))}</strong></div>)}</div>
        <div className="pr-total"><span>Amount to receive</span><strong>{formatRupiah(group.due)}</strong></div>
        {trip?.bankAccount && <p className="pr-bank">To <strong>{trip.bankAccount}</strong></p>}
        <p className="pr-meta">Registered {new Date(group.registeredAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })} WIB</p>
        {needsReview.length ? <div className="pr-warning"><p>{needsReview.map(p => p.name).join(", ")} {needsReview.length === 1 ? "needs a" : "need a"} bill review before approval.</p><button className="td-secondary" onClick={() => onReviewBill(needsReview[0])}><Pencil size={14}/> Review bill</button></div> : <>
          <div className="pr-actions">
            <button className="td-button pr-approve" disabled={busy} onClick={() => approve(group.due)}><Check size={16}/> Approve</button>
            <button className="td-secondary pr-reject" disabled={busy} onClick={() => act(() => mutate({ action: "payment.reject", participantIds: ids, reason: "" }))}><X size={16}/> Reject</button>
          </div>
          {partial === null ? <button className="pr-partial-link" onClick={() => setPartial(group.due)}>Partial amount</button> : <div className="pr-partial">
            <label className="ts-field"><span className="ts-field-label">Amount received (Rp)</span><span className="ts-control"><input type="number" min={1} max={group.due} value={partial || ""} onChange={e => setPartial(Number(e.target.value))}/></span></label>
            <button className="td-button" disabled={busy || !partial || partial <= 0} onClick={() => approve(Math.min(partial, group.due))}>Approve amount</button>
          </div>}
        </>}
      </div>
    </div>}
  </Modal>;
}
