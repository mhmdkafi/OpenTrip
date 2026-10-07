"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, FileSpreadsheet, Search } from "lucide-react";
import { useWorkspace } from "./context";
import { Modal, Select } from "./ui";

import { SpreadsheetImport } from "./spreadsheet-import";
import { dateLabel, monthLabel, statusLabel, todayWib, tripStatus, weekKey } from "@/lib/workspace/presentation";

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
  return <div className="section-stack">
    <div className="schedule-toolbar"><div className="toolbar-actions"><button className="td-button" onClick={() => setImporting(true)}><FileSpreadsheet size={16}/> Import spreadsheet</button></div><div className="period-controls"><Select label="Schedule view" value={period} onChange={setPeriod}><option value="month">Monthly</option><option value="week">Weekly</option><option value="year">Yearly</option><option value="all">All time</option></Select><div className="form-label date-range-field"><span>Date range</span><div className="date-range-inputs"><input className="td-input" type="date" aria-label="From date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)}/><span>–</span><input className="td-input" type="date" aria-label="To date" value={rangeTo} onChange={e => setRangeTo(e.target.value)}/></div></div><label className="search-field"><Search size={16}/><input aria-label="Search trips" placeholder="Search trip name" value={search} onChange={e => setSearch(e.target.value)}/></label></div></div>
    <div className="list-caption"><span>{trips.length} trips</span><span>Sorted by departure</span></div>
    {months.map(month => <section className="schedule-month" key={month}><div className="month-heading"><h2>{month ? monthLabel(month) : "Not scheduled"}</h2><span>{trips.filter(t => t.departureDate.slice(0,7) === month).length} trip</span></div>{[...new Set(trips.filter(t => t.departureDate.slice(0,7) === month).map(t => weekKey(t.departureDate)))].map(week => <div className="schedule-week" key={week}><div className="week-heading"><span>{week ? `Week of ${dateLabel(week)}` : "Add a date from the trip details"}</span></div><div className="schedule-trips">{trips.filter(t => t.departureDate.slice(0,7) === month && weekKey(t.departureDate) === week).map(trip => {
      const count = state.participants.filter(p => p.tripId === trip.id && p.status === "active").length;
      const status = tripStatus(trip,state,today);
      return <Link className="schedule-trip" key={trip.id} href={`${basePath}/trips/${trip.id}`}><div className="date-block"><strong>{trip.departureDate ? new Date(trip.departureDate).getUTCDate() : "—"}</strong><span>{trip.departureDate ? new Date(trip.departureDate).toLocaleDateString("en-GB",{weekday:"short"}) : ""}</span></div><div className="schedule-trip-name"><h3>{trip.title}{trip.volume && <small> · {trip.volume}</small>}</h3><p>{dateLabel(trip.departureDate,true)}{trip.location ? ` · ${trip.location}` : ""}</p></div><span className="schedule-participants">{count} participants</span><span className={`badge ${`status-${status}`}`}>{statusLabel[status]}</span><ArrowRight size={18}/></Link>;
    })}</div></div>)}</section>)}
    {!trips.length && <div className="empty-state"><h3>No trips in this period</h3><p>Change the period or import a registration spreadsheet.</p></div>}
    {importing && <Modal title="Import spreadsheet" onClose={() => setImporting(false)} wide><SpreadsheetImport/></Modal>}
  </div>;
}
