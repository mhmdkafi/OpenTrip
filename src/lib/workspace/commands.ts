import { z } from "zod";
import { availableStock, paidFor, type Workspace } from "./types";

const money = z.number().int().min(0).max(1_000_000_000);
const name = z.string().trim().min(1).max(200);
const id = z.string().uuid();
const date = z.iso.date();
export const commandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("trip.create"), title: name, departureDate: date, fullPrice: money, nonPrice: money, raincoatPrice: money }),
  z.object({ action: z.literal("trip.status"), tripId: id, status: z.enum(["active", "archived"]) }),
  z.object({ action: z.literal("participant.edit"), participantId: id, name, meetingPoint: name, facility: z.enum(["Full Transport", "Non Transport"]), raincoats: z.number().int().min(0).max(100), reason: name }),
  z.object({ action: z.literal("participant.cancel"), participantId: id, reason: name }),
  z.object({ action: z.literal("payment.verify"), participantIds: z.array(id).min(1).max(500), amount: money.positive(), method: z.enum(["transfer", "cash", "other"]), notes: z.string().max(500).default(""), fullyPaid: z.boolean().default(false) }),
  z.object({ action: z.literal("expense.create"), tripId: z.union([id, z.literal("")]), amount: money.positive(), date, category: name, description: name }),
  z.object({ action: z.literal("inventory.create"), name, kind: z.enum(["operational", "rental"]), total: z.number().int().min(0).max(100000) }),
  z.object({ action: z.literal("inventory.adjust"), itemId: id, total: z.number().int().min(0).max(100000), damaged: z.number().int().min(0).max(100000), reason: name }),
  z.object({ action: z.literal("inventory.lend"), itemId: id, tripId: id, quantity: z.number().int().positive().max(100000) }),
  z.object({ action: z.literal("inventory.return"), itemId: id, loanId: id }),
]);
export type Command = z.infer<typeof commandSchema>;
export class DomainError extends Error { constructor(message: string, public status = 400) { super(message); } }
function found<T>(value: T | undefined, label: string): T { if (!value) throw new DomainError(`${label} tidak ditemukan.`, 404); return value; }

// All mutations run on a copy and are committed together with their request key.
export function applyCommand(original: Workspace, command: Command, userId: string, requestId: string): Workspace {
  if (original.requests.includes(requestId)) return original;
  const state = structuredClone(original);
  const now = new Date().toISOString();
  let detail = "";
  switch (command.action) {
    case "trip.create": {
      const { action: _action, ...trip } = command;
      state.trips.push({ ...trip, id: crypto.randomUUID(), status: "active" }); detail = trip.title; break;
    }
    case "trip.status": found(state.trips.find(t => t.id === command.tripId), "Trip").status = command.status; detail = command.status; break;
    case "participant.edit": {
      const p = found(state.participants.find(p => p.id === command.participantId), "Peserta");
      const trip = found(state.trips.find(t => t.id === p.tripId), "Trip");
      const charge = (command.facility === "Full Transport" ? trip.fullPrice : trip.nonPrice) + command.raincoats * trip.raincoatPrice;
      if (paidFor(state, p.id) > 0 && charge !== p.charge) throw new DomainError("Tagihan sudah menerima pembayaran. Perubahan harga harus direkonsiliasi terlebih dahulu.");
      detail = `${p.name} → ${command.name}; ${command.reason}`;
      Object.assign(p, { name: command.name, meetingPoint: command.meetingPoint, facility: command.facility, raincoats: command.raincoats, charge, reviewed: true }); break;
    }
    case "participant.cancel": {
      const p = found(state.participants.find(p => p.id === command.participantId), "Peserta"); p.status = "cancelled"; detail = `${p.name}: ${command.reason}`; break;
    }
    case "payment.verify": {
      if (new Set(command.participantIds).size !== command.participantIds.length) throw new DomainError("Peserta tidak boleh dipilih dua kali.");
      const people = command.participantIds.map(id => found(state.participants.find(p => p.id === id), "Peserta"));
      const tripId = people[0].tripId;
      if (people.some(p => p.tripId !== tripId || !p.reviewed || p.status !== "active")) throw new DomainError("Pilih peserta aktif dalam satu trip dan tinjau tagihannya terlebih dahulu.");
      const bookings = people.map(p => found(state.bookings.find(b => b.id === p.bookingId), "Booking"));
      if (people.length > 1 && (new Set(bookings.map(b => b.proof)).size !== 1 || !bookings[0].proof)) throw new DomainError("Persetujuan grup memerlukan bukti transfer yang sama.");
      const remainder = people.map(p => Math.max(p.charge - paidFor(state, p.id), 0));
      const total = remainder.reduce((s, n) => s + n, 0);
      if (!total) throw new DomainError("Peserta sudah lunas.");
      if (command.fullyPaid && command.amount < total) throw new DomainError("Nominal transfer belum mencukupi pelunasan.");
      let left = command.amount;
      const allocations = people.map((p, i) => { const amount = Math.min(left, remainder[i]); left -= amount; return { participantId: p.id, amount }; });
      const paymentId = crypto.randomUUID();
      state.payments.push({ id: paymentId, tripId, amount: command.amount, method: command.method, notes: command.notes, verifiedAt: now, allocations, proof: bookings[0].proof });
      // One transfer = one cash entry. For groups use earliest source timestamp,
      // shown explicitly in the confirmation UI; never multiply the transfer.
      const occurredAt = bookings.map(b => b.registeredAt).sort()[0];
      state.cash.push({ id: crypto.randomUUID(), tripId, direction: "in", amount: command.amount, occurredAt, description: `Pembayaran ${people.map(p => p.name).join(", ")}`, category: "Pembayaran peserta", sourceId: paymentId, dateSource: "registration" });
      detail = `${command.amount} rupiah; ${people.length} peserta; tanggal kas ${occurredAt}`; break;
    }
    case "expense.create": {
      if (command.tripId) found(state.trips.find(t => t.id === command.tripId), "Trip");
      state.cash.push({ id: crypto.randomUUID(), tripId: command.tripId, direction: "out", amount: command.amount, occurredAt: new Date(`${command.date}T00:00:00+07:00`).toISOString(), description: command.description, category: command.category, sourceId: requestId, dateSource: "manual" }); detail = `${command.category}: ${command.amount}`; break;
    }
    case "inventory.create": state.inventory.push({ id: crypto.randomUUID(), name: command.name, kind: command.kind, total: command.total, damaged: 0, loans: [] }); detail = command.name; break;
    case "inventory.adjust": {
      const item = found(state.inventory.find(i => i.id === command.itemId), "Barang");
      item.total = command.total; item.damaged = command.damaged;
      if (availableStock(item) < 0) throw new DomainError("Stok total tidak boleh kurang dari barang rusak dan yang sedang dipinjam.");
      detail = `${item.name}: total ${item.total}, rusak ${item.damaged}; ${command.reason}`; break;
    }
    case "inventory.lend": {
      const item = found(state.inventory.find(i => i.id === command.itemId), "Barang");
      found(state.trips.find(t => t.id === command.tripId && t.status === "active"), "Trip aktif");
      if (command.quantity > availableStock(item)) throw new DomainError("Stok tersedia tidak mencukupi.");
      item.loans.push({ id: crypto.randomUUID(), tripId: command.tripId, quantity: command.quantity, returned: false }); detail = `${item.name}: keluar ${command.quantity}`; break;
    }
    case "inventory.return": {
      const item = found(state.inventory.find(i => i.id === command.itemId), "Barang");
      const loan = found(item.loans.find(l => l.id === command.loanId), "Peminjaman");
      if (loan.returned) throw new DomainError("Barang sudah dikembalikan.");
      loan.returned = true; detail = `${item.name}: kembali ${loan.quantity}`; break;
    }
  }
  state.requests.push(requestId);
  state.audit.push({ id: requestId, userId, at: now, action: command.action, detail });
  return state;
}
