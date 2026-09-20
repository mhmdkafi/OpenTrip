import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { importSpreadsheet } from "../src/lib/workspace/auto-import";
import { importRows } from "../src/lib/workspace/import";
import { emptyWorkspace } from "../src/lib/workspace/types";
import { createSourceFingerprint, reconcileSourceRows } from "../src/lib/sync";

const metadata = { spreadsheetId: "test_spreadsheet_1234567890", title: "Malabar Vol 12", locale: "id_ID" };
const sheet = { sheetId: 7, title: "Form Responses 1" };
const headers = ["Timestamp", "Nama Lengkap", "Fasilitas", "Mepo", "No Whatsapp", "Bukti transfer"];
const row = ["10/09/2026 08:00:00", "Peserta Satu", "Full", "Bandung", "081234567890", "https://drive.google.com/file/d/AbCdEfGhIjKlMnOpQrStUvWx/view"];
const initial = () => importSpreadsheet(emptyWorkspace(), metadata, sheet, [headers, row], "test-admin", undefined, "2026-09-20");

describe("Import and resync preserve database corrections", () => {
  it("creates a trip from metadata and reimports without duplicating participants", () => {
    const first = initial();
    const repeat = importSpreadsheet(first.state, metadata, sheet, [headers, row], "test-admin");
    assert.equal(first.state.trips[0].departureDate, "2026-09-20");
    assert.match(first.state.trips[0].title, /Malabar/);
    assert.equal(repeat.state.trips.length, 1); assert.equal(repeat.state.bookings.length, 1); assert.equal(repeat.state.participants.length, 1);
    assert.equal(repeat.stats.unchanged, 1);
  });
  it("updates safe source changes while keeping local MEPO and bill corrections", () => {
    const { state } = initial();
    state.participants[0].meetingPoint = "Koreksi admin";
    state.participants[0].charge = 123456;
    const changed = [...row]; changed[3] = "Cimahi"; changed[4] = "089999999999";
    const result = importSpreadsheet(state, metadata, sheet, [headers, changed], "test-admin");
    assert.equal(result.state.participants[0].meetingPoint, "Koreksi admin");
    assert.equal(result.state.participants[0].charge, 123456);
    assert.equal(result.state.bookings[0].phone, "089999999999");
    assert.match(result.state.sources[0].review.join(" "), /diedit lokal/);
    assert.equal(state.bookings[0].phone, row[4]);
  });
  it("holds identity/billing changes for review and never rewrites verified transactions", () => {
    const { state } = initial();
    state.payments.push({ id: "payment", tripId: state.trips[0].id, amount: 100, method: "transfer", notes: "", verifiedAt: "2026-09-10T01:00:00Z", allocations: [{ participantId: state.participants[0].id, amount: 100 }], proof: "original-proof" });
    const changed = [...row]; changed[2] = "Non";
    const result = importRows(state, state.sources[0], [changed], "test-admin");
    assert.equal(result.state.participants[0].facility, "Full Transport");
    assert.deepEqual(result.state.payments, state.payments);
    assert.match(result.state.sources[0].review.join(" "), /identitas\/tagihan/);
  });
  it("keeps missing bookings and handles ambiguous duplicate identities without last-row wins", () => {
    const { state } = initial();
    const removed = importRows(state, state.sources[0], [], "test-admin");
    assert.equal(removed.state.bookings.length, 1);
    const changed = [...row]; changed[3] = "Cimahi";
    const ambiguous = importRows(state, state.sources[0], [row, changed], "test-admin");
    assert.equal(ambiguous.state.participants[0].meetingPoint, "Bandung");
    assert.match(ambiguous.state.sources[0].review.join(" "), /isi berbeda/);
  });
  it("keeps legacy bookings without snapshots for review", () => {
    const { state } = initial(); delete state.bookings[0].sourceSnapshot;
    const changed = [...row]; changed[4] = "089999999999";
    const result = importRows(state, state.sources[0], [changed], "test-admin");
    assert.equal(result.state.bookings[0].phone, row[4]);
    assert.match(result.state.sources[0].review.join(" "), /snapshot lama/);
  });
  it("does not collapse case-sensitive Drive IDs into the same fingerprint", () => {
    assert.notEqual(createSourceFingerprint({ proof_refs: "AbCd" }), createSourceFingerprint({ proof_refs: "abcd" }));
    assert.notEqual(createSourceFingerprint({ a: "x\nb:y" }), createSourceFingerprint({ a: "x", b: "y" }));
  });
  it("requires stable timestamp AND name in the standalone reconciliation helper", () => {
    const source = { registered_at: "2026-09-10", raw_name: "A", contact_phone: "081111111111" };
    const [result] = reconcileSourceRows([{ rowNumber: 2, values: { ...source, raw_name: "B" } }], [{ bookingId: "booking", rowNumber: 2, fingerprint: createSourceFingerprint(source), snapshot: source }]);
    assert.equal(result.action, "review");
  });
});
