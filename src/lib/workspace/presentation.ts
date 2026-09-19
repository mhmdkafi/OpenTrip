import { paidFor, type Trip, type Workspace } from "./types";

export const todayWib = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
export const dateLabel = (date: string, long = false) => !date ? "Belum dijadwalkan" : new Date(`${date.slice(0, 10)}T12:00:00+07:00`).toLocaleDateString("id-ID", { day: "numeric", month: long ? "long" : "short", year: "numeric" });
export const monthLabel = (date: string) => new Date(`${date.slice(0, 7)}-01T12:00:00+07:00`).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
export function weekKey(date: string) {
  if (!date) return "";
  const value = new Date(`${date.slice(0, 10)}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() - (value.getUTCDay() + 6) % 7);
  return value.toISOString().slice(0, 10);
}
export function tripStatus(trip: Trip, state: Workspace, today: string) {
  if (trip.status === "cancelled") return "cancelled";
  if (trip.status === "completed") return "done";
  if (!trip.departureDate) return "upcoming";
  if (trip.departureDate < today) return "done";
  const days = (Date.parse(trip.departureDate) - Date.parse(today)) / 86400000;
  const count = state.participants.filter(p => p.tripId === trip.id && p.status === "active").length;
  return trip.status === "active" && days <= (trip.riskDays ?? 7) && count < (trip.minimumParticipants ?? 7) ? "risk" : "upcoming";
}
export const statusLabel = { upcoming: "On coming", done: "Done", cancelled: "Cancel", risk: "At risk" };
export function tripFigures(state: Workspace, tripId: string) {
  const people = state.participants.filter(p => p.tripId === tripId && p.status === "active");
  return { people, remaining: people.reduce((sum, p) => sum + Math.max(0, p.charge - paidFor(state, p.id)), 0), paid: people.filter(p => p.reviewed && paidFor(state, p.id) >= p.charge).length };
}
