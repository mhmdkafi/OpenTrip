import { describe, it } from "node:test";
import assert from "node:assert";
import { calculatePeriodBoundaries, createCustomPeriod } from "./report";

describe("Period boundary calculations", () => {
  it("should calculate week boundaries from Monday to Monday", () => {
    const wednesday = new Date(2026, 8, 9, 12, 0, 0);
    const period = calculatePeriodBoundaries("week", wednesday);

    assert.strictEqual(period.startDate.getDay(), 1);
    assert.strictEqual(period.startDate.getHours(), 0);
    assert.strictEqual(period.startDate.getMinutes(), 0);

    const expectedStart = new Date(2026, 8, 7, 0, 0, 0, 0);
    const expectedEnd = new Date(2026, 8, 14, 0, 0, 0, 0);

    assert.strictEqual(period.startDate.getTime(), expectedStart.getTime());
    assert.strictEqual(period.endDate.getTime(), expectedEnd.getTime());
  });

  it("should calculate month boundaries from first to first", () => {
    const midMonth = new Date(2026, 8, 15, 12, 0, 0);
    const period = calculatePeriodBoundaries("month", midMonth);

    assert.strictEqual(period.startDate.getDate(), 1);
    assert.strictEqual(period.startDate.getMonth(), 8);
    assert.strictEqual(period.endDate.getDate(), 1);
    assert.strictEqual(period.endDate.getMonth(), 9);
  });

  it("should calculate year boundaries from Jan 1 to Jan 1", () => {
    const midYear = new Date(2026, 6, 15, 12, 0, 0);
    const period = calculatePeriodBoundaries("year", midYear);

    assert.strictEqual(period.startDate.getMonth(), 0);
    assert.strictEqual(period.startDate.getDate(), 1);
    assert.strictEqual(period.startDate.getFullYear(), 2026);
    assert.strictEqual(period.endDate.getMonth(), 0);
    assert.strictEqual(period.endDate.getDate(), 1);
    assert.strictEqual(period.endDate.getFullYear(), 2027);
  });

  it("should handle Sunday in week calculation", () => {
    const sunday = new Date(2026, 8, 13, 12, 0, 0);
    const period = calculatePeriodBoundaries("week", sunday);

    assert.strictEqual(period.startDate.getDay(), 1);
    const expectedStart = new Date(2026, 8, 7, 0, 0, 0, 0);
    assert.strictEqual(period.startDate.getTime(), expectedStart.getTime());
  });

  it("should create custom period with valid dates", () => {
    const start = new Date(2026, 8, 1);
    const end = new Date(2026, 8, 10);
    const period = createCustomPeriod(start, end);

    assert.strictEqual(period.filterType, "custom");
    assert.strictEqual(period.startDate.getHours(), 0);
    assert.strictEqual(period.endDate.getHours(), 0);
  });

  it("should throw error for invalid custom period", () => {
    const start = new Date(2026, 8, 10);
    const end = new Date(2026, 8, 5);

    assert.throws(() => {
      createCustomPeriod(start, end);
    }, /End date must be after start date/);
  });

  it("should normalize time to midnight for custom periods", () => {
    const start = new Date(2026, 8, 1, 15, 30, 45);
    const end = new Date(2026, 8, 10, 22, 15, 30);
    const period = createCustomPeriod(start, end);

    assert.strictEqual(period.startDate.getHours(), 0);
    assert.strictEqual(period.startDate.getMinutes(), 0);
    assert.strictEqual(period.endDate.getHours(), 0);
    assert.strictEqual(period.endDate.getMinutes(), 0);
  });
});
