"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, CalendarDays, CalendarRange, CalendarX2, ChevronRight, FileSpreadsheet, MapPin, Search, Users, X } from "lucide-react";
import { useWorkspace } from "./context";
import { Modal } from "./ui";
import { SpreadsheetImport } from "./spreadsheet-import";
import { Dropdown } from "./dropdown";
import { dateLabel, monthLabel, statusLabel, todayWib, tripStatus, weekKey } from "@/lib/workspace/presentation";

const PERIODS = [{ value: "month", label: "Monthly", icon: CalendarDays }, { value: "week", label: "Weekly", icon: CalendarRange }, { value: "year", label: "Yearly", icon: Calendar }] as const;

// Week N of a month: week 1 is the Monday-start week containing the 1st.
function weekOfMonth(date: string) {
  const day = Number(date.slice(8, 10));
  const firstOffset = (new Date(`${date.slice(0, 7)}-01T12:00:00Z`).getUTCDay() + 6) % 7;
  return Math.floor((day + firstOffset - 1) / 7) + 1;
}
const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1).padStart(2, "0"), label: new Date(Date.UTC(2000, i, 1)).toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" }), icon: CalendarDays }));
const weeksIn = (year: string, month: string) => weekOfMonth(new Date(Date.UTC(Number(year), Number(month), 0)).toISOString().slice(0, 10));

export function Trips() {
  const { state, basePath } = useWorkspace();
  const [importing, setImporting] = useState(false);
  const [period, setPeriod] = useState("month");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => { if (window.location.hash === "#impor") queueMicrotask(() => setImporting(true)); }, []);
  const today = todayWib();
  const [year, setYear] = useState(today.slice(0, 4));
  const [month, setMonth] = useState(today.slice(5, 7));
  const [week, setWeek] = useState(String(weekOfMonth(today)));
  const tripYears = state.trips.map(t => Number(t.departureDate.slice(0, 4))).filter(Boolean);
  const firstYear = Math.min(Number(today.slice(0, 4)), ...tripYears), lastYear = Math.max(Number(today.slice(0, 4)) + 1, ...tripYears);
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => ({ value: String(lastYear - i), label: String(lastYear - i), icon: Calendar }));
  const weeks = Array.from({ length: weeksIn(year, month) }, (_, i) => ({ value: String(i + 1), label: `Week ${i + 1}`, icon: CalendarRange }));
  const inPeriod = (date: string) => period === "year" ? date.startsWith(year) : date.startsWith(`${year}-${month}`) && (period !== "week" || String(weekOfMonth(date)) === week);
  const trips = state.trips.filter(t => t.title.toLowerCase().includes(search.toLowerCase())
    && (!t.departureDate || inPeriod(t.departureDate))
    && (!t.departureDate || (!rangeFrom || t.departureDate >= rangeFrom) && (!rangeTo || t.departureDate <= rangeTo))
  ).sort((a,b) => a.departureDate.localeCompare(b.departureDate));
  const months = [...new Set(trips.map(t => t.departureDate.slice(0,7)))];
  const participants = (tripId: string) => state.participants.filter(p => p.tripId === tripId && p.status === "active").length;
  return <div className="ov ts">
    <div className="page-heading ov-heading"><h1>Trip Schedule</h1><button className="ts-primary" onClick={() => setImporting(true)}><FileSpreadsheet size={16}/> Import spreadsheet</button></div>

    <section className="ov-card ts-filters" aria-label="Filters">
      <label className="ts-field ts-field-search"><span className="ts-field-label">Search</span><span className="ts-control"><Search size={16}/><input placeholder="Search trip name" value={search} onChange={e => setSearch(e.target.value)}/></span></label>
      <div className="ts-filter-group">
      <div className="ts-field ts-field-view"><span className="ts-field-label">View</span><Dropdown label="View" value={period} options={PERIODS} onChange={setPeriod}/></div>
      <div className="ts-field ts-field-range" role="group" aria-label="Date range"><span className="ts-field-label">Date range</span>
        <div className="ts-range-pair">
          <span className="ts-control ts-date"><input type="date" aria-label="From date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)}/></span>
          <span className="ts-range-sep">–</span>
          <span className="ts-control ts-date"><input type="date" aria-label="To date" value={rangeTo} onChange={e => setRangeTo(e.target.value)}/>{(rangeFrom || rangeTo) && <button className="ts-clear" aria-label="Clear date range" onClick={() => { setRangeFrom(""); setRangeTo(""); }}><X size={14}/></button>}</span>
        </div>
      </div>
      </div>
    </section>

    <section className="ov-card ts-list">
      <div className="ov-card-head ts-list-head">
        <div className="ts-period" role="heading" aria-level={2}>
          {period !== "year" && <Dropdown variant="inline" label="Month" value={month} options={MONTHS} onChange={value => { setMonth(value); setWeek("1"); }}/>}
          <Dropdown variant="inline" label="Year" value={year} options={years} onChange={value => { setYear(value); setWeek("1"); }}/>
          {period === "week" && <Dropdown variant="inline" label="Week" value={week} options={weeks} onChange={setWeek}/>}
        </div>
        <span className="ts-count">{trips.length} {trips.length === 1 ? "trip" : "trips"}</span>
      </div>
      {months.map(group => {
        const monthTrips = trips.filter(t => t.departureDate.slice(0,7) === group);
        return <div className="ts-month" key={group}>
          {(period === "year" || !group) && <h3 className="ts-month-label">{group ? monthLabel(group) : "Not scheduled"}</h3>}
          {[...new Set(monthTrips.map(t => weekKey(t.departureDate)))].map(weekGroup => <div className="ts-week" key={weekGroup}>
            <p className="ts-week-label">{weekGroup ? `Week ${weekOfMonth(monthTrips.find(t => weekKey(t.departureDate) === weekGroup)!.departureDate)}` : "Add a date from the trip details"}</p>
            <div className="ov-agenda-list">{monthTrips.filter(t => weekKey(t.departureDate) === weekGroup).map(trip => {
              const status = tripStatus(trip, state, today);
              const date = trip.departureDate ? new Date(`${trip.departureDate}T12:00:00`) : null;
              return <Link className={`ov-agenda-item ts-trip ov-tone-${status}`} key={trip.id} href={`${basePath}/trips/${trip.id}`} prefetch={true}>
                <div className="ov-date"><strong>{date ? date.getDate() : "—"}</strong><span>{date ? date.toLocaleDateString("en-GB", { weekday: "short" }) : ""}</span></div>
                <div className="ov-agenda-body"><h3>{trip.title}{trip.volume ? <small> · {trip.volume}</small> : null}</h3><p>{dateLabel(trip.departureDate, true)}{trip.location ? <span className="ts-location"><MapPin size={12}/>{trip.location}</span> : null}</p></div>
                <span className="ts-people"><Users size={14}/>{participants(trip.id)}</span>
                <span className="ov-badge">{statusLabel[status]}</span>
                <ChevronRight size={18} className="ts-chevron"/>
              </Link>;
            })}</div>
          </div>)}
        </div>;
      })}
      {!trips.length && <div className="ts-empty"><CalendarX2 size={28}/><h3>No trips in this period</h3><p>Pick another month or year, change the search or date range, or import a registration spreadsheet.</p></div>}
    </section>
    {importing && <Modal title="Import spreadsheet" onClose={() => setImporting(false)} wide><SpreadsheetImport/></Modal>}
  </div>;
}
