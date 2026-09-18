import { emptyWorkspace, type Workspace } from "./types";

// Fictional participants and transactions. Only the source structure, counts,
// facilities and meeting points follow the client attachments.
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export function prototypeWorkspace(): Workspace {
  const state = emptyWorkspace();
  state.trips = [
    { id: id(1), title: "Puncak Besar Malabar", volume: "12", location: "Pangalengan, Bandung", minimumParticipants: 7, riskDays: 7, meetingPoints: ["St Bandung", "Tugu Perintis Cimaung"], departureDate: "2026-09-20", status: "active", fullPrice: 175000, nonPrice: 110000, raincoatPrice: 15000 },
    { id: id(2), title: "Papandayan Sunrise", location: "Garut", minimumParticipants: 7, riskDays: 7, departureDate: "2026-09-27", status: "active", fullPrice: 285000, nonPrice: 180000, raincoatPrice: 15000 },
    { id: id(3), title: "Explore Gunung Prau", location: "Dieng", minimumParticipants: 9, riskDays: 7, departureDate: "2026-10-10", status: "active", fullPrice: 650000, nonPrice: 350000, raincoatPrice: 15000 },
  ];
  const names = ["Ardi Pratama", "Nadia Putri", "Fajar Ramadhan", "Salma Aulia", "Rizky Saputra", "Dinda Maharani", "Bagas Aditya", "Alya Safira", "Reza Maulana", "Intan Permata", "Ilham Fauzi", "Salsa Nabila", "Dimas Wijaya", "Nisa Amalia", "Bima + Galih + Rafi", "Citra Kirana", "Yoga Prasetyo", "Dewi Lestari", "Raka Mahendra"];
  let index = 0;
  names.forEach((rawName, i) => {
    const bookingId = id(100 + i);
    const non = i === 14 || i === 18;
    const registeredAt = `2026-09-${String(7 + (i % 5)).padStart(2, "0")}T03:00:00.000Z`;
    state.bookings.push({ id: bookingId, tripId: id(1), sourceId: id(20), fingerprint: `demo-${i}`, rawName, registeredAt, phone: "", proof: `#bukti-simulasi-${i}`, });
    rawName.split(" + ").forEach(name => {
      const personId = id(200 + index);
      const charge = non ? 110000 : i < 2 ? 190000 : 175000;
      state.participants.push({ id: personId, bookingId, tripId: id(1), name, meetingPoint: non ? "Tugu Perintis Cimaung" : "St Bandung", facility: non ? "Non Transport" : "Full Transport", raincoats: i < 2 ? 1 : i === 17 ? null : 0, charge, reviewed: i !== 17, status: "active" });
      const paid = index < 12 ? charge : index < 15 ? 100000 : 0;
      if (paid) {
        state.payments.push({ id: id(300 + index), tripId: id(1), amount: paid, method: "transfer", notes: "Transaksi simulasi untuk review UI", verifiedAt: registeredAt, allocations: [{ participantId: personId, amount: paid }], proof: `#bukti-simulasi-${i}` });
        state.cash.push({ id: id(400 + index), tripId: id(1), direction: "in", amount: paid, occurredAt: registeredAt, description: `Pembayaran ${name}`, category: "Pembayaran peserta", sourceId: id(300 + index), dateSource: "registration" });
      }
      index++;
    });
  });
  state.sources.push({ id: id(20), tripId: id(1), spreadsheetId: "prototype-spreadsheet-malabar", sheetId: 0, sheetTitle: "Form Responses 1", headerRow: 1, headers: ["Timestamp", "Nama Lengkap", "Fasilitas", "Mepo", "Jas Hujan (+15k)", "Registrasi"], mapping: { registered_at: 0, raw_name: 1, facility: 2, meeting_point: 3, raincoat_option: 4, proof_refs: 5 }, lastSuccessAt: "2026-09-11T08:35:00.000Z", review: ["1 pilihan jas hujan belum diisi. Tinjau tagihan Dewi Lestari."] });
  state.cash.push(...[
    { amount: 850000, category: "Transportasi", description: "DP sewa kendaraan Malabar" },
    { amount: 315000, category: "Konsumsi", description: "Pemesanan makan peserta" },
    { amount: 150000, category: "Perlengkapan", description: "Logistik dan P3K" },
  ].map((e, i) => ({ ...e, id: id(500 + i), tripId: id(1), direction: "out" as const, occurredAt: `2026-09-${String(8+i).padStart(2,"0")}T05:00:00.000Z`, sourceId: id(550+i), dateSource: "manual" as const })));
  state.cash.push(...[
    { day: 2, direction: "in" as const, amount: 525000, category: "Pembayaran peserta", description: "Pembayaran peserta trip Agustus" },
    { day: 6, direction: "out" as const, amount: 240000, category: "Transportasi", description: "DP kendaraan trip Agustus" },
    { day: 11, direction: "in" as const, amount: 700000, category: "Pembayaran peserta", description: "Pelunasan peserta trip Agustus" },
    { day: 17, direction: "out" as const, amount: 275000, category: "Konsumsi", description: "Konsumsi trip Agustus" },
    { day: 23, direction: "in" as const, amount: 350000, category: "Pembayaran peserta", description: "Pembayaran susulan trip Agustus" },
    { day: 27, direction: "out" as const, amount: 125000, category: "Perlengkapan", description: "Logistik trip Agustus" },
  ].map((entry, i) => ({ ...entry, id: id(560 + i), tripId: id(2), occurredAt: `2026-08-${String(entry.day).padStart(2,"0")}T05:00:00.000Z`, sourceId: id(570+i), dateSource: "manual" as const })));
  state.inventory = [
    { id: id(600), name: "Tenda dome 4 orang", kind: "operational", total: 8, damaged: 1, loans: [{ id: id(650), tripId: id(1), quantity: 3, returned: false }] },
    { id: id(601), name: "Headlamp", kind: "rental", total: 24, damaged: 2, loans: [{ id: id(651), tripId: id(1), quantity: 8, returned: false }] },
    { id: id(602), name: "Jas hujan / ponco", kind: "rental", total: 30, damaged: 0, loans: [{ id: id(652), tripId: id(1), quantity: 10, returned: false }] },
    { id: id(603), name: "Cooking set", kind: "operational", total: 6, damaged: 0, loans: [] },
    { id: id(604), name: "Trekking pole", kind: "rental", total: 15, damaged: 1, loans: [] },
    { id: id(605), name: "Tas P3K", kind: "operational", total: 4, damaged: 0, loans: [] },
    { id: id(606), name: "Stiker Rimbaloka", kind: "operational", consumable: true, reorderLevel: 20, total: 8, damaged: 0, loans: [] },
    { id: id(607), name: "Jas hujan sekali pakai", kind: "operational", consumable: true, reorderLevel: 10, total: 5, damaged: 0, loans: [] },
  ];
  state.audit = [
    { id: id(701), userId: "demo", at: "2026-09-11T08:35:00.000Z", action: "sync.completed", detail: "19 respons tersinkronisasi · 21 peserta Malabar" },
    { id: id(702), userId: "demo", at: "2026-09-11T08:42:00.000Z", action: "payment.verify", detail: "Pembayaran Fajar Ramadhan diverifikasi" },
    { id: id(703), userId: "demo", at: "2026-09-11T09:15:00.000Z", action: "inventory.lend", detail: "8 headlamp disiapkan untuk trip Malabar" },
  ];
  return state;
}
