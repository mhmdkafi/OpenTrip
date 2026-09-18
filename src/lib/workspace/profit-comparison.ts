import type { Cash } from "./types";
import { cashDate, filterPeriod, previousReference } from "./finance-view";

export type ProfitPeriod = "month" | "year";

// Compare calendar days/months, not rolling balances. A missing calendar date is
// null; a date with no recorded transactions is zero.
export function profitComparison(entries: Cash[], period: ProfitPeriod, reference: string) {
  const previous = previousReference(period, reference);
  const label = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("id-ID", {
    year: "numeric", ...(period === "month" ? { month: "long" as const } : {}), timeZone: "UTC",
  });
  const bucketCount = (date: string) => period === "year" ? 12 : new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0)).getUTCDate();
  const bucket = (date: string) => Number(period === "year" ? date.slice(5, 7) : date.slice(8, 10)) - 1;
  function values(date: string) {
    const selected = filterPeriod(entries, period, date);
    const net = Array<number>(bucketCount(date)).fill(0);
    for (const entry of selected) net[bucket(cashDate(entry))] += entry.direction === "in" ? entry.amount : -entry.amount;
    return { net, count: selected.length };
  }
  const current = values(reference), prior = values(previous);
  return {
    currentLabel: label(reference), previousLabel: label(previous),
    hasTransactions: current.count + prior.count > 0,
    points: Array.from({ length: Math.max(current.net.length, prior.net.length) }, (_, index) => ({
      label: period === "year" ? new Date(Date.UTC(2000, index, 1)).toLocaleDateString("id-ID", { month: "short", timeZone: "UTC" }) : String(index + 1),
      current: current.net[index] ?? null,
      previous: prior.net[index] ?? null,
    })),
  };
}

// A running net result makes the progress of two periods comparable even when
// transactions are sparse. Null still means that calendar date does not exist.
export function cumulativeProfitComparison(entries: Cash[], period: ProfitPeriod, reference: string) {
  const comparison = profitComparison(entries, period, reference);
  let current = 0, previous = 0;
  return {
    ...comparison,
    points: comparison.points.map(point => ({
      label: point.label,
      current: point.current === null ? null : (current += point.current),
      previous: point.previous === null ? null : (previous += point.previous),
      currentChange: point.current,
      previousChange: point.previous,
    })),
  };
}
