export const mockTrips = [
  {
    id: "trip-1",
    title: "Puncak Besar Malabar Vol 12",
    description: "Trip pendakian ke Puncak Besar Malabar",
    departure_date: new Date("2026-09-20"),
    status: "active",
    participants_count: 21,
    total_revenue: 4180000,
    paid_amount: 3500000,
    unpaid_amount: 680000,
  },
  {
    id: "trip-2",
    title: "Gili Trawangan Adventure",
    description: "Trip snorkeling dan island hopping",
    departure_date: new Date("2026-10-05"),
    status: "active",
    participants_count: 15,
    total_revenue: 2250000,
    paid_amount: 2100000,
    unpaid_amount: 150000,
  },
];

export const mockParticipants = [
  {
    id: "p1",
    trip_id: "trip-1",
    name: "Adi Nugroho",
    facility: "Full Transport",
    meeting_point: "St Bandung",
    total_bill: 190000,
    paid_amount: 100000,
    remaining: 90000,
    status: "active",
    payment_status: "dp",
  },
  {
    id: "p2",
    trip_id: "trip-1",
    name: "Antares",
    facility: "Full Transport",
    meeting_point: "St Bandung",
    total_bill: 190000,
    paid_amount: 190000,
    remaining: 0,
    status: "active",
    payment_status: "paid",
  },
  {
    id: "p3",
    trip_id: "trip-1",
    name: "Zanki",
    facility: "Full Transport",
    meeting_point: "St Bandung",
    total_bill: 190000,
    paid_amount: 0,
    remaining: 190000,
    status: "active",
    payment_status: "unpaid",
  },
  {
    id: "p4",
    trip_id: "trip-1",
    name: "Budi Rahman",
    facility: "Non Transport",
    meeting_point: "Tugu Perintis Cimaung",
    total_bill: 110000,
    paid_amount: 110000,
    remaining: 0,
    status: "active",
    payment_status: "paid",
  },
];

export const mockPayments = [
  {
    id: "pay1",
    booking_id: "b1",
    participant_ids: ["p1"],
    amount: 100000,
    method: "transfer",
    status: "verified",
    paid_at: new Date("2026-09-10"),
    verified_at: new Date("2026-09-10"),
  },
  {
    id: "pay2",
    booking_id: "b2",
    participant_ids: ["p2"],
    amount: 190000,
    method: "transfer",
    status: "verified",
    paid_at: new Date("2026-09-08"),
    verified_at: new Date("2026-09-08"),
  },
];

export const mockExpenses = [
  {
    id: "exp1",
    trip_id: "trip-1",
    category: "Transportasi",
    amount: 500000,
    description: "Sewa bis 45 tempat",
    date: new Date("2026-09-15"),
  },
  {
    id: "exp2",
    trip_id: "trip-1",
    category: "Konsumsi",
    amount: 300000,
    description: "Makan siang dan snack",
    date: new Date("2026-09-15"),
  },
];

export const mockExpenseCategories = [
  { id: "cat1", name: "Transportasi", active: true },
  { id: "cat2", name: "Konsumsi", active: true },
  { id: "cat3", name: "Tiket/Basecamp", active: true },
  { id: "cat4", name: "Guide", active: true },
  { id: "cat5", name: "Dokumentasi", active: true },
];

export const mockCashFlow = {
  period: "Agustus 2026",
  opening_balance: 1000000,
  total_income: 3500000,
  total_expenses: 800000,
  total_refund: 50000,
  net_flow: 2650000,
  closing_balance: 3650000,
};
