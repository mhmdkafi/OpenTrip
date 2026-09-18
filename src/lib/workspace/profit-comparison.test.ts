import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cumulativeProfitComparison, profitComparison } from "./profit-comparison";
import { cashTotals, filterPeriod, previousReference } from "./finance-view";
import { prototypeWorkspace } from "./prototype";
import type { Cash } from "./types";

const cash = (occurredAt: string, amount: number, direction: "in" | "out" = "in"): Cash => ({
  id: crypto.randomUUID(), tripId: "trip", occurredAt, amount, direction,
  description: "Test", category: "Lainnya", sourceId: "", dateSource: "manual",
});

describe("Net profit period comparison", () => {
  it("aligns daily net amounts, respects WIB boundaries, and retains losses", () => {
    const entries = [
      cash("2026-01-31T16:59:59Z", 100),
      cash("2026-01-31T17:00:00Z", 200),
      cash("2026-02-01T10:00:00Z", 300, "out"),
      cash("2026-02-28T17:00:00Z", 999),
    ];
    const original = structuredClone(entries);
    const result = profitComparison(entries, "month", "2026-02-20");
    assert.equal(result.currentLabel, "Februari 2026");
    assert.equal(result.previousLabel, "Januari 2026");
    assert.equal(result.points.length, 31);
    assert.deepEqual(result.points[0], { label: "1", current: -100, previous: 0 });
    assert.deepEqual(result.points[30], { label: "31", current: null, previous: 100 });
    assert.equal(result.points[27].current, 0);
    assert.equal(result.points[28].current, null);
    assert.deepEqual(entries, original);
  });
  it("distinguishes leap days and missing previous-month dates", () => {
    const february = profitComparison([cash("2024-02-29T10:00:00Z", 50)], "month", "2024-02-29");
    assert.equal(february.points[28].current, 50);
    assert.equal(february.points[29].current, null);
    const march = profitComparison([], "month", "2024-03-31");
    assert.deepEqual(march.points[29], { label: "30", current: 0, previous: null });
  });
  it("aligns annual monthly values across years and the WIB new-year boundary", () => {
    const result = profitComparison([
      cash("2025-01-01T10:00:00Z", 100), cash("2025-12-31T16:59:59Z", 30, "out"),
      cash("2025-12-31T17:00:00Z", 200), cash("2026-12-31T16:59:59Z", 50),
      cash("2026-12-31T17:00:00Z", 999),
    ], "year", "2026-09-16");
    assert.equal(result.previousLabel, "2025");
    assert.equal(result.points.length, 12);
    assert.deepEqual(result.points[0], { label: "Jan", current: 200, previous: 100 });
    assert.deepEqual(result.points[11], { label: "Des", current: 50, previous: -30 });
    assert.equal(profitComparison([], "month", "2026-01-31").previousLabel, "Desember 2025");
  });
  it("matches the cash summary for each complete period, without cumulative double-counting", () => {
    const entries = prototypeWorkspace().cash;
    for (const period of ["month", "year"] as const) {
      const reference = "2026-09-16";
      const result = profitComparison(entries, period, reference);
      assert.equal(result.points.reduce((sum, p) => sum + (p.current ?? 0), 0), cashTotals(filterPeriod(entries, period, reference)).net);
      assert.equal(result.points.reduce((sum, p) => sum + (p.previous ?? 0), 0), cashTotals(filterPeriod(entries, period, previousReference(period, reference))).net);
    }
  });
  it("treats a zero net result or prior-only transactions as recorded data", () => {
    assert.equal(profitComparison([], "month", "2026-09-16").hasTransactions, false);
    assert.equal(profitComparison([cash("2026-08-10T10:00:00Z", 10)], "month", "2026-09-16").hasTransactions, true);
    const zero = profitComparison([cash("2026-09-10T10:00:00Z", 10), cash("2026-09-10T10:00:00Z", 10, "out")], "month", "2026-09-16");
    assert.equal(zero.hasTransactions, true);
    assert.equal(zero.points[9].current, 0);
  });
  it("shows cumulative progress, including a drop after expenses and gaps for missing dates", () => {
    const comparison = cumulativeProfitComparison([
      cash("2026-03-01T12:00:00Z", 100),
      cash("2026-03-05T12:00:00Z", 30, "out"),
      cash("2026-02-01T12:00:00Z", 80),
      cash("2026-02-28T12:00:00Z", 10, "out"),
    ], "month", "2026-03-16");
    assert.deepEqual(comparison.points[0], { label: "1", current: 100, previous: 80, currentChange: 100, previousChange: 80 });
    assert.equal(comparison.points[3].current, 100);
    assert.equal(comparison.points[4].current, 70);
    assert.equal(comparison.points[27].previous, 70);
    assert.equal(comparison.points[28].previous, null);
    assert.equal(comparison.points[30].current, 70);
  });
});
