import { test } from "node:test";
import assert from "node:assert/strict";
import { applyCommand, DomainError } from "./commands";
import { emptyWorkspace, availableStock, type Workspace, type Inventory } from "./types";

const userId = "tester";
let seq = 0;
const reqId = () => `00000000-0000-4000-8000-${String(seq++).padStart(12, "0")}`;

const tripId = "11111111-1111-4111-8111-111111111111";
const itemId = "22222222-2222-4222-8222-222222222222";

function baseState(): Workspace {
  const state = emptyWorkspace();
  state.trips.push({
    id: tripId,
    title: "Trip A",
    departureDate: "2026-10-01",
    status: "active",
    fullPrice: 100000,
    nonPrice: 80000,
    raincoatPrice: 15000,
  });
  return state;
}

function withItem(overrides: Partial<Inventory> = {}): Workspace {
  const state = baseState();
  state.inventory.push({
    id: itemId,
    name: "Tenda dome",
    kind: "rental",
    total: 10,
    damaged: 0,
    loans: [],
    ...overrides,
  });
  return state;
}

test("inventory.create adds item with zeroed damage and no loans", () => {
  const state = applyCommand(baseState(), { action: "inventory.create", name: "Kompor", kind: "operational", total: 5 }, userId, reqId());
  const item = state.inventory[0];
  assert.equal(item.name, "Kompor");
  assert.equal(item.total, 5);
  assert.equal(item.damaged, 0);
  assert.deepEqual(item.loans, []);
});

test("inventory.create rejects a tracked item with zero starting stock", () => {
  assert.throws(
    () => applyCommand(baseState(), { action: "inventory.create", name: "Kompor", kind: "operational", total: 0 }, userId, reqId()),
    /Stok awal minimal 1 barang/,
  );
});

test("inventory.create allows zero stock for an untracked item", () => {
  const state = applyCommand(baseState(), { action: "inventory.create", name: "P3K", kind: "operational", total: 0, stockTracked: false }, userId, reqId());
  assert.equal(state.inventory[0].total, 0);
});

test("inventory.update accepts an empty reason", () => {
  const state = applyCommand(withItem(), { action: "inventory.update", itemId, name: "Tenda dome", kind: "rental", total: 10, damaged: 0, reason: "" }, userId, reqId());
  assert.equal(state.inventory[0].name, "Tenda dome");
});

test("inventory.update rejects switching a loaned item to consumable", () => {
  const state = withItem({ loans: [{ id: reqId(), tripId, quantity: 2, returned: false }] });
  assert.throws(
    () => applyCommand(state, { action: "inventory.update", itemId, name: "Tenda dome", kind: "rental", total: 10, consumable: true, damaged: 0, reason: "test" }, userId, reqId()),
    /Selesaikan peminjaman/,
  );
});

test("inventory.update rejects total lower than damaged plus loaned", () => {
  const state = withItem({ loans: [{ id: reqId(), tripId, quantity: 3, returned: false }] });
  assert.throws(
    () => applyCommand(state, { action: "inventory.update", itemId, name: "Tenda dome", kind: "rental", total: 2, damaged: 0, reason: "test" }, userId, reqId()),
    /Stok total tidak boleh kurang/,
  );
});

test("inventory.update applies fields when stock stays consistent", () => {
  const state = applyCommand(withItem(), { action: "inventory.update", itemId, name: "Tenda dome 6 orang", kind: "rental", total: 12, damaged: 1, reason: "tambah stok" }, userId, reqId());
  const item = state.inventory[0];
  assert.equal(item.name, "Tenda dome 6 orang");
  assert.equal(item.total, 12);
  assert.equal(item.damaged, 1);
});

test("inventory.delete rejects an item with an active loan", () => {
  const state = withItem({ loans: [{ id: reqId(), tripId, quantity: 1, returned: false }] });
  assert.throws(
    () => applyCommand(state, { action: "inventory.delete", itemId }, userId, reqId()),
    /masih dipinjam/,
  );
});

test("inventory.delete removes an item with no active loans", () => {
  const state = applyCommand(withItem({ loans: [{ id: reqId(), tripId, quantity: 1, returned: true }] }), { action: "inventory.delete", itemId }, userId, reqId());
  assert.equal(state.inventory.length, 0);
});

test("inventory.consume rejects a non-consumable item", () => {
  const state = withItem();
  assert.throws(
    () => applyCommand(state, { action: "inventory.consume", itemId, quantity: 1, reason: "pakai" }, userId, reqId()),
    /hanya untuk barang habis pakai/,
  );
});

test("inventory.consume rejects quantity above available stock", () => {
  const state = withItem({ consumable: true, total: 5 });
  assert.throws(
    () => applyCommand(state, { action: "inventory.consume", itemId, quantity: 6, reason: "pakai" }, userId, reqId()),
    /Stok tersedia tidak mencukupi/,
  );
});

test("inventory.consume reduces total stock", () => {
  const state = applyCommand(withItem({ consumable: true, total: 5 }), { action: "inventory.consume", itemId, quantity: 2, reason: "pakai untuk trip" }, userId, reqId());
  assert.equal(state.inventory[0].total, 3);
});

test("inventory.adjust rejects a total lower than damaged plus loaned", () => {
  const state = withItem({ loans: [{ id: reqId(), tripId, quantity: 4, returned: false }] });
  assert.throws(
    () => applyCommand(state, { action: "inventory.adjust", itemId, total: 3, damaged: 1, reason: "koreksi" }, userId, reqId()),
    /Stok total tidak boleh kurang/,
  );
});

test("inventory.adjust sets total and damaged directly", () => {
  const state = applyCommand(withItem(), { action: "inventory.adjust", itemId, total: 8, damaged: 2, reason: "stock opname" }, userId, reqId());
  assert.equal(state.inventory[0].total, 8);
  assert.equal(state.inventory[0].damaged, 2);
});

test("inventory.lend rejects a consumable item", () => {
  const state = withItem({ consumable: true, total: 5 });
  assert.throws(
    () => applyCommand(state, { action: "inventory.lend", itemId, tripId, quantity: 1 }, userId, reqId()),
    /hanya untuk barang kembali/,
  );
});

test("inventory.lend rejects lending to a non-active trip", () => {
  const state = withItem();
  state.trips[0].status = "cancelled";
  assert.throws(
    () => applyCommand(state, { action: "inventory.lend", itemId, tripId, quantity: 1 }, userId, reqId()),
    /Trip aktif/,
  );
});

test("inventory.lend rejects quantity above available stock", () => {
  const state = withItem({ total: 3 });
  assert.throws(
    () => applyCommand(state, { action: "inventory.lend", itemId, tripId, quantity: 4 }, userId, reqId()),
    /Stok tersedia tidak mencukupi/,
  );
});

test("inventory.lend records a new active loan", () => {
  const state = applyCommand(withItem(), { action: "inventory.lend", itemId, tripId, quantity: 4, notes: "dibawa tim logistik" }, userId, reqId());
  const item = state.inventory[0];
  assert.equal(item.loans.length, 1);
  assert.equal(item.loans[0].quantity, 4);
  assert.equal(item.loans[0].returned, false);
  assert.equal(availableStock(item), 6);
});

test("inventory.return marks a loan as returned and frees stock", () => {
  const loanId = reqId();
  const state = applyCommand(withItem({ loans: [{ id: loanId, tripId, quantity: 4, returned: false }] }), { action: "inventory.return", itemId, loanId }, userId, reqId());
  const item = state.inventory[0];
  assert.equal(item.loans[0].returned, true);
  assert.equal(availableStock(item), 10);
});

test("inventory.return rejects an already-returned loan", () => {
  const loanId = reqId();
  const state = withItem({ loans: [{ id: loanId, tripId, quantity: 4, returned: true }] });
  assert.throws(
    () => applyCommand(state, { action: "inventory.return", itemId, loanId }, userId, reqId()),
    /sudah dikembalikan/,
  );
});

test("inventory.incident with kind lost reduces total stock and the linked loan", () => {
  const loanId = reqId();
  const state = applyCommand(
    withItem({ loans: [{ id: loanId, tripId, quantity: 4, returned: false }] }),
    { action: "inventory.incident", itemId, loanId, kind: "lost", quantity: 2, description: "tenda hilang di trip" },
    userId,
    reqId(),
  );
  const item = state.inventory[0];
  assert.equal(item.total, 8);
  assert.equal(item.loans[0].quantity, 2);
  assert.equal(item.loans[0].returned, false);
  assert.equal(item.incidents?.length, 1);
  assert.equal(item.incidents?.[0].kind, "lost");
});

test("inventory.incident with kind damaged increases damaged count and returns a fully-affected loan", () => {
  const loanId = reqId();
  const state = applyCommand(
    withItem({ loans: [{ id: loanId, tripId, quantity: 2, returned: false }] }),
    { action: "inventory.incident", itemId, loanId, kind: "damaged", quantity: 2, description: "kotor terkena lumpur" },
    userId,
    reqId(),
  );
  const item = state.inventory[0];
  assert.equal(item.damaged, 2);
  assert.equal(item.loans[0].quantity, 0);
  assert.equal(item.loans[0].returned, true);
});

test("inventory.incident with kind note never touches stock counts", () => {
  const state = applyCommand(withItem(), { action: "inventory.incident", itemId, kind: "note", quantity: 0, description: "cek kondisi rutin" }, userId, reqId());
  const item = state.inventory[0];
  assert.equal(item.total, 10);
  assert.equal(item.damaged, 0);
  assert.equal(item.incidents?.[0].kind, "note");
});

test("inventory.incident rejects quantity above the linked loan's quantity", () => {
  const loanId = reqId();
  const state = withItem({ loans: [{ id: loanId, tripId, quantity: 2, returned: false }] });
  assert.throws(
    () => applyCommand(state, { action: "inventory.incident", itemId, loanId, kind: "lost", quantity: 3, description: "hilang" }, userId, reqId()),
    /melebihi barang pada lokasi/,
  );
});

test("inventory.incident rejects an affecting quantity on an untracked item", () => {
  const state = withItem({ stockTracked: false });
  assert.throws(
    () => applyCommand(state, { action: "inventory.incident", itemId, kind: "damaged", quantity: 1, description: "rusak" }, userId, reqId()),
    /stok harus tercatat/,
  );
});

test("applyCommand is idempotent for a repeated request id", () => {
  const request = reqId();
  const once = applyCommand(baseState(), { action: "inventory.create", name: "Kompor", kind: "operational", total: 5 }, userId, request);
  const twice = applyCommand(once, { action: "inventory.create", name: "Kompor", kind: "operational", total: 5 }, userId, request);
  assert.equal(twice.inventory.length, 1);
});

test("DomainError carries the expected default status", () => {
  const error = new DomainError("contoh");
  assert.equal(error.status, 400);
});
