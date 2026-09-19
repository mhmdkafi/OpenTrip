import { z } from "zod";
import { availableStock, paidFor, type Workspace } from "./types";

const money = z.number().int().min(0).max(1_000_000_000);
const name = z.string().trim().min(1).max(200);
const id = z.string().uuid();
const date = z.iso.date();
const tripDetails = { title: name, departureDate: date, fullPrice: money, nonPrice: money, raincoatPrice: money, volume: z.string().max(80).optional(), location: z.string().max(200).optional(), bankAccount: z.string().max(300).optional(), meetingPoints: z.array(name).max(30).optional(), minimumParticipants: z.number().int().min(1).max(1000).optional(), riskDays: z.number().int().min(1).max(60).optional() };
const inventoryDetails = { name, kind: z.enum(["operational", "rental"]), total: z.number().int().min(0).max(100000), consumable: z.boolean().optional(), stockTracked: z.boolean().optional(), reorderLevel: z.number().int().min(0).max(100000).optional(), imageUrl: z.string().max(400000).refine(value => !value || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value), "Gunakan gambar PNG, JPEG, atau WebP.").optional() };
export const commandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("trip.create"), ...tripDetails }),
  z.object({ action: z.literal("trip.update"), tripId: id, ...tripDetails }),
  z.object({ action: z.literal("trip.status"), tripId: id, status: z.enum(["active", "archived", "completed", "cancelled"]) }),
  z.object({ action: z.literal("trip.delete"), tripId: id }),
  z.object({ action: z.literal("participant.edit"), participantId: id, name, meetingPoint: name, facility: z.enum(["Full Transport", "Non Transport"]), raincoats: z.number().int().min(0).max(100), reason: name }),
  z.object({ action: z.literal("participant.cancel"), participantId: id, reason: name }),
  z.object({ action: z.literal("payment.verify"), participantIds: z.array(id).min(1).max(500), amount: money.positive(), method: z.enum(["transfer", "cash", "other"]), notes: z.string().max(500).default(""), fullyPaid: z.boolean().default(false) }),
  z.object({ action: z.literal("expense.create"), tripId: z.union([id, z.literal("")]), amount: money.positive(), date, category: name, description: name }),
  z.object({ action: z.literal("expense.update"), expenseId: id, amount: money.positive(), date, category: name, description: name }),
  z.object({ action: z.literal("expense.delete"), expenseId: id, reason: name }),
  z.object({ action: z.literal("inventory.create"), ...inventoryDetails }),
  z.object({ action: z.literal("inventory.update"), itemId: id, ...inventoryDetails, damaged: z.number().int().min(0).max(100000), reason: name }),
  z.object({ action: z.literal("inventory.delete"), itemId: id }),
  z.object({ action: z.literal("inventory.consume"), itemId: id, quantity: z.number().int().positive().max(100000), reason: name }),
  z.object({ action: z.literal("inventory.adjust"), itemId: id, total: z.number().int().min(0).max(100000), damaged: z.number().int().min(0).max(100000), reason: name }),
  z.object({ action: z.literal("inventory.lend"), itemId: id, tripId: id, quantity: z.number().int().positive().max(100000), notes: z.string().trim().max(500).optional() }),
  z.object({ action: z.literal("inventory.incident"), itemId: id, loanId: id.optional(), kind: z.enum(["lost", "damaged", "note"]), quantity: z.number().int().min(0).max(100000), description: name }),
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
    case "trip.update": {
      const trip = found(state.trips.find(t => t.id === command.tripId), "Trip");
      const { action: _action, tripId: _tripId, ...fields } = command;
      const people = state.participants.filter(p => p.tripId === trip.id);
      const changed = people.map(p => ({ p, charge: (p.facility === "Full Transport" ? fields.fullPrice : fields.nonPrice) + (p.raincoats ?? 0) * fields.raincoatPrice }));
      if (changed.some(({ p, charge }) => charge !== p.charge && paidFor(state, p.id) > 0)) throw new DomainError("Harga tidak dapat diubah karena peserta sudah membayar. Koreksi pembayaran terlebih dahulu.");
      if (fields.meetingPoints?.length && people.some(p => p.status === "active" && p.meetingPoint && !fields.meetingPoints!.includes(p.meetingPoint))) throw new DomainError("Titik mepo masih digunakan peserta. Pindahkan peserta sebelum menghapus titik tersebut.");
      Object.assign(trip, fields);
      changed.forEach(({ p, charge }) => { if (["Full Transport", "Non Transport"].includes(p.facility)) p.charge = charge; });
      detail = `Trip diperbarui: ${trip.title}`; break;
    }
    case "trip.status": found(state.trips.find(t => t.id === command.tripId), "Trip").status = command.status; detail = command.status; break;
    case "trip.delete": {
      const trip = found(state.trips.find(t => t.id === command.tripId), "Trip");
      if (state.payments.some(p => p.tripId === trip.id) || state.cash.some(c => c.tripId === trip.id)) throw new DomainError("Trip memiliki catatan keuangan. Batalkan trip alih-alih menghapusnya.");
      if (state.inventory.some(i => i.loans.some(l => l.tripId === trip.id && !l.returned))) throw new DomainError("Barang masih dipinjam untuk trip ini. Catat pengembalian sebelum menghapus.");
      const bookingIds = new Set(state.bookings.filter(b => b.tripId === trip.id).map(b => b.id));
      state.trips = state.trips.filter(t => t.id !== trip.id);
      state.participants = state.participants.filter(p => p.tripId !== trip.id);
      state.bookings = state.bookings.filter(b => !bookingIds.has(b.id));
      state.sources = state.sources.filter(s => s.tripId !== trip.id);
      detail = `Hapus trip: ${trip.title}`; break;
    }
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
    case "expense.update": {
      const expense = found(state.cash.find(c => c.id === command.expenseId && c.direction === "out"), "Pengeluaran");
      const previous = `${expense.description}: ${expense.amount}`;
      Object.assign(expense, { amount: command.amount, description: command.description, category: command.category, occurredAt: new Date(`${command.date}T00:00:00+07:00`).toISOString() });
      detail = `${previous} → ${expense.description}: ${expense.amount}`; break;
    }
    case "expense.delete": {
      const expense = found(state.cash.find(c => c.id === command.expenseId && c.direction === "out"), "Pengeluaran");
      state.cash = state.cash.filter(c => c.id !== expense.id); detail = `Hapus ${expense.description}: ${expense.amount}; ${command.reason}`; break;
    }
    case "inventory.create": {
      const { action: _action, ...fields } = command;
      state.inventory.push({ ...fields, id: crypto.randomUUID(), damaged: 0, loans: [] }); detail = command.name; break;
    }
    case "inventory.update": {
      const item = found(state.inventory.find(i => i.id === command.itemId), "Barang");
      if (item.loans.some(l => !l.returned) && (command.consumable || command.stockTracked === false)) throw new DomainError("Selesaikan peminjaman sebelum mengubah cara pencatatan barang.");
      const { action: _action, itemId: _id, reason, ...fields } = command;
      Object.assign(item, fields);
      if (availableStock(item) < 0) throw new DomainError("Stok total tidak boleh kurang dari barang rusak dan yang dipinjam.");
      detail = `${item.name}: total ${item.total}, rusak ${item.damaged}; ${reason}`; break;
    }
    case "inventory.delete": {
      const item = found(state.inventory.find(i => i.id === command.itemId), "Barang");
      if (item.loans.some(l => !l.returned)) throw new DomainError("Barang masih dipinjam. Catat pengembalian sebelum menghapus.");
      state.inventory = state.inventory.filter(i => i.id !== item.id); detail = `Hapus barang: ${item.name}`; break;
    }
    case "inventory.consume": {
      const item = found(state.inventory.find(i => i.id === command.itemId), "Barang");
      if (!item.consumable || item.stockTracked === false) throw new DomainError("Pemakaian hanya untuk barang habis pakai dengan stok tercatat.");
      if (command.quantity > availableStock(item)) throw new DomainError("Stok tersedia tidak mencukupi.");
      item.total -= command.quantity; detail = `${item.name}: dipakai ${command.quantity}; ${command.reason}`; break;
    }
    case "inventory.adjust": {
      const item = found(state.inventory.find(i => i.id === command.itemId), "Barang");
      item.total = command.total; item.damaged = command.damaged;
      if (availableStock(item) < 0) throw new DomainError("Stok total tidak boleh kurang dari barang rusak dan yang sedang dipinjam.");
      detail = `${item.name}: total ${item.total}, rusak ${item.damaged}; ${command.reason}`; break;
    }
    case "inventory.lend": {
      const item = found(state.inventory.find(i => i.id === command.itemId), "Barang");
      found(state.trips.find(t => t.id === command.tripId && t.status === "active"), "Trip aktif");
      if (item.consumable || item.stockTracked === false) throw new DomainError("Peminjaman hanya untuk barang kembali dengan stok tercatat.");
      if (command.quantity > availableStock(item)) throw new DomainError("Stok tersedia tidak mencukupi.");
      item.loans.push({ id: crypto.randomUUID(), tripId: command.tripId, quantity: command.quantity, returned: false, notes: command.notes }); detail = `${item.name}: keluar ${command.quantity}`; break;
    }
    case "inventory.incident": {
      const item = found(state.inventory.find(i => i.id === command.itemId), "Barang");
      const loan = command.loanId ? found(item.loans.find(l => l.id === command.loanId && !l.returned), "Peminjaman aktif") : undefined;
      if (command.kind !== "note") {
        if (item.stockTracked === false || command.quantity < 1) throw new DomainError("Jumlah barang terdampak harus lebih dari nol dan stok harus tercatat.");
        if (command.quantity > (loan ? loan.quantity : availableStock(item))) throw new DomainError("Jumlah melebihi barang pada lokasi yang dipilih.");
        if (loan) { loan.quantity -= command.quantity; if (!loan.quantity) loan.returned = true; }
        if (command.kind === "lost") item.total -= command.quantity;
        else item.damaged += command.quantity;
      }
      (item.incidents ??= []).push({ id: requestId, at: now, description: command.description, kind: command.kind, quantity: command.kind === "note" ? 0 : command.quantity, ...(loan ? { tripId: loan.tripId } : {}) });
      detail = `${item.name}: ${command.description}; ${command.quantity} terdampak`; break;
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
