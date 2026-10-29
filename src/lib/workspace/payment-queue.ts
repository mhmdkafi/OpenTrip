import { paidFor, type Person, type Workspace } from "./types";

// `detected` is the amount read from the proof image: undefined while unread, null when it could not be read.
export type ProofGroup = { key: string; proof: string; tripId: string; people: Person[]; due: number; registeredAt: string; detected?: number | null };

// Participants with an uploaded, undecided proof and an unpaid balance; one transfer
// proof shared by several participants is reviewed once for all of them.
export function pendingProofs(state: Workspace, tripId?: string): ProofGroup[] {
  const groups = new Map<string, ProofGroup>();
  const bookings = new Map(state.bookings.map(b => [b.id, b]));
  for (const person of state.participants) {
    if (person.status !== "active" || (tripId && person.tripId !== tripId)) continue;
    const booking = bookings.get(person.bookingId);
    const due = person.charge - paidFor(state, person.id);
    // A proof leaves the queue once decided, even when a deposit leaves a balance.
    if (!booking?.proof || booking.proofStatus || due <= 0) continue;
    const key = `${person.tripId}|${booking.proof}`;
    const group = groups.get(key) ?? { key, proof: booking.proof, tripId: person.tripId, people: [], due: 0, registeredAt: booking.registeredAt, detected: booking.proofAmount };
    group.people.push(person); group.due += due;
    if (booking.registeredAt < group.registeredAt) group.registeredAt = booking.registeredAt;
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => a.registeredAt.localeCompare(b.registeredAt));
}

// Proof links in the review queue whose amount has not been read yet.
export function unscannedProofs(state: Workspace, tripId?: string) {
  return [...new Set(pendingProofs(state, tripId).filter(group => group.detected === undefined).map(group => group.proof))];
}

// Amount each participant appears to have paid according to their pending proof, split
// across a shared proof in list order (the same order payment.verify allocates in).
// Values are numbers once read, null when unreadable, undefined while unread.
export function claimedAmounts(state: Workspace, tripId?: string) {
  const claimed = new Map<string, number | null | undefined>();
  for (const group of pendingProofs(state, tripId)) {
    let left = group.detected;
    for (const person of group.people) {
      if (left == null) { claimed.set(person.id, left); continue; }
      const share = Math.min(left, person.charge - paidFor(state, person.id));
      claimed.set(person.id, share); left -= share;
    }
    // An overpayment shows on the last participant of the proof.
    const last = group.people[group.people.length - 1];
    if (left && last) claimed.set(last.id, (claimed.get(last.id) ?? 0) + left);
  }
  return claimed;
}
