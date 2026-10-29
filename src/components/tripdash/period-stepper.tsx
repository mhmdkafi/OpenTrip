"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

export type StepMode = "month" | "week" | "year";

// en-US short months read "Sep", where en-GB gives "Sept".
const MONTH_SHORT = Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(2000, i, 1)).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }));
const utc = (date: string) => new Date(`${date.slice(0, 10)}T12:00:00Z`);
const iso = (date: Date) => date.toISOString().slice(0, 10);
const monday = (date: string) => { const d = utc(date); d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7); return iso(d); };

// Moves a reference date by whole periods; months clamp to the 1st so the 31st never skips a month.
export function shiftPeriod(mode: StepMode, date: string, by: number) {
  const d = utc(date);
  if (mode === "week") d.setUTCDate(d.getUTCDate() + by * 7);
  else if (mode === "month") { d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + by); }
  else { d.setUTCDate(1); d.setUTCMonth(0); d.setUTCFullYear(d.getUTCFullYear() + by); }
  return iso(d);
}

export function samePeriod(mode: StepMode, a: string, b: string) {
  return mode === "year" ? a.slice(0, 4) === b.slice(0, 4) : mode === "month" ? a.slice(0, 7) === b.slice(0, 7) : monday(a) === monday(b);
}

export function periodLabel(mode: StepMode, date: string, short = false) {
  const d = utc(date);
  if (mode === "year") return String(d.getUTCFullYear());
  if (mode === "month") return short ? `${MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}` : d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  const start = utc(monday(date)), end = new Date(start); end.setUTCDate(start.getUTCDate() + 6);
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  return `${start.getUTCDate()}${sameMonth ? "" : ` ${MONTH_SHORT[start.getUTCMonth()]}`} – ${end.getUTCDate()} ${MONTH_SHORT[end.getUTCMonth()]} ${end.getUTCFullYear()}`;
}

/**
 * ‹ October 2026 › — arrows step one period; the label opens a month (or year) grid to jump further.
 * `size="sm"` is the compact pill used inside cards.
 * With `value={null}` it shows only `placeholder` and opens straight away, so the user picks the
 * period themselves; closing without a choice calls `onDismiss`.
 */
export function PeriodStepper({ mode, value, onChange, today, label, size = "md", showToday = true, placeholder = "Choose period", onDismiss }: { mode: StepMode; value: string | null; onChange: (date: string) => void; today: string; label: string; size?: "md" | "sm"; showToday?: boolean; placeholder?: string; onDismiss?: () => void }) {
  const [open, setOpen] = useState(value === null);
  const [view, setView] = useState(() => Number((value ?? today).slice(0, 4)));
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const dismiss = () => { setOpen(false); if (value === null) onDismiss?.(); };
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) dismiss(); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { dismiss(); root.current?.querySelector<HTMLButtonElement>(".ps-label")?.focus(); } };
    document.addEventListener("pointerdown", close); document.addEventListener("keydown", escape);
    root.current?.querySelector<HTMLButtonElement>(".ps-pop .is-selected, .ps-pop .is-current, .ps-pop .ps-cell")?.focus();
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [open, value, onDismiss]);
  const year = value ? Number(value.slice(0, 4)) : -1, month = value ? Number(value.slice(5, 7)) : -1;
  const pick = (date: string) => { onChange(date); setOpen(false); };
  const decade = Math.floor(view / 12) * 12;
  const toggle = () => { if (value) setView(year); setOpen(!open); };

  return <div className={`ps ps-${size}`} ref={root}>
    {value && <button type="button" className="ps-step" aria-label={`Previous ${mode}`} onClick={() => onChange(shiftPeriod(mode, value, -1))}><ChevronLeft size={size === "sm" ? 16 : 18}/></button>}
    <button type="button" className={`ps-label${value ? "" : " is-placeholder"}`} aria-haspopup="dialog" aria-expanded={open} aria-label={`${label}: ${value ? periodLabel(mode, value) : "not chosen"}. Choose ${mode === "year" ? "a year" : "a month"}`} onClick={toggle}>
      <span aria-live="polite">{value ? periodLabel(mode, value, size === "sm") : placeholder}</span><ChevronDown size={14} className="ps-chevron"/>
    </button>
    {value && <button type="button" className="ps-step" aria-label={`Next ${mode}`} onClick={() => onChange(shiftPeriod(mode, value, 1))}><ChevronRight size={size === "sm" ? 16 : 18}/></button>}
    {value && showToday && !samePeriod(mode, value, today) && <button type="button" className="ps-today" onClick={() => onChange(mode === "week" ? today : mode === "month" ? `${today.slice(0, 7)}-01` : `${today.slice(0, 4)}-01-01`)}>{mode === "week" ? "This week" : mode === "month" ? "This month" : "This year"}</button>}
    {open && <div className="ps-pop" role="dialog" aria-label={`Choose ${mode === "year" ? "a year" : "a month"}`}>
      <div className="ps-pop-head">
        <button type="button" className="ps-step" aria-label={mode === "year" ? "Earlier years" : "Previous year"} onClick={() => setView(view - (mode === "year" ? 12 : 1))}><ChevronLeft size={16}/></button>
        <strong>{mode === "year" ? `${decade} – ${decade + 11}` : view}</strong>
        <button type="button" className="ps-step" aria-label={mode === "year" ? "Later years" : "Next year"} onClick={() => setView(view + (mode === "year" ? 12 : 1))}><ChevronRight size={16}/></button>
      </div>
      <div className="ps-grid">
        {mode === "year"
          ? Array.from({ length: 12 }, (_, i) => decade + i).map(y => <button type="button" key={y} className={`ps-cell${y === year ? " is-selected" : ""}${String(y) === today.slice(0, 4) ? " is-current" : ""}`} aria-pressed={y === year} onClick={() => pick(`${y}-01-01`)}>{y}</button>)
          : MONTH_SHORT.map((name, i) => {
            const key = `${view}-${String(i + 1).padStart(2, "0")}`;
            return <button type="button" key={key} className={`ps-cell${view === year && i + 1 === month ? " is-selected" : ""}${key === today.slice(0, 7) ? " is-current" : ""}`} aria-pressed={view === year && i + 1 === month} onClick={() => pick(`${key}-01`)}>{name}</button>;
          })}
      </div>
    </div>}
  </div>;
}
