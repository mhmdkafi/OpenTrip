import { paidFor, type Person, type Workspace } from "./types";

export type ProofGroup = { key: string; proof: string; tripId: string; people: Person[]; due: number; registeredAt: string };

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
    const group = groups.get(key) ?? { key, proof: booking.proof, tripId: person.tripId, people: [], due: 0, registeredAt: booking.registeredAt };
    group.people.push(person); group.due += due;
    if (booking.registeredAt < group.registeredAt) group.registeredAt = booking.registeredAt;
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => a.registeredAt.localeCompare(b.registeredAt));
}
