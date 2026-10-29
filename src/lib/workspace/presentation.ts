import { paidFor, type Trip, type Workspace } from "./types";

export const todayWib = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
export const dateLabel = (date: string, long = false) => !date ? "Not scheduled" : new Date(`${date.slice(0, 10)}T12:00:00+07:00`).toLocaleDateString("en-GB", { day: "numeric", month: long ? "long" : "short", year: "numeric" });
export const monthLabel = (date: string) => new Date(`${date.slice(0, 7)}-01T12:00:00+07:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
export function weekKey(date: string) {
  if (!date) return "";
  const value = new Date(`${date.slice(0, 10)}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() - (value.getUTCDay() + 6) % 7);
  return value.toISOString().slice(0, 10);
}
// Active participants grouped by trip, built once per participants array (it is replaced on every change).
const byTripCache = new WeakMap<Workspace["participants"], Map<string, Workspace["participants"]>>();
export function activeParticipants(state: Workspace, tripId: string) {
  let byTrip = byTripCache.get(state.participants);
  if (!byTrip) {
    byTrip = new Map();
    for (const p of state.participants) if (p.status === "active") { const list = byTrip.get(p.tripId); if (list) list.push(p); else byTrip.set(p.tripId, [p]); }
    byTripCache.set(state.participants, byTrip);
  }
  return byTrip.get(tripId) ?? [];
}
export function tripStatus(trip: Trip, state: Workspace, today: string) {
  if (trip.status === "cancelled") return "cancelled";
  if (trip.status === "completed") return "done";
  if (!trip.departureDate) return "upcoming";
  if (trip.departureDate < today) return "done";
  const days = (Date.parse(trip.departureDate) - Date.parse(today)) / 86400000;
  const count = activeParticipants(state, trip.id).length;
  return trip.status === "active" && days <= (trip.riskDays ?? 7) && count < (trip.minimumParticipants ?? 7) ? "risk" : "upcoming";
}
export const statusLabel = { upcoming: "Upcoming", done: "Done", cancelled: "Cancelled", risk: "At risk" };
export function tripFigures(state: Workspace, tripId: string) {
  const people = activeParticipants(state, tripId);
  return { people, remaining: people.reduce((sum, p) => sum + Math.max(0, p.charge - paidFor(state, p.id)), 0), paid: people.filter(p => p.reviewed && paidFor(state, p.id) >= p.charge).length };
}
