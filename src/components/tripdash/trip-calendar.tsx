"use client";
import { ChevronLeft, ChevronRight, CalendarDays, X } from "lucide-react";
import { useState } from "react";
import { statusLabel, tripStatus } from "@/lib/workspace/presentation";
import type { Workspace, Trip } from "@/lib/workspace/types";

const dateKey = (year: number, month: number, day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

export function TripCalendar({ state, trips, today, selected, onSelect }: { state: Workspace; trips: Trip[]; today: string; selected: string; onSelect: (date: string) => void }) {
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [year, monthNumber] = month.split("-").map(Number);
  const index = monthNumber - 1;
  const offset = (new Date(year, index, 1).getDay() + 6) % 7;
  const total = new Date(year, index + 1, 0).getDate();
  const days = Array.from({ length: Math.ceil((offset + total) / 7) * 7 }, (_, i) => i - offset + 1);
  const monthLabel = new Date(year, index, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const monthTrips = trips.filter(trip => trip.departureDate.startsWith(month));
  function move(amount: number) {
    const next = new Date(year, index + amount, 1);
    setMonth(dateKey(next.getFullYear(), next.getMonth(), 1).slice(0, 7));
    onSelect("");
  }
  return <section className="td-panel schedule-calendar" aria-label="Kalender keberangkatan">
    <div className="panel-heading"><div><span className="eyebrow">KALENDER KEBERANGKATAN</span><h2 aria-live="polite">{monthLabel}</h2></div><div className="calendar-controls"><button className="td-secondary" onClick={() => { setMonth(today.slice(0, 7)); onSelect(""); }}>Bulan ini</button><button className="icon-button" aria-label="Bulan sebelumnya" onClick={() => move(-1)}><ChevronLeft size={18}/></button><button className="icon-button" aria-label="Bulan berikutnya" onClick={() => move(1)}><ChevronRight size={18}/></button></div></div>
    <div className="calendar-weekdays" aria-hidden="true">{["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map(day => <span key={day}>{day}</span>)}</div>
    <div className="calendar-days">{days.map((day, i) => {
      if (day < 1 || day > total) return <div key={`empty-${i}`} className="calendar-empty"/>;
      const date = dateKey(year, index, day);
      const events = monthTrips.filter(trip => trip.departureDate === date);
      const status = (["risk","upcoming","cancelled","done"] as const).find(value=>events.some(t=>tripStatus(t,state,today)===value));
      const label = new Date(year, index, day).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
      return <button key={date} className={`calendar-day ${date === today ? "is-today" : ""} ${selected === date ? "is-selected" : ""} ${events.length ? `has-trips status-${status}` : ""}`} aria-label={`${label}, ${events.length} trip${events.length ? `: ${events.map(t => `${t.title} (${statusLabel[tripStatus(t,state,today)]})`).join(", ")}` : ""}`} aria-pressed={selected === date} aria-current={date === today ? "date" : undefined} onClick={() => onSelect(selected === date ? "" : date)}><span className="calendar-number">{day}</span>{events.slice(0, 1).map(trip => <span className={`calendar-event status-${tripStatus(trip,state,today)}`} title={statusLabel[tripStatus(trip,state,today)]} key={trip.id}>{trip.title}</span>)}{events.length > 1 && <small className="calendar-extra">+{events.length - 1} trip</small>}{events.length > 0 && <span className={`calendar-mobile-dot status-${tripStatus(events[0],state,today)}`} aria-hidden="true"/>}</button>;
    })}</div>
    <div className="calendar-status-legend">{(["upcoming","done","risk","cancelled"] as const).map(status=><span key={status} className={`status-${status}`}><i/>{statusLabel[status]}</span>)}</div>
    <div className="calendar-foot"><span><CalendarDays size={14}/>{monthTrips.length} perjalanan bulan ini · pilih tanggal untuk melihat trip</span>{selected && <button className="text-link" onClick={() => onSelect("")}><X size={14}/> Hapus filter tanggal</button>}</div>
  </section>;
}
