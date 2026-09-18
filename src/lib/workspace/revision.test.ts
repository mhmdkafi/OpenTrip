import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyCommand, commandSchema } from "./commands";
import { prototypeWorkspace } from "./prototype";
import { availableStock } from "./types";
import { tripStatus } from "./presentation";
import { cashSeries, cashTotals, filterPeriod, previousReference, profitChange } from "./finance-view";
import { periodBounds } from "./period";
const command = (state: ReturnType<typeof prototypeWorkspace>, input: unknown) => applyCommand(state, commandSchema.parse(input), "test-admin", crypto.randomUUID());
describe("Client PDF UI revision — state and finance", () => {
  it("uses each trip's threshold and risk window without counting cancelled people", () => {
    const state = prototypeWorkspace(), trip = state.trips[0];
    assert.equal(tripStatus(trip, state, "2026-09-13"), "upcoming");
    trip.minimumParticipants = 22;
    assert.equal(tripStatus(trip, state, "2026-09-13"), "risk");
    assert.equal(tripStatus(trip, state, "2026-09-12"), "upcoming");
    trip.status = "cancelled";
    assert.equal(tripStatus(trip, state, "2026-09-21"), "cancelled");
  });
  it("edits details but rejects changes to paid prices or occupied mepo points", () => {
    const state = prototypeWorkspace(), trip = state.trips[0];
    const update = { ...trip, action: "trip.update", tripId: trip.id, title: "Malabar baru" };
    const changed = command(state, update);
    assert.equal(changed.trips[0].title, "Malabar baru");
    assert.throws(() => command(state, { ...update, fullPrice: 1 }), /sudah membayar/);
    assert.throws(() => command(state, { ...update, meetingPoints: ["Mepo baru"] }), /masih digunakan/);
    assert.equal(state.trips[0].title, "Puncak Besar Malabar");
  });
  it("edits and deletes only expenses, preserves income and records reasons", () => {
    const state = prototypeWorkspace(), expense = state.cash.find(c => c.direction === "out")!;
    const changed = command(state, { action: "expense.update", expenseId: expense.id, amount: 12345, date: "2026-10-01", category: "Logistik", description: "Koreksi logistik" });
    assert.equal(changed.cash.find(c => c.id === expense.id)?.occurredAt, "2026-09-30T17:00:00.000Z");
    const removed = command(changed, { action: "expense.delete", expenseId: expense.id, reason: "Salah catat" });
    assert.equal(removed.cash.some(c => c.id === expense.id), false);
    assert.match(removed.audit.at(-1)!.detail, /Salah catat/);
    assert.throws(() => command(state, { action: "expense.delete", expenseId: state.cash.find(c => c.direction === "in")!.id, reason: "test" }), /tidak ditemukan/);
  });
  it("keeps consumables separate from loans and rejects overdraw or deleting lent equipment", () => {
    const state = prototypeWorkspace(), sticker = state.inventory.find(i => i.consumable)!;
    const used = command(state, { action: "inventory.consume", itemId: sticker.id, quantity: 3, reason: "Malabar" });
    assert.equal(availableStock(used.inventory.find(i => i.id === sticker.id)!), sticker.total - 3);
    assert.equal(used.inventory.find(i => i.id === sticker.id)!.loans.length, 0);
    assert.throws(() => command(state, { action: "inventory.consume", itemId: sticker.id, quantity: 99, reason: "Uji" }), /tidak mencukupi/);
    assert.throws(() => command(state, { action: "inventory.delete", itemId: state.inventory[0].id }), /masih dipinjam/);
    assert.throws(() => command(state, { action: "inventory.lend", itemId: sticker.id, tripId: state.trips[0].id, quantity: 1 }), /barang kembali/);
  });
  it("keeps period and graph totals equal, including WIB month boundaries and negative comparison", () => {
    const state = prototypeWorkspace();
    const extra = { ...state.cash[0], id: crypto.randomUUID(), amount: 7000, occurredAt: "2026-09-30T17:00:00.000Z" };
    const entries = [...state.cash, extra];
    const baseLength = state.cash.filter(c => Date.parse(c.occurredAt) >= periodBounds("month", "2026-09-13")[0] && Date.parse(c.occurredAt) < periodBounds("month", "2026-09-13")[1]).length;
    assert.equal(filterPeriod(entries, "month", "2026-09-13").length, baseLength);
    for (const period of ["week", "month", "year"]) {
      const expected = cashTotals(filterPeriod(entries, period, "2026-09-13"));
      const series = cashSeries(entries, period, "2026-09-13");
      assert.equal(series.reduce((s, p) => s + p.income, 0), expected.income);
      assert.equal(series.reduce((s, p) => s + p.expense, 0), expected.expense);
    }
    assert.equal(previousReference("month", "2026-03-31"), "2026-02-01");
    assert.equal(previousReference("year", "2024-02-29"), "2023-01-01");
    assert.equal(profitChange(100, 0), null);
    assert.equal(profitChange(100, -100), 200);
  });
});
