export const RUPIAH_FORMATTER = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatRupiah(amount: number | bigint): string {
  return RUPIAH_FORMATTER.format(Number(amount));
}

export function parseRupiah(str: string): number {
  const trimmed = str.trim();
  if (!trimmed) return 0;

  const isNegative = trimmed.includes("-");
  let clean = trimmed;
  const hasComma = clean.includes(",");
  const hasDot = clean.includes(".");

  if (hasComma && hasDot) {
    const lastComma = clean.lastIndexOf(",");
    const lastDot = clean.lastIndexOf(".");
    clean = lastComma > lastDot
      ? clean.replace(/\./g, "").replace(",", ".")
      : clean.replace(/,/g, "");
  } else if (hasComma) {
    const parts = clean.split(",");
    clean = parts.length === 2 && /^\d{3}$/.test(parts[1])
      ? clean.replace(/,/g, "")
      : clean.replace(",", ".");
  } else if (hasDot) {
    const parts = clean.split(".");
    if (parts.length > 2 || (parts.length === 2 && /^\d{3}(\D|$)/.test(parts[parts.length - 1]))) {
      clean = clean.replace(/\./g, "");
    }
  }

  const digits = clean.replace(/[^\d.]/g, "");
  const num = Math.floor(Number.parseFloat(digits)) || 0;
  return isNegative ? -num : num;
}

export const BILL_STATUSES = {
  UNPAID: "unpaid",
  DP: "dp",
  PAID: "paid",
} as const;

export const BILL_STATUS_LABELS: Record<string, string> = {
  unpaid: "Belum Lunas — Belum bayar",
  dp: "Belum Lunas — DP",
  paid: "Lunas",
};

export const PAYMENT_STATUSES = {
  PENDING: "pending",
  VERIFIED: "verified",
  REJECTED: "rejected",
} as const;

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu verifikasi",
  verified: "Terverifikasi",
  rejected: "Ditolak",
};

export const PARTICIPANT_STATUSES = {
  ACTIVE: "active",
  CANCELLED: "cancelled",
} as const;

export const PARTICIPANT_STATUS_LABELS: Record<string, string> = {
  active: "Aktif",
  cancelled: "Dibatalkan",
};

export function calculateBillStatus(
  totalBilled: number,
  totalPaid: number
): (typeof BILL_STATUSES)[keyof typeof BILL_STATUSES] {
  if (totalBilled <= 0) return BILL_STATUSES.PAID;
  if (totalPaid === 0) return BILL_STATUSES.UNPAID;
  if (totalPaid < totalBilled) return BILL_STATUSES.DP;
  return BILL_STATUSES.PAID;
}

export function calculateRemaining(
  totalBilled: number,
  totalPaid: number
): number {
  return Math.max(totalBilled - totalPaid, 0);
}

export function calculateTotalBill(
  baseAmount: number,
  adjustment: number
): number {
  return baseAmount + adjustment;
}

export function splitNames(rawName: string): string[] {
  const separators = /\s*[\+,\n]\s*/;
  const names = rawName
    .split(separators)
    .map(n => n.trim())
    .filter((n) => n.length > 0);
  return names;
}

export function validateSplitNames(names: string[]): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (names.length === 0) issues.push("Tidak ada nama yang valid");
  for (let i = 0; i < names.length; i++) {
    if (!names[i] || names[i].trim().length === 0) issues.push(`Nama ke-${i + 1} kosong`);
  }
  return { valid: issues.length === 0, issues };
}
