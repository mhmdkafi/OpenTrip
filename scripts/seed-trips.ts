// Seeds demo trips from Jan 2025 to the 3rd week of Oct 2026 (8 per month) with participants and payments.
// Usage: npm run seed -- <owner-email>   (defaults to OWNER_EMAIL)
// Re-running replaces only seed trips (ids starting with "5eed5eed"); ids are stable, so other data is kept.
import { createClient } from "@supabase/supabase-js";
import { emptyWorkspace, type Booking, type Cash, type Payment, type Person, type Trip, type Workspace } from "../src/lib/workspace/types";

const SEED_PREFIX = "5eed5eed";
const TODAY = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

// Deterministic PRNG so every run produces the same seed data.
let state = 20260801;
const rand = () => { state |= 0; state = (state + 0x6d2b79f5) | 0; let t = Math.imul(state ^ (state >>> 15), 1 | state); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const pick = <T,>(list: readonly T[]) => list[int(0, list.length - 1)];
const hex = (n: number) => Array.from({ length: n }, () => int(0, 15).toString(16)).join("");
const uuid = (prefix = "") => {
  const body = (prefix + hex(32)).slice(0, 32).split("");
  body[12] = "4"; body[16] = "89ab"[int(0, 3)];
  const s = body.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
};

type Plan = { title: string; volume: string; date: string; full: number; location?: string; cancelled?: boolean; done?: boolean };

// Mountain catalogue: [name, starting volume, Full Transport price, location].
const MOUNTAINS: [string, number, number, string?][] = [
  ["Mt Tambak Ruyung", 1, 175000], ["Mt Papandayan", 4, 200000, "Garut"], ["Mt Sagara", 3, 185000, "Garut"], ["Puncak Junghuhn", 1, 165000],
  ["Lembah Tengkorak", 5, 150000], ["Mt Pangparang", 3, 190000], ["Mt Prau", 1, 450000, "Wonosobo"], ["Mt Artapela", 2, 180000, "Bandung"],
  ["Mt Burangrang", 1, 180000, "Bandung Barat"], ["Mt Sangar", 1, 170000], ["Mt Lembu", 1, 160000, "Purwakarta"], ["Mt Cikuray", 1, 250000, "Garut"],
  ["Mt Canar", 1, 170000], ["Mt Galunggung", 1, 220000, "Tasikmalaya"], ["Kawah Galunggung", 1, 160000, "Tasikmalaya"], ["Sanghyang Heuleut", 1, 150000, "Bandung Barat"],
  ["Mt Lawu", 1, 550000, "Karanganyar"], ["Mt Gede", 1, 350000, "Cianjur"], ["Mt Ciremai", 1, 300000, "Kuningan"], ["Mt Pangrango", 1, 350000, "Cianjur"],
  ["Mt Patuha", 1, 180000, "Bandung"],
];
const TRIPS_PER_MONTH = 8;

// Eight departure dates in a month, weekends first; October 2026 stops after its third week (the 18th) with weekends only.
function departures(year: number, month: number) {
  const last = month === 10 && year === 2026 ? 18 : new Date(Date.UTC(year, month, 0)).getUTCDate();
  const days = Array.from({ length: last }, (_, i) => i + 1);
  const weekday = (day: number) => new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const weekends = days.filter(day => [0, 6].includes(weekday(day)));
  // October 2026 keeps only its weekend trips (6), leaving no Friday departures.
  if (year === 2026 && month === 10) return weekends.map(day => `${year}-10-${String(day).padStart(2, "0")}`);
  const fridays = days.filter(day => weekday(day) === 5);
  const chosen = [...weekends];
  for (const day of fridays) if (chosen.length < TRIPS_PER_MONTH) chosen.push(day);
  while (chosen.length < TRIPS_PER_MONTH) chosen.push(weekends[chosen.length % weekends.length]);
  // More weekend days than slots: keep them spread across the month.
  const picked = chosen.length > TRIPS_PER_MONTH ? Array.from({ length: TRIPS_PER_MONTH }, (_, i) => chosen.sort((x, y) => x - y)[Math.floor(i * chosen.length / TRIPS_PER_MONTH)]) : chosen;
  return picked.sort((x, y) => x - y).map(day => `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
}

const plans: Plan[] = (() => {
  const volumes = new Map(MOUNTAINS.map(([name, start]) => [name, start]));
  const list: Plan[] = [];
  let next = 0;
  for (let year = 2025, month = 1; year < 2026 || month <= 10; month === 12 ? (year++, month = 1) : month++) {
    const october = year === 2026 && month === 10;
    for (const date of departures(year, month)) {
      const [title, , full, location] = MOUNTAINS[next++ % MOUNTAINS.length];
      const volume = volumes.get(title)!;
      volumes.set(title, volume + 1);
      // Roughly one cancellation a month; October 2026 trips are all treated as done.
      list.push({ title, volume: `Vol ${volume}`, date, full, location, cancelled: !october && rand() < 0.12, done: october });
    }
  }
  return list;
})();

const firstNames = ["Andi", "Budi", "Citra", "Dewi", "Eka", "Fajar", "Gilang", "Hana", "Indra", "Joko", "Kevin", "Laras", "Maya", "Nadia", "Oki", "Putri", "Rizky", "Sari", "Tegar", "Umar", "Vina", "Wulan", "Yoga", "Zahra", "Aldi", "Bella", "Dimas", "Fitri", "Hendra", "Intan", "Raka", "Salsa"];
const lastNames = ["Pratama", "Saputra", "Wijaya", "Hidayat", "Nugraha", "Permana", "Lestari", "Rahmawati", "Kurniawan", "Santoso", "Setiawan", "Maulana", "Ramadhan", "Anggraini", "Firmansyah", "Puspita"];
const meetingPoints = ["St. Bandung", "Basecamp"];
const RAINCOAT = 15000;

const NOW = Date.now();
// Dates never land in the future: upcoming trips only have registrations made so far.
const addDays = (date: string, days: number, hour = 9) => new Date(Math.min(NOW - 3600000, Date.parse(`${date}T${String(hour).padStart(2, "0")}:00:00+07:00`) + days * 86400000)).toISOString();

function buildSeed() {
  const trips: Trip[] = [], bookings: Booking[] = [], participants: Person[] = [], payments: Payment[] = [], cash: Cash[] = [];
  for (const plan of plans) {
    const past = plan.done || plan.date < TODAY;
    const trip: Trip = {
      id: uuid(SEED_PREFIX), title: plan.title, volume: plan.volume, departureDate: plan.date,
      status: plan.cancelled ? "cancelled" : past ? "completed" : "active",
      fullPrice: plan.full, nonPrice: Math.max(100000, plan.full - 50000), raincoatPrice: RAINCOAT,
      ...(plan.location ? { location: plan.location } : {}),
      bankAccount: "BCA 5151040000 a.n. Amirul Andas", meetingPoints, minimumParticipants: 7, riskDays: 7,
    };
    trips.push(trip);
    const sourceId = uuid();
    for (let i = 0, count = int(8, 20); i < count; i++) {
      const name = `${pick(firstNames)} ${pick(lastNames)}`;
      const facility = rand() < 0.75 ? "Full Transport" : "Non Transport";
      const raincoats = rand() < 0.3 ? 1 : 0;
      const charge = (facility === "Full Transport" ? trip.fullPrice : trip.nonPrice) + raincoats * RAINCOAT;
      const registeredAt = addDays(plan.date, -int(5, 30), int(7, 22));
      const booking: Booking = { id: uuid(), tripId: trip.id, sourceId, fingerprint: hex(16), registeredAt, rawName: name, proof: "", phone: `08${int(1, 9)}${int(10000000, 99999999)}` };
      const person: Person = { id: uuid(), bookingId: booking.id, tripId: trip.id, name, meetingPoint: facility === "Full Transport" ? "St. Bandung" : "Basecamp", facility, raincoats, charge, reviewed: true, status: "active" };
      bookings.push(booking); participants.push(person);
      if (plan.cancelled) continue;
      // Finished trips are fully paid; upcoming trips mix full, deposit, and unpaid.
      const roll = rand();
      const amount = past || roll < 0.45 ? charge : roll < 0.8 ? Math.round(charge / 2 / 1000) * 1000 : 0;
      if (!amount) continue;
      const paymentId = uuid();
      payments.push({ id: paymentId, tripId: trip.id, amount, method: "transfer", notes: amount < charge ? "Deposit" : "", verifiedAt: addDays(registeredAt.slice(0, 10), 1), allocations: [{ participantId: person.id, amount }], proof: "" });
      cash.push({ id: uuid(), tripId: trip.id, direction: "in", amount, occurredAt: registeredAt, description: `Payment from ${name}`, category: "Participant payment", sourceId: paymentId, dateSource: "registration" });
    }
  }
  return { trips, bookings, participants, payments, cash };
}

async function main() {
  if (process.argv.includes("--dry-run")) {
    const seed = buildSeed();
    for (const t of seed.trips) {
      const people = seed.participants.filter(p => p.tripId === t.id);
      const paid = people.filter(p => seed.payments.some(x => x.allocations[0].participantId === p.id && x.amount >= p.charge)).length;
      console.log(`${t.departureDate}  ${t.status.padEnd(9)}  ${`${t.title} ${t.volume}`.padEnd(26)}  ${String(people.length).padStart(2)} people, ${paid} paid`);
    }
    const perMonth = new Map<string, number>();
    for (const t of seed.trips) perMonth.set(t.departureDate.slice(0, 7), (perMonth.get(t.departureDate.slice(0, 7)) ?? 0) + 1);
    const names = seed.trips.map(t => `${t.title} ${t.volume}`);
    console.log(`
${seed.trips.length} trips over ${perMonth.size} months (${[...new Set(perMonth.values())].join("/")} per month), ${seed.trips.filter(t => t.status === "cancelled").length} cancelled, ${seed.participants.length} participants, ${seed.payments.length} payments`);
    console.log(`duplicate trip names: ${names.length - new Set(names).size}; meeting points: ${[...new Set(seed.participants.map(p => p.meetingPoint))].join(", ")}; seed size ≈ ${(JSON.stringify(seed).length / 1024 / 1024).toFixed(2)} MB`);
    return;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = (process.argv.slice(2).find(a => !a.startsWith("--")) || process.env.OWNER_EMAIL || "").trim().toLowerCase();
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.");
  if (!email) throw new Error("Usage: npm run seed -- <owner-email>");
  const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: user, error: userError } = await db.from("users").select("id").eq("email", email).maybeSingle();
  if (userError || !user) throw new Error(`No user found for ${email}.`);
  const { data: memberships } = await db.from("user_memberships").select("tenant_id,role").eq("user_id", user.id);
  const tenantId = (memberships?.find(m => m.role === "owner") ?? memberships?.[0])?.tenant_id;
  if (!tenantId) throw new Error(`${email} has no workspace.`);

  const { data: row, error: rowError } = await db.from("tripdash_workspaces").select("revision,data").eq("tenant_id", tenantId).maybeSingle();
  if (rowError) throw new Error(`Could not load the workspace: ${rowError.message}`);
  const current: Workspace = { ...emptyWorkspace(), ...(row?.data ?? {}) };
  const isSeed = (tripId: string) => tripId.startsWith(SEED_PREFIX);
  const seed = buildSeed();
  const next: Workspace = {
    ...current,
    trips: [...current.trips.filter(t => !isSeed(t.id)), ...seed.trips],
    bookings: [...current.bookings.filter(b => !isSeed(b.tripId)), ...seed.bookings],
    participants: [...current.participants.filter(p => !isSeed(p.tripId)), ...seed.participants],
    payments: [...current.payments.filter(p => !isSeed(p.tripId)), ...seed.payments],
    cash: [...current.cash.filter(c => !isSeed(c.tripId)), ...seed.cash],
    audit: [...current.audit, { id: crypto.randomUUID(), userId: user.id, at: new Date().toISOString(), action: "seed.trips", detail: `${seed.trips.length} demo trips` }],
  };

  const revision = (row?.revision ?? 0) + 1;
  const payload = { data: next, revision, updated_at: new Date().toISOString() };
  const { error: saveError } = row
    ? await db.from("tripdash_workspaces").update(payload).eq("tenant_id", tenantId).eq("revision", row.revision)
    : await db.from("tripdash_workspaces").insert({ tenant_id: tenantId, ...payload });
  if (saveError) throw new Error(`Could not save the workspace: ${saveError.message}`);

  const active = seed.trips.filter(t => t.status !== "cancelled").length;
  console.log(`Seeded ${seed.trips.length} trips (${seed.trips.length - active} cancelled), ${seed.participants.length} participants, ${seed.payments.length} payments into workspace ${tenantId}.`);
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
