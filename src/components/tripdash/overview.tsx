"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarRange, CheckCircle2, ChevronLeft, ChevronRight, Clock, X, XCircle, type LucideIcon } from "lucide-react";
import { useWorkspace } from "./context";
import { TripCalendar } from "./trip-calendar";
import { dateLabel, statusLabel, todayWib, tripStatus } from "@/lib/workspace/presentation";
import type { Trip } from "@/lib/workspace/types";

type Tile = "total" | "done" | "cancelled" | "risk" | "upcoming";
const TILES: Tile[] = ["total", "done", "cancelled", "risk", "upcoming"];
const tileIcon: Record<Tile, LucideIcon> = { total: CalendarRange, done: CheckCircle2, cancelled: XCircle, risk: AlertTriangle, upcoming: Clock };
const tileLabel = (tile: Tile) => tile === "total" ? "Total trips" : statusLabel[tile];

export function Overview() {
  const { state, basePath } = useWorkspace();
  const today = todayWib();
  const [view, setView] = useState<"month" | "year">("month");
  const [viewDate] = useState(() => new Date());
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [selected, setSelected] = useState("");
  const [preview, setPreview] = useState<Tile | null>(null);
  const year = month.slice(0, 4);
  const period = view === "month" ? month : year;
  const periodTrips = state.trips.filter(t => t.status !== "archived" && t.departureDate.startsWith(period)).sort((a, b) => a.departureDate.localeCompare(b.departureDate));
  const byTile = (tile: Tile) => tile === "total" ? periodTrips : periodTrips.filter(t => tripStatus(t, state, today) === tile);
  const agenda = selected ? periodTrips.filter(t => t.departureDate === selected) : periodTrips;
  const active = state.participants.filter(p => p.status === "active");
  const periodName = view === "month" ? new Date(`${month}-01T12:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : year;
  const changeMonth = (next: string) => { setMonth(next); setSelected(""); setPreview(null); };
  const openMonth = (next: string) => { changeMonth(next); setView("month"); };
  return <div className="ov">
    <div className="page-heading ov-heading"><h1>Overview</h1><div className="ov-heading-tools"><div className="ov-toolbar" role="group" aria-label="Overview period">{(["month", "year"] as const).map(v => <button key={v} aria-pressed={view === v} className={view === v ? "is-active" : ""} onClick={() => { setView(v); setSelected(""); setPreview(null); }}>{v === "month" ? "Month" : "Year"}</button>)}</div><span className="view-date">{viewDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" })}</span></div></div>
    <div className="ov-stats">{TILES.map(tile => { const Icon = tileIcon[tile]; return <button key={tile} className={`ov-stat ov-tone-${tile}`} onClick={() => setPreview(tile)}>
      <span className="ov-stat-icon" aria-hidden="true"><Icon size={18} strokeWidth={1.8}/></span>
      <span className="ov-stat-label">{tile !== "total" && <i className="ov-dot"/>}{tileLabel(tile)}</span>
      <strong>{byTile(tile).length}</strong>
    </button>; })}</div>
    <div className="ov-main">
      {view === "month"
        ? <TripCalendar state={state} trips={periodTrips} today={today} month={month} onMonth={changeMonth} selected={selected} onSelect={setSelected}/>
        : <YearGrid year={year} today={today} trips={periodTrips} statusOf={trip => tripStatus(trip, state, today)} onYear={next => changeMonth(`${next}${month.slice(4)}`)} onOpen={openMonth}/>}
      <section className="ov-card ov-agenda">
        <div className="ov-card-head"><h2>{selected ? dateLabel(selected, true) : `Trips in ${periodName}`}</h2><Link className="ov-link" href={`${basePath}/trips`}>Full schedule <ArrowRight size={14}/></Link></div>
        <div className="ov-agenda-list">{agenda.map(trip => <AgendaItem key={trip.id} trip={trip} href={`${basePath}/trips/${trip.id}`} count={active.filter(p => p.tripId === trip.id).length} status={tripStatus(trip, state, today)}/>)}
          {!agenda.length && <p className="ov-empty">No trips {selected ? "on this date" : `this ${view}`}.</p>}</div>
      </section>
    </div>
    {preview && <TilePreview title={`${tileLabel(preview)} · ${periodName}`} tone={preview} onClose={() => setPreview(null)}>
      {byTile(preview).map(trip => <AgendaItem key={trip.id} trip={trip} href={`${basePath}/trips/${trip.id}`} count={active.filter(p => p.tripId === trip.id).length} status={tripStatus(trip, state, today)}/>)}
      {!byTile(preview).length && <p className="ov-empty">No trips this {view}.</p>}
    </TilePreview>}
  </div>;
}

function AgendaItem({ trip, href, count, status }: { trip: Trip; href: string; count: number; status: ReturnType<typeof tripStatus> }) {
  const date = new Date(`${trip.departureDate}T12:00:00`);
  return <Link className={`ov-agenda-item ov-tone-${status}`} href={href}>
    <div className="ov-date"><strong>{date.getDate()}</strong><span>{date.toLocaleDateString("en-GB", { month: "short" })}</span></div>
    <div className="ov-agenda-body"><h3>{trip.title}{trip.volume ? <small> · {trip.volume}</small> : null}</h3><p>{count} participants · min. {trip.minimumParticipants ?? 7}</p></div>
    <span className="ov-badge">{statusLabel[status]}</span>
  </Link>;
}

function TilePreview({ title, tone, onClose, children }: { title: string; tone: Tile; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className={`ov-preview ov-tone-${tone}`} aria-label={title} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="ov-preview-card">
      <div className="ov-card-head"><h2>{tone !== "total" && <i className="ov-dot"/>}{title}</h2><button className="cal-nav" aria-label="Close preview" onClick={onClose}><X size={16}/></button></div>
      <div className="ov-agenda-list">{children}</div>
    </div>
  </dialog>;
}

function YearGrid({ year, today, trips, statusOf, onYear, onOpen }: { year: string; today: string; trips: Trip[]; statusOf: (trip: Trip) => ReturnType<typeof tripStatus>; onYear: (year: string) => void; onOpen: (month: string) => void }) {
  return <section className="ov-card" aria-label="Yearly overview">
    <div className="ov-card-head">
      <div><h2 aria-live="polite">{year}</h2><p className="cal-sub">{trips.length} trips this year</p></div>
      <div className="cal-controls">
        <button className="cal-today" onClick={() => onYear(today.slice(0, 4))}>This year</button>
        <button className="cal-nav" aria-label="Previous year" onClick={() => onYear(String(Number(year) - 1))}><ChevronLeft size={18}/></button>
        <button className="cal-nav" aria-label="Next year" onClick={() => onYear(String(Number(year) + 1))}><ChevronRight size={18}/></button>
      </div>
    </div>
    <div className="yr-grid">{Array.from({ length: 12 }, (_, i) => {
      const key = `${year}-${String(i + 1).padStart(2, "0")}`;
      const list = trips.filter(t => t.departureDate.startsWith(key));
      const name = new Date(`${key}-01T12:00:00`).toLocaleDateString("en-GB", { month: "long" });
      return <button key={key} className={`yr-month ${key === today.slice(0, 7) ? "is-current" : ""} ${list.length ? "" : "is-empty"}`} aria-label={`${name} ${year}, ${list.length} trips`} onClick={() => onOpen(key)}>
        <span className="yr-name">{name}</span>
        <strong>{list.length}<small> trips</small></strong>
        <span className="yr-statuses">{(["done", "cancelled", "risk", "upcoming"] as const).map(status => { const count = list.filter(t => statusOf(t) === status).length; return count ? <span key={status} className={`ov-tone-${status}`}><i className="ov-dot"/>{count}</span> : null; })}</span>
      </button>;
    })}</div>
    <div className="cal-legend">{(["done", "cancelled", "risk", "upcoming"] as const).map(status => <span key={status} className={`ov-tone-${status}`}><i className="ov-dot"/>{statusLabel[status]}</span>)}</div>
  </section>;
}
