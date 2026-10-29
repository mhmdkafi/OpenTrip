"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Page numbers to show around the current page, with "gap" markers for skipped ranges.
export function pageItems(current: number, count: number): (number | "gap")[] {
  if (count <= 7) return Array.from({ length: count }, (_, index) => index);
  const start = Math.max(1, Math.min(current - 1, count - 4)), end = Math.min(count - 2, Math.max(current + 1, 3));
  const middle = Array.from({ length: end - start + 1 }, (_, index) => start + index);
  return [0, ...(start > 1 ? ["gap" as const] : []), ...middle, ...(end < count - 2 ? ["gap" as const] : []), count - 1];
}

// Shared table footer: "Showing 11–20 of 57 participants" plus numbered page buttons. `page` is zero-based.
export function Pagination({ page, total, pageSize, unit, onChange }: { page: number; total: number; pageSize: number; unit: string; onChange: (page: number) => void }) {
  const count = Math.ceil(total / pageSize);
  if (count <= 1) return null;
  const current = Math.min(page, count - 1);
  return <div className="table-foot pager">
    <span className="pager-summary">Showing <b>{current * pageSize + 1}–{Math.min((current + 1) * pageSize, total)}</b> of <b>{total}</b> {unit} · Page {current + 1} of {count}</span>
    <nav className="pager-pages" aria-label="Pagination">
      <button className="pager-step" disabled={current === 0} onClick={() => onChange(current - 1)} aria-label="Previous page"><ChevronLeft size={16}/><span>Previous</span></button>
      {pageItems(current, count).map((item, index) => item === "gap"
        ? <span key={`gap-${index}`} className="pager-gap" aria-hidden="true">…</span>
        : <button key={item} className={`pager-number${item === current ? " is-current" : ""}`} aria-current={item === current ? "page" : undefined} aria-label={`Page ${item + 1}`} onClick={() => onChange(item)}>{item + 1}</button>)}
      <button className="pager-step" disabled={current === count - 1} onClick={() => onChange(current + 1)} aria-label="Next page"><span>Next</span><ChevronRight size={16}/></button>
    </nav>
  </div>;
}
