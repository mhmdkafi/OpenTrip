import { test } from "node:test";
import assert from "node:assert/strict";
import { applyCommand } from "./commands";
import { emptyWorkspace, type Workspace } from "./types";
import { isReminderDay, messageFor, normalizePhone, reminderQueue, renderMessage, waLink } from "./reminders";

const tripId = "11111111-1111-4111-8111-111111111111";
const ids = ["a", "b", "c", "d"].map((c, i) => `2222222${i}-2222-4222-8222-22222222222${c === "a" ? 0 : i}`);

function state(): Workspace {
  const s = emptyWorkspace();
  s.trips.push({ id: tripId, title: "Mt Artapela", volume: "Vol 11", departureDate: "2026-11-07", status: "active", fullPrice: 175000, nonPrice: 110000, raincoatPrice: 15000, bankAccount: "BCA 123" });
  const people = [["Owing", 175000, 100000, "0812-3456-7890"], ["Exact", 175000, 175000, "081234567891"], ["Over", 110000, 120000, "+62 812 3456 7892"], ["NoPhone", 175000, 0, "-"]] as const;
  people.forEach(([name, charge, paid, phone], i) => {
    s.bookings.push({ id: `b${i}`, tripId, sourceId: "s", fingerprint: `f${i}`, registeredAt: "2026-10-01T00:00:00Z", rawName: name, proof: "", phone });
    s.participants.push({ id: ids[i], bookingId: `b${i}`, tripId, name, meetingPoint: "St. Bandung", facility: "Full Transport", raincoats: 0, charge, reviewed: true, status: "active" });
    // Like payment.verify: allocations stop at the bill and any excess stays unallocated.
    if (paid) s.payments.push({ id: `p${i}`, tripId, amount: paid, method: "transfer", notes: "", verifiedAt: "", allocations: [{ participantId: ids[i], amount: Math.min(paid, charge) }], proof: "" });
  });
  return s;
}

test("normalizePhone turns Indonesian numbers into the 62 form and rejects junk", () => {
  assert.equal(normalizePhone("0812-3456-7890"), "6281234567890");
  assert.equal(normalizePhone("+62 812 3456 7890"), "6281234567890");
  assert.equal(normalizePhone("81234567890"), "6281234567890");
  assert.equal(normalizePhone("-"), null);
  assert.equal(normalizePhone("12345"), null);
});

test("reminderQueue lists people who owe or overpaid, skipping exact payers", () => {
  const queue = reminderQueue(state(), tripId);
  assert.deepEqual(queue.map(e => [e.person.name, e.kind, e.amount, e.phone]), [
    ["Owing", "reminder", 75000, "6281234567890"],
    ["Over", "overpaid", 10000, "6281234567892"],
    ["NoPhone", "reminder", 175000, null],
  ]);
});

test("messages fill every placeholder and links encode the text", () => {
  const s = state();
  const [owing] = reminderQueue(s, tripId);
  const text = messageFor(s, owing);
  assert.match(text, /Halo kak Owing/);
  assert.match(text, /Mt Artapela Vol 11/);
  assert.match(text, /sisa \*Rp\s?75\.000\*/);
  assert.match(text, /BCA 123/);
  assert.doesNotMatch(text, /\{\w+\}/);
  assert.equal(renderMessage("Hi {name} {unknown}", { name: "A" } as never), "Hi A {unknown}");
  assert.equal(waLink("6281", "a b&c"), "https://wa.me/6281?text=a%20b%26c");
});

test("reminders are due only the day before an active trip departs", () => {
  const trip = state().trips[0];
  assert.equal(isReminderDay(trip, "2026-11-06"), true);
  assert.equal(isReminderDay(trip, "2026-11-07"), false);
  assert.equal(isReminderDay({ ...trip, status: "cancelled" }, "2026-11-06"), false);
});

test("templates and sent marks are saved through commands", () => {
  let s = applyCommand(state(), { action: "message.templates", reminder: "Bayar {balance}", overpaid: "Lebih {excess}" }, "u", "33333333-3333-4333-8333-333333333331");
  assert.match(messageFor(s, reminderQueue(s, tripId)[0]), /^Bayar Rp\s?75\.000$/);
  s = applyCommand(s, { action: "message.sent", participantId: ids[0], kind: "reminder" }, "u", "33333333-3333-4333-8333-333333333332");
  assert.ok(s.participants[0].contacted?.reminder);
});

test("an overpayment recorded through payment.verify shows up as overpaid", () => {
  const s = state();
  const after = applyCommand(s, { action: "payment.verify", participantIds: [ids[3]], amount: 200000, method: "transfer", notes: "", fullyPaid: false }, "u", "33333333-3333-4333-8333-333333333333");
  const entry = reminderQueue(after, tripId).find(e => e.person.id === ids[3])!;
  assert.equal(entry.kind, "overpaid");
  assert.equal(entry.amount, 25000);
  assert.match(messageFor(after, entry), /lebih \*Rp\s?25\.000\*/);
});

test("import keeps age, address, emergency contact and medical notes on each participant", async () => {
  const { importRows } = await import("./import");
  const s = emptyWorkspace();
  s.trips.push({ id: tripId, title: "T", departureDate: "2026-11-07", status: "active", fullPrice: 175000, nonPrice: 110000, raincoatPrice: 15000 });
  const mapping = { registered_at: 0, raw_name: 1, age: 2, facility: 3, meeting_point: 4, address: 5, contact_phone: 6, emergency_phone: 7, medical_notes: 8 };
  const source = { id: "src", tripId, spreadsheetId: "x", sheetId: 0, sheetTitle: "S", headerRow: 1, headers: [], mapping, lastSuccessAt: "", review: [], dateOrder: "mdy" as const };
  const row = ["10/31/2026 18:20:20", "Budi", "37", "Full Transport", "St Bandung", "Jl. Merdeka 1", "081122330000", "08112345555", "Asma"];
  let { state: after } = importRows(s, source, [row], "u");
  const person = after.participants[0];
  assert.deepEqual([person.age, person.address, person.emergencyPhone, person.medicalNotes], ["37", "Jl. Merdeka 1", "08112345555", "Asma"]);
  // A later answer change in the sheet updates these fields without touching the bill.
  ({ state: after } = importRows(after, source, [[...row.slice(0, 8), "Asma, alergi kacang"]], "u"));
  assert.equal(after.participants[0].medicalNotes, "Asma, alergi kacang");
  after = applyCommand(after, { action: "participant.edit", participantId: person.id, name: "Budi", meetingPoint: "St Bandung", facility: "Full Transport", raincoats: 0, phone: "0811", age: "38", address: "", emergencyPhone: "0812", medicalNotes: "" }, "u", "33333333-3333-4333-8333-333333333334");
  const edited = after.participants[0];
  assert.deepEqual([edited.age, edited.address, edited.emergencyPhone, edited.medicalNotes, after.bookings[0].phone], ["38", undefined, "0812", undefined, "0811"]);
});

test("WhatsApp links drop emoji that would arrive broken", () => {
  assert.equal(waLink("62", "Halo 👋\nOk 🏔️ • bye"), `https://wa.me/62?text=${encodeURIComponent("Halo\nOk • bye")}`);
});
