import type { Cash, Trip } from "./types";
import { periodBounds } from "./period";
// Participant payments belong to the trip they paid for: in cashflow they are counted on the
// trip's departure date, while the real transfer time is kept in recordedAt for display.
export function attributeToTrips(cash: Cash[], trips: Trip[]): Cash[] {
  const departures = new Map(trips.filter(t => t.departureDate).map(t => [t.id, t.departureDate]));
  return cash.map(entry => {
    const departure = entry.direction === "in" ? departures.get(entry.tripId) : undefined;
    return departure ? { ...entry, recordedAt: entry.occurredAt, occurredAt: new Date(`${departure}T12:00:00+07:00`).toISOString() } : entry;
  });
}
export const recordedTime = (entry: Cash) => entry.recordedAt ?? entry.occurredAt;
export const cashDate = (entry: Cash) => new Date(entry.occurredAt).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
export function cashTotals(entries: Cash[]) {
  const income = entries.filter(c => c.direction === "in").reduce((s, c) => s + c.amount, 0);
  const expense = entries.filter(c => c.direction === "out").reduce((s, c) => s + c.amount, 0);
  return { income, expense, net: income - expense };
}
export function filterPeriod(entries: Cash[], period: string, reference: string) {
  const [start, end] = periodBounds(period, reference);
  return entries.filter(c => Date.parse(c.occurredAt) >= start && Date.parse(c.occurredAt) < end);
}
export function previousReference(period: string, reference: string) {
  const value = new Date(`${reference}T12:00:00Z`);
  if (period === "week") value.setUTCDate(value.getUTCDate() - 7);
  else if (period === "year") { value.setUTCMonth(0, 1); value.setUTCFullYear(value.getUTCFullYear() - 1); }
  else { value.setUTCDate(1); value.setUTCMonth(value.getUTCMonth() - 1); }
  return value.toISOString().slice(0, 10);
}
export function profitChange(current: number, previous: number) {
  if (previous === 0) return null;
  return (current - previous) / Math.abs(previous) * 100;
}
