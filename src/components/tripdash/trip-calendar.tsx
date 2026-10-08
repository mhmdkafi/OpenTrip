"use client";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { statusLabel, tripStatus } from "@/lib/workspace/presentation";
import type { Workspace, Trip } from "@/lib/workspace/types";

const dateKey = (year: number, month: number, day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
// When several trips share a day, the cell takes the most urgent status.
const PRIORITY = ["risk", "upcoming", "cancelled", "done"] as const;

export function TripCalendar({ state, trips, today, month, onMonth, selected, onSelect }: { state: Workspace; trips: Trip[]; today: string; month: string; onMonth: (month: string) => void; selected: string; onSelect: (date: string) => void }) {
  const [year, monthNumber] = month.split("-").map(Number);
  const index = monthNumber - 1;
  const offset = (new Date(year, index, 1).getDay() + 6) % 7;
  const total = new Date(year, index + 1, 0).getDate();
  const days = Array.from({ length: Math.ceil((offset + total) / 7) * 7 }, (_, i) => i - offset + 1);
  const monthLabel = new Date(year, index, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const move = (amount: number) => { const next = new Date(year, index + amount, 1); onMonth(dateKey(next.getFullYear(), next.getMonth(), 1).slice(0, 7)); };
  return <section className="ov-card cal" aria-label="Departure calendar">
    <div className="ov-card-head">
      <div><h2 aria-live="polite">{monthLabel}</h2><p className="cal-sub">{trips.length} trips this month</p></div>
      <div className="cal-controls">
        {selected && <button className="cal-clear" onClick={() => onSelect("")}><X size={14}/> Clear date</button>}
        <button className="cal-today" onClick={() => onMonth(today.slice(0, 7))}>Today</button>
        <button className="cal-nav" aria-label="Previous month" onClick={() => move(-1)}><ChevronLeft size={18}/></button>
        <button className="cal-nav" aria-label="Next month" onClick={() => move(1)}><ChevronRight size={18}/></button>
      </div>
    </div>
    <div className="cal-weekdays" aria-hidden="true">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => <span key={day}>{day}</span>)}</div>
    <div className="cal-grid">{days.map((day, i) => {
      if (day < 1 || day > total) return <div key={`empty-${i}`} className="cal-cell is-empty"/>;
      const date = dateKey(year, index, day);
      const events = trips.filter(trip => trip.departureDate === date);
      const statuses = events.map(t => tripStatus(t, state, today));
      const tone = PRIORITY.find(s => statuses.includes(s));
      const label = new Date(year, index, day).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
      return <button key={date} className={`cal-cell ${date === today ? "is-today" : ""} ${selected === date ? "is-selected" : ""} ${tone ? `has-trips ov-tone-${tone}` : ""}`} aria-label={`${label}, ${events.length} trip${events.length ? `: ${events.map((t, n) => `${t.title} (${statusLabel[statuses[n]]})`).join(", ")}` : ""}`} aria-pressed={selected === date} aria-current={date === today ? "date" : undefined} onClick={() => onSelect(selected === date ? "" : date)}>
        <span className="cal-number">{day}</span>
        {events.slice(0, 2).map(trip => <span className="cal-event" key={trip.id}>{trip.title}</span>)}
        {events.length > 2 && <small className="cal-more">+{events.length - 2} more</small>}
      </button>;
    })}</div>
    <div className="cal-legend">{(["done", "cancelled", "risk", "upcoming"] as const).map(status => <span key={status} className={`ov-tone-${status}`}><i className="ov-dot"/>{statusLabel[status]}</span>)}</div>
  </section>;
}
