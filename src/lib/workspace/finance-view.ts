import type { Cash } from "./types";
import { periodBounds } from "./period";
import { weekKey } from "./presentation";
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
export function cashSeries(entries: Cash[], period: string, reference: string) {
  const [start, end] = periodBounds(period, reference);
  const groups = new Map<string, { label: string; entries: Cash[] }>();
  const day = new Date(start + 7 * 3600000);
  while (day.getTime() < end + 7 * 3600000) {
    const date = day.toISOString().slice(0, 10);
    const key = period === "year" ? date.slice(0, 7) : period === "week" ? date : weekKey(date);
    if (!groups.has(key)) groups.set(key, { label: period === "year" ? day.toLocaleDateString("id-ID", { month: "short", timeZone: "UTC" }) : period === "week" ? day.toLocaleDateString("id-ID", { weekday: "short", timeZone: "UTC" }) : `${day.getUTCDate()} ${day.toLocaleDateString("id-ID", { month: "short", timeZone: "UTC" })}`, entries: [] });
    day.setUTCDate(day.getUTCDate() + 1);
  }
  for (const entry of filterPeriod(entries, period, reference)) {
    const date = cashDate(entry);
    groups.get(period === "year" ? date.slice(0, 7) : period === "week" ? date : weekKey(date))?.entries.push(entry);
  }
  return [...groups.entries()].map(([key, group]) => ({ key, label: group.label, ...cashTotals(group.entries) }));
}
