export type Trip = { id: string; title: string; departureDate: string; status: "active" | "archived" | "completed" | "cancelled"; fullPrice: number; nonPrice: number; raincoatPrice: number; volume?: string; location?: string; bankAccount?: string; meetingPoints?: string[]; minimumParticipants?: number; riskDays?: number };
export type Booking = { id: string; tripId: string; sourceId: string; fingerprint: string; registeredAt: string; rawName: string; proof: string; phone: string; sourceSnapshot?: Record<string,string>; proofStatus?: "approved" | "rejected" };
export type Person = { id: string; bookingId: string; tripId: string; name: string; meetingPoint: string; facility: string; raincoats: number | null; charge: number; reviewed: boolean; status: "active" | "cancelled" };
export type Payment = { id: string; tripId: string; amount: number; method: string; notes: string; verifiedAt: string; allocations: { participantId: string; amount: number }[]; proof: string };
export type Cash = { id: string; tripId: string; direction: "in" | "out"; amount: number; occurredAt: string; description: string; category: string; sourceId: string; dateSource: "registration" | "manual"; recordedAt?: string };
export type Inventory = { id: string; name: string; kind: "operational" | "rental"; total: number; damaged: number; consumable?: boolean; stockTracked?: boolean; reorderLevel?: number; imageUrl?: string; incidents?: { id: string; at: string; description: string; kind: "lost" | "damaged" | "note"; quantity: number; tripId?: string }[]; loans: { id: string; tripId: string; quantity: number; returned: boolean; notes?: string }[] };
export type Source = { dateOrder?: "dmy" | "mdy"; id: string; tripId: string; spreadsheetId: string; sheetId: number; sheetTitle: string; headerRow: number; headers: string[]; mapping: Record<string, number>; lastSuccessAt: string; lastError?: string; review: string[] };
export type Audit = { id: string; userId: string; at: string; action: string; detail: string };
export type Workspace = { trips: Trip[]; bookings: Booking[]; participants: Person[]; payments: Payment[]; cash: Cash[]; inventory: Inventory[]; sources: Source[]; audit: Audit[]; requests: string[] };
export const emptyWorkspace = (): Workspace => ({ trips: [], bookings: [], participants: [], payments: [], cash: [], inventory: [], sources: [], audit: [], requests: [] });
const paidIndex = new WeakMap<Payment[], { length: number; totals: Map<string, number> }>();
export function paidFor(state: Workspace, personId: string) {
  let index = paidIndex.get(state.payments);
  if (!index || index.length !== state.payments.length) {
    const totals = new Map<string, number>();
    for (const payment of state.payments) for (const a of payment.allocations) totals.set(a.participantId, (totals.get(a.participantId) ?? 0) + a.amount);
    index = { length: state.payments.length, totals };
    paidIndex.set(state.payments, index);
  }
  return index.totals.get(personId) ?? 0;
}
export const availableStock = (item: Inventory) => item.total - item.damaged - item.loans.filter(l => !l.returned).reduce((sum, l) => sum + l.quantity, 0);
