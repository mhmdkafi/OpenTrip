"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarX2, ChevronRight, FileSpreadsheet, MapPin, Search, Users, X } from "lucide-react";
import { useWorkspace } from "./context";
import { Modal } from "./ui";
import { SpreadsheetImport } from "./spreadsheet-import";
import { dateLabel, monthLabel, statusLabel, todayWib, tripStatus, weekKey } from "@/lib/workspace/presentation";

const PERIODS = [["month", "Monthly"], ["week", "Weekly"], ["year", "Yearly"], ["all", "All time"]] as const;

export function Trips() {
  const { state, basePath } = useWorkspace();
  const [importing, setImporting] = useState(false);
  const [period, setPeriod] = useState("month");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => { if (window.location.hash === "#impor") queueMicrotask(() => setImporting(true)); }, []);
  const today = todayWib();
  const trips = state.trips.filter(t => t.title.toLowerCase().includes(search.toLowerCase())
    && (!t.departureDate || period === "all" || period === "year" && t.departureDate.startsWith(today.slice(0,4)) || period === "month" && t.departureDate.startsWith(today.slice(0,7)) || period === "week" && weekKey(t.departureDate) === weekKey(today))
    && (!t.departureDate || (!rangeFrom || t.departureDate >= rangeFrom) && (!rangeTo || t.departureDate <= rangeTo))
  ).sort((a,b) => a.departureDate.localeCompare(b.departureDate));
  const months = [...new Set(trips.map(t => t.departureDate.slice(0,7)))];
  const participants = (tripId: string) => state.participants.filter(p => p.tripId === tripId && p.status === "active").length;
  return <div className="ov ts">
    <div className="page-heading ov-heading"><h1>Trip Schedule</h1><button className="ts-primary" onClick={() => setImporting(true)}><FileSpreadsheet size={16}/> Import spreadsheet</button></div>

    <section className="ov-card ts-filters" aria-label="Filters">
      <div className="ov-toolbar" role="group" aria-label="Schedule view">{PERIODS.map(([value, label]) => <button key={value} aria-pressed={period === value} className={period === value ? "is-active" : ""} onClick={() => setPeriod(value)}>{label}</button>)}</div>
      <div className="ts-range"><input type="date" aria-label="From date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)}/><span>–</span><input type="date" aria-label="To date" value={rangeTo} onChange={e => setRangeTo(e.target.value)}/>{(rangeFrom || rangeTo) && <button className="ts-clear" aria-label="Clear date range" onClick={() => { setRangeFrom(""); setRangeTo(""); }}><X size={14}/></button>}</div>
      <label className="ts-search"><Search size={16}/><input aria-label="Search trips" placeholder="Search trip name" value={search} onChange={e => setSearch(e.target.value)}/></label>
    </section>

    {trips.length > 0 && <p className="ts-caption">{trips.length} trips · sorted by departure</p>}

    {months.map(month => {
      const monthTrips = trips.filter(t => t.departureDate.slice(0,7) === month);
      return <section className="ov-card ts-month" key={month}>
        <div className="ov-card-head"><h2>{month ? monthLabel(month) : "Not scheduled"}</h2><span className="ts-count">{monthTrips.length} {monthTrips.length === 1 ? "trip" : "trips"}</span></div>
        {[...new Set(monthTrips.map(t => weekKey(t.departureDate)))].map(week => <div className="ts-week" key={week}>
          <p className="ts-week-label">{week ? `Week of ${dateLabel(week)}` : "Add a date from the trip details"}</p>
          <div className="ov-agenda-list">{monthTrips.filter(t => weekKey(t.departureDate) === week).map(trip => {
            const status = tripStatus(trip, state, today);
            const date = trip.departureDate ? new Date(`${trip.departureDate}T12:00:00`) : null;
            return <Link className={`ov-agenda-item ts-trip ov-tone-${status}`} key={trip.id} href={`${basePath}/trips/${trip.id}`}>
              <div className="ov-date"><strong>{date ? date.getDate() : "—"}</strong><span>{date ? date.toLocaleDateString("en-GB", { weekday: "short" }) : ""}</span></div>
              <div className="ov-agenda-body"><h3>{trip.title}{trip.volume ? <small> · {trip.volume}</small> : null}</h3><p>{dateLabel(trip.departureDate, true)}{trip.location ? <span className="ts-location"><MapPin size={12}/>{trip.location}</span> : null}</p></div>
              <span className="ts-people"><Users size={14}/>{participants(trip.id)}</span>
              <span className="ov-badge">{statusLabel[status]}</span>
              <ChevronRight size={18} className="ts-chevron"/>
            </Link>;
          })}</div>
        </div>)}
      </section>;
    })}

    {!trips.length && <section className="ov-card ts-empty"><CalendarX2 size={28}/><h3>No trips in this period</h3><p>Change the period or import a registration spreadsheet.</p></section>}
    {importing && <Modal title="Import spreadsheet" onClose={() => setImporting(false)} wide><SpreadsheetImport/></Modal>}
  </div>;
}
