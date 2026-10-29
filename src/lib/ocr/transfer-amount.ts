// Reads the transferred amount from OCR text of a bank transfer receipt.
// Prefers a labelled line ("Total", "Jumlah", "Nominal"), then the amount repeated most often.

const AMOUNT = /(?:rp|idr)?\.?\s*(\d{1,3}(?:[.,\s]\d{3})+(?:[.,]\d{2})?|\d{4,9}(?:[.,]\d{2})?)\b/gi;
const LABELS = [/\btotal\b(?!.*biaya)/i, /\b(jumlah|nominal|amount|transfer amount)\b/i];

export function toRupiah(raw: string) {
  // Drop a trailing two-digit decimal part ("175.000,00" or "175,000.00"), then all separators.
  const amount = Number(raw.replace(/\s/g, "").replace(/[.,]\d{2}$/, "").replace(/[.,]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function amountsIn(line: string, requireCurrency: boolean) {
  return [...line.matchAll(AMOUNT)]
    .filter(match => !requireCurrency || /rp|idr/i.test(match[0]))
    .map(match => toRupiah(match[1]))
    .filter(amount => amount >= 1000 && amount <= 100_000_000);
}

export function parseTransferAmount(text: string): number | null {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  for (const label of LABELS) {
    for (const line of lines) {
      if (!label.test(line) || /biaya|fee|admin/i.test(line)) continue;
      const found = amountsIn(line, false);
      if (found.length) return found[found.length - 1];
    }
  }
  const counts = new Map<number, number>();
  for (const line of lines) for (const amount of amountsIn(line, true)) counts.set(amount, (counts.get(amount) ?? 0) + 1);
  const ranked = [...counts].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  return ranked[0]?.[0] ?? null;
}
