import { createHash } from "node:crypto";

export type SourceRow = {
  rowNumber: number;
  values: Record<string, string>;
};

export type BookingSnapshot = {
  bookingId: string;
  rowNumber: number;
  fingerprint: string;
  snapshot: Record<string, string>;
  locallyEditedFields?: string[];
  paymentVerified?: boolean;
};

export type ReconciliationResult = {
  row: SourceRow;
  fingerprint: string;
  bookingId?: string;
  action: "new" | "unchanged" | "update" | "review";
  changedFields: string[];
  protectedFields: string[];
  reason?: string;
};

const billingFields = new Set(["facility", "participant_count", "price"]);

export function createSourceFingerprint(values: Record<string, string>) {
  const canonical = Object.keys(values)
    .sort()
    .map((key) => `${key}:${normalizeValue(values[key])}`)
    .join("\n");
  return createHash("sha256").update(canonical).digest("hex");
}

export function reconcileSourceRows(rows: SourceRow[], existing: BookingSnapshot[]): ReconciliationResult[] {
  const claimed = new Set<string>();
  return rows.map((row) => {
    const fingerprint = createSourceFingerprint(row.values);
    const exact = existing.filter((item) => item.fingerprint === fingerprint && !claimed.has(item.bookingId));
    if (exact.length === 1) {
      claimed.add(exact[0].bookingId);
      return { row, fingerprint, bookingId: exact[0].bookingId, action: "unchanged", changedFields: [], protectedFields: [] };
    }
    if (exact.length > 1) return result(row, fingerprint, "review", [], [], "Fingerprint bertabrakan.");

    const candidates = existing.filter((item) => !claimed.has(item.bookingId) && identityScore(row.values, item.snapshot) >= 1);
    if (candidates.length !== 1) {
      return result(row, fingerprint, candidates.length ? "review" : "new", [], [], candidates.length ? "Identitas sumber ambigu." : undefined);
    }

    const candidate = candidates[0];
    const changedFields = changedKeys(candidate.snapshot, row.values);
    const local = new Set(candidate.locallyEditedFields ?? []);
    const protectedFields = changedFields.filter((field) => local.has(field) || (candidate.paymentVerified && billingFields.has(field)));
    claimed.add(candidate.bookingId);
    return { row, fingerprint, bookingId: candidate.bookingId, action: changedFields.length === 0 ? "unchanged" : protectedFields.length ? "review" : "update", changedFields, protectedFields, reason: protectedFields.length ? "Perubahan lokal atau tagihan terverifikasi harus ditinjau." : undefined };
  });
}

export function findMissingBookings(rows: SourceRow[], existing: BookingSnapshot[]) {
  const activeFingerprints = new Set(rows.map((row) => createSourceFingerprint(row.values)));
  return existing.filter((booking) => !activeFingerprints.has(booking.fingerprint) && !rows.some((row) => identityScore(row.values, booking.snapshot) >= 2));
}

function identityScore(current: Record<string, string>, previous: Record<string, string>) {
  return ["registered_at", "raw_name", "contact_phone"].reduce((score, key) => score + (normalizeValue(current[key]) !== "" && normalizeValue(current[key]) === normalizeValue(previous[key]) ? 1 : 0), 0);
}

function changedKeys(previous: Record<string, string>, current: Record<string, string>) {
  return Array.from(new Set([...Object.keys(previous), ...Object.keys(current)])).filter((key) => normalizeValue(previous[key]) !== normalizeValue(current[key]));
}

function normalizeValue(value?: string) {
  return (value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

function result(row: SourceRow, fingerprint: string, action: ReconciliationResult["action"], changedFields: string[], protectedFields: string[], reason?: string): ReconciliationResult {
  return { row, fingerprint, action, changedFields, protectedFields, reason };
}
