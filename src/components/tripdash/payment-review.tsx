"use client";
import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Clock3, Landmark, Pencil, X } from "lucide-react";
import { formatRupiah } from "@/lib/money";
import { paidFor, type Person } from "@/lib/workspace/types";
import { pendingProofs } from "@/lib/workspace/payment-queue";
import { useWorkspace } from "./context";
import { Modal } from "./ui";
import { preloadProof, ProofImage } from "./proof-image";

export function PaymentReview({ tripId, startKey, onClose, onReviewBill }: { tripId?: string; startKey?: string; onClose: () => void; onReviewBill: (person: Person) => void }) {
  const { state, mutate, run, busy } = useWorkspace();
  const queue = pendingProofs(state, tripId);
  const [index, setIndex] = useState(() => Math.max(0, queue.findIndex(group => group.key === startKey)));
  const [partial, setPartial] = useState<number | null>(null);
  const position = Math.min(index, Math.max(0, queue.length - 1));
  const group = queue[position];
  const trip = group && state.trips.find(t => t.id === group.tripId);
  const needsReview = group?.people.filter(p => !p.reviewed) ?? [];
  const ids = group?.people.map(p => p.id) ?? [];
  // After an action the group leaves the queue, so the same position shows the next one.
  const act = (action: () => Promise<void>) => void run(async () => { await action(); setPartial(null); });
  // Approve what the proof shows when it could be read; otherwise the full amount due.
  const received = typeof group?.detected === "number" && group.detected > 0 ? group.detected : group?.due ?? 0;
  const approve = (amount: number) => act(() => mutate({ action: "payment.verify", participantIds: ids, amount, method: "transfer", notes: amount < group.due ? "Partial payment" : "", fullyPaid: amount >= group.due }));

  const go = (next: number) => { setIndex(Math.max(0, Math.min(next, queue.length - 1))); setPartial(null); };
  // Arrow keys step through proofs, except while typing an amount.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest("input, textarea, select")) return;
      if (event.key === "ArrowLeft") go(position - 1);
      if (event.key === "ArrowRight") go(position + 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });
  // Load the neighbouring proofs ahead of time so stepping through them never waits on Drive.
  useEffect(() => { for (const offset of [1, 2, -1]) { const next = queue[position + offset]; if (next) preloadProof(next.proof); } }, [queue, position]);
  const registered = group && new Date(group.registeredAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

  return <Modal title="Payment review" onClose={onClose} wide>
    {!group ? <div className="pr-done"><Check size={28}/><h3>All payments reviewed</h3><p>No transfer proofs are waiting for review.</p><button className="td-button" onClick={onClose}>Close</button></div> : <div className="pr-layout">
      <div className="pr-proof">
        <ProofImage key={group.proof} url={group.proof}/>
        {queue.length > 1 && <>
          <button className="pr-nav pr-nav-prev" aria-label="Previous proof" disabled={position === 0} onClick={() => go(position - 1)}><ChevronLeft size={20}/></button>
          <button className="pr-nav pr-nav-next" aria-label="Next proof" disabled={position >= queue.length - 1} onClick={() => go(position + 1)}><ChevronRight size={20}/></button>
        </>}
        <span className="pr-count" aria-live="polite">{position + 1} / {queue.length}</span>
      </div>
      <div className="pr-details">
        <div className="pr-head">
          <h3>{trip?.title}{trip?.volume ? ` ${trip.volume}` : ""}</h3>
          <dl className="pr-facts">
            {trip?.bankAccount && <div><dt><Landmark size={14}/> Transfer to</dt><dd>{trip.bankAccount}</dd></div>}
            <div><dt><Clock3 size={14}/> Registered</dt><dd>{registered} WIB</dd></div>
          </dl>
        </div>
        <div className="pr-people">
          {group.people.map(person => <div key={person.id}><span>{person.name}<small>{person.facility}{person.raincoats ? ` + ${person.raincoats} raincoat${person.raincoats > 1 ? "s" : ""}` : ""}</small></span><strong>{formatRupiah(person.charge - paidFor(state, person.id))}</strong></div>)}
          {group.people.length > 1 && <div className="pr-people-total"><span>Total bill</span><strong>{formatRupiah(group.due)}</strong></div>}
        </div>
        <div className={`pr-detected ${group.detected == null ? "is-unknown" : group.detected >= group.due ? "is-match" : "is-short"}`}><span>Read from proof</span><strong>{group.detected === undefined ? <span className="money-skeleton" role="status" aria-label="Reading amount from proof"/> : group.detected === null ? "Not readable" : formatRupiah(group.detected)}</strong>{typeof group.detected === "number" && group.detected < group.due && <small>{formatRupiah(group.due - group.detected)} short, will be recorded as a deposit</small>}{typeof group.detected === "number" && group.detected > group.due && <small>{formatRupiah(group.detected - group.due)} more than the bill</small>}</div>
        {needsReview.length ? <div className="pr-warning"><p>{needsReview.map(p => p.name).join(", ")} {needsReview.length === 1 ? "needs a" : "need a"} bill review before approval.</p><button className="td-secondary" onClick={() => onReviewBill(needsReview[0])}><Pencil size={14}/> Review bill</button></div> : <>
          <div className="pr-actions">
            <button className="pr-approve" disabled={busy} onClick={() => approve(received)}><Check size={16}/> Approve {formatRupiah(received)}</button>
            <button className="pr-reject" disabled={busy} onClick={() => act(() => mutate({ action: "payment.reject", participantIds: ids, reason: "" }))}><X size={16}/> Reject</button>
          </div>
          {partial === null ? <button className="pr-partial-link" onClick={() => setPartial(received)}>Different amount</button> : <div className="pr-partial">
            <label className="ts-field"><span className="ts-field-label">Amount received (Rp)</span><span className="ts-control"><input type="number" min={1} value={partial || ""} onChange={e => setPartial(Number(e.target.value))}/></span></label>
            <button className="td-button" disabled={busy || !partial || partial <= 0} onClick={() => approve(partial)}>Approve amount</button>
          </div>}
        </>}
      </div>
    </div>}
  </Modal>;
}
