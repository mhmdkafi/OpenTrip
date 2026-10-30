import { formatRupiah } from "@/lib/money";
import { paidFor, type Person, type Trip, type Workspace } from "./types";
import { activeParticipants } from "./presentation";

// WhatsApp messages for the day before departure: a balance reminder for anyone still owing,
// and a notice for anyone who paid more than their bill. The admin sends each one from their own WhatsApp.
export type MessageKind = "reminder" | "overpaid";
export const TEMPLATE_FIELDS = ["name", "trip", "date", "meeting_point", "bill", "paid", "balance", "excess", "bank"] as const;
type Field = typeof TEMPLATE_FIELDS[number];

// Message bodies are in Indonesian because they go to participants; admins can edit them.
export const DEFAULT_TEMPLATES: Record<MessageKind, string> = {
  reminder: `Halo kak {name},

Mimin dari Rimbaloka Trip mau ngingetin nih, besok *{date}* kita berangkat ke *{trip}*.

Untuk pembayarannya masih ada sisa *{balance}* lagi ya kak.
• Total tagihan: {bill}
• Sudah dibayar: {paid}

Pelunasan bisa ditransfer ke {bank}, lalu kirim bukti transfernya ke chat ini ya kak.

Sampai ketemu di {meeting_point}! Mimin tunggu ya, makasih banyak kak.`,
  overpaid: `Halo kak {name},

Mimin dari Rimbaloka Trip mau infoin nih, pembayaran kakak untuk *{trip}* ternyata lebih *{excess}* dari tagihan ya kak.
• Total tagihan: {bill}
• Sudah dibayar: {paid}

Untuk kelebihannya, kakak lebih nyaman dikembalikan secara tunai saat di meeting point atau ditransfer ke rekening kakak? Kalau transfer, boleh kirimkan nomor rekening dan nama pemiliknya ya kak.

Sampai ketemu besok, *{date}*, di {meeting_point}. Makasih kak.`,
};

export const templateOf = (state: Workspace, kind: MessageKind) => state.templates?.[kind]?.trim() || DEFAULT_TEMPLATES[kind];

/** Indonesian numbers as WhatsApp expects them (62…), or null when the number cannot be used. */
export function normalizePhone(raw: string | undefined) {
  let digits = (raw ?? "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8")) digits = `62${digits}`;
  return /^62\d{8,13}$/.test(digits) ? digits : null;
}

// Emoji outside the basic plane arrive as "�" through wa.me links, so they are dropped (with any variation selector).
export const waLink = (phone: string, text: string) => `https://wa.me/${phone}?text=${encodeURIComponent(text.replace(/[\u{10000}-\u{10FFFF}]\u{FE0F}?/gu, "").replace(/ {2,}/g, " ").replace(/ +\n/g, "\n"))}`;

const addDays = (date: string, days: number) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
/** True on the day before departure (WIB), when reminders go out. */
export const isReminderDay = (trip: Trip, today: string) => trip.status === "active" && Boolean(trip.departureDate) && trip.departureDate === addDays(today, 1);

/** Money received above the bill. Verification allocates at most the bill and keeps the rest unallocated,
 *  so the excess of each transfer is credited to the first participant it paid for. */
export function excessFor(state: Workspace, personId: string) {
  return state.payments.reduce((sum, payment) => {
    if (payment.allocations[0]?.participantId !== personId) return sum;
    return sum + Math.max(payment.amount - payment.allocations.reduce((n, a) => n + a.amount, 0), 0);
  }, 0);
}

export type ReminderEntry = { person: Person; kind: MessageKind; amount: number; phone: string | null; proofPending: boolean };
export function reminderQueue(state: Workspace, tripId: string): ReminderEntry[] {
  const bookings = new Map(state.bookings.map(b => [b.id, b]));
  return activeParticipants(state, tripId).flatMap(person => {
    const paid = paidFor(state, person.id), excess = excessFor(state, person.id), booking = bookings.get(person.bookingId);
    const kind: MessageKind | null = excess > 0 ? "overpaid" : paid < person.charge ? "reminder" : null;
    if (!kind) return [];
    // A proof waiting for review may already cover the balance, so the queue flags it.
    const proofPending = kind === "reminder" && Boolean(booking?.proof && !booking.proofStatus);
    return [{ person, kind, amount: kind === "overpaid" ? excess : person.charge - paid, phone: normalizePhone(booking?.phone), proofPending }];
  });
}

export function renderMessage(template: string, values: Record<Field, string>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => key in values ? values[key as Field] : match);
}

export function messageFor(state: Workspace, entry: Pick<ReminderEntry, "person" | "kind">) {
  const { person, kind } = entry;
  const trip = state.trips.find(t => t.id === person.tripId);
  const excess = excessFor(state, person.id), paid = paidFor(state, person.id) + excess;
  const date = trip?.departureDate ? new Date(`${trip.departureDate}T12:00:00+07:00`).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "-";
  return renderMessage(templateOf(state, kind), {
    name: person.name, trip: trip ? `${trip.title}${trip.volume ? ` ${trip.volume}` : ""}` : "-", date, meeting_point: person.meetingPoint || "-",
    bill: formatRupiah(person.charge), paid: formatRupiah(paid), balance: formatRupiah(Math.max(person.charge - paid, 0)), excess: formatRupiah(excess),
    bank: trip?.bankAccount || "rekening yang sudah diinformasikan",
  });
}
