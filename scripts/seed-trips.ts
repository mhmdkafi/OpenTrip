// Seeds Aug–Oct 2026 demo trips (with participants and payments) into one workspace.
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

type Plan = { title: string; volume: string; date: string; full: number; location?: string; cancelled?: boolean };
const plans: Plan[] = [
  { title: "Mt Tambak Ruyung", volume: "Vol 1", date: "2026-08-01", full: 175000 },
  { title: "Mt Papandayan", volume: "Vol 4", date: "2026-08-02", full: 200000, location: "Garut" },
  { title: "Mt Sagara", volume: "Vol 3", date: "2026-08-08", full: 185000, location: "Garut", cancelled: true },
  { title: "Puncak Junghuhn", volume: "Vol 1", date: "2026-08-09", full: 165000 },
  { title: "Lembah Tengkorak", volume: "Vol 5", date: "2026-08-15", full: 150000 },
  { title: "Mt Pangparang", volume: "Vol 3", date: "2026-08-16", full: 190000 },
  { title: "Mt Prau", volume: "Vol 1", date: "2026-08-22", full: 450000, location: "Wonosobo" },
  { title: "Mt Artapela", volume: "Vol 2", date: "2026-08-29", full: 180000, location: "Bandung" },
  { title: "Mt Burangrang", volume: "Vol 1", date: "2026-09-05", full: 180000, location: "Bandung Barat" },
  { title: "Mt Sangar", volume: "Vol 1", date: "2026-09-06", full: 170000, cancelled: true },
  { title: "Mt Lembu", volume: "Vol 2", date: "2026-09-12", full: 160000, location: "Purwakarta" },
  { title: "Mt Cikuray", volume: "Vol 3", date: "2026-09-13", full: 250000, location: "Garut" },
  { title: "Mt Canar", volume: "Vol 1", date: "2026-09-19", full: 170000 },
  { title: "Mt Galunggung", volume: "Vol 2", date: "2026-09-20", full: 220000, location: "Tasikmalaya", cancelled: true },
  { title: "Mt Papandayan", volume: "Vol 5", date: "2026-09-26", full: 200000, location: "Garut" },
  { title: "Kawah Galunggung", volume: "Vol 1", date: "2026-09-27", full: 160000, location: "Tasikmalaya" },
  { title: "Sanghyang Heuleut", volume: "Vol 4", date: "2026-10-03", full: 150000, location: "Bandung Barat" },
  { title: "Mt Lawu", volume: "Vol 2", date: "2026-10-04", full: 550000, location: "Karanganyar" },
  { title: "Mt Gede", volume: "Vol 6", date: "2026-10-10", full: 350000, location: "Cianjur" },
  { title: "Mt Ciremai", volume: "Vol 3", date: "2026-10-11", full: 300000, location: "Kuningan", cancelled: true },
  { title: "Mt Pangrango", volume: "Vol 2", date: "2026-10-17", full: 350000, location: "Cianjur" },
  { title: "Mt Patuha", volume: "Vol 1", date: "2026-10-18", full: 180000, location: "Bandung" },
  { title: "Mt Prau", volume: "Vol 2", date: "2026-10-24", full: 450000, location: "Wonosobo" },
  { title: "Mt Artapela", volume: "Vol 3", date: "2026-10-25", full: 180000, location: "Bandung" },
];

const firstNames = ["Andi", "Budi", "Citra", "Dewi", "Eka", "Fajar", "Gilang", "Hana", "Indra", "Joko", "Kevin", "Laras", "Maya", "Nadia", "Oki", "Putri", "Rizky", "Sari", "Tegar", "Umar", "Vina", "Wulan", "Yoga", "Zahra", "Aldi", "Bella", "Dimas", "Fitri", "Hendra", "Intan", "Raka", "Salsa"];
const lastNames = ["Pratama", "Saputra", "Wijaya", "Hidayat", "Nugraha", "Permana", "Lestari", "Rahmawati", "Kurniawan", "Santoso", "Setiawan", "Maulana", "Ramadhan", "Anggraini", "Firmansyah", "Puspita"];
const meetingPoints = ["Bandung - Cileunyi", "Jakarta - Kp. Rambutan", "Bekasi - Summarecon", "Bogor - Baranangsiang"];
const RAINCOAT = 15000;

const NOW = Date.now();
// Dates never land in the future: upcoming trips only have registrations made so far.
const addDays = (date: string, days: number, hour = 9) => new Date(Math.min(NOW - 3600000, Date.parse(`${date}T${String(hour).padStart(2, "0")}:00:00+07:00`) + days * 86400000)).toISOString();

function buildSeed() {
  const trips: Trip[] = [], bookings: Booking[] = [], participants: Person[] = [], payments: Payment[] = [], cash: Cash[] = [];
  for (const plan of plans) {
    const past = plan.date < TODAY;
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
      const person: Person = { id: uuid(), bookingId: booking.id, tripId: trip.id, name, meetingPoint: facility === "Full Transport" ? pick(meetingPoints) : "Basecamp", facility, raincoats, charge, reviewed: true, status: "active" };
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
