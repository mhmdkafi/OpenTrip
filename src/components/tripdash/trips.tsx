"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, FileSpreadsheet, Search } from "lucide-react";
import { useWorkspace } from "./context";
import { Field, Modal, Select } from "./ui";

import { SpreadsheetImport } from "./spreadsheet-import";
import { dateLabel, demoToday, monthLabel, statusLabel, todayWib, tripStatus, weekKey } from "@/lib/workspace/presentation";

export function Trips() {
  const { state, basePath, prototype } = useWorkspace();
  const [importing, setImporting] = useState(false);
  const [period, setPeriod] = useState("month");
  const [reference, setReference] = useState(prototype ? demoToday : todayWib);
  const [search, setSearch] = useState("");
  useEffect(() => { if (window.location.hash === "#impor") queueMicrotask(() => setImporting(true)); }, []);
  const today = prototype ? demoToday : todayWib();
  const trips = state.trips.filter(t => t.title.toLowerCase().includes(search.toLowerCase()) && (!t.departureDate || period === "all" || period === "year" && t.departureDate.startsWith(reference.slice(0,4)) || period === "month" && t.departureDate.startsWith(reference.slice(0,7)) || period === "week" && weekKey(t.departureDate) === weekKey(reference))).sort((a,b) => a.departureDate.localeCompare(b.departureDate));
  const months = [...new Set(trips.map(t => t.departureDate.slice(0,7)))];
  return <div className="section-stack">
    <div className="schedule-toolbar"><div className="toolbar-actions"><button className="td-button" onClick={() => setImporting(true)}><FileSpreadsheet size={16}/> Impor spreadsheet</button></div><div className="period-controls"><Select label="Tampilan jadwal" value={period} onChange={setPeriod}><option value="month">Bulanan</option><option value="week">Mingguan</option><option value="year">Tahunan</option><option value="all">Semua waktu</option></Select>{period !== "all" && <Field label="Tanggal acuan" type="date" value={reference} onChange={e => e.target.value && setReference(e.target.value)}/>}<label className="search-field"><Search size={16}/><input aria-label="Cari trip" placeholder="Cari nama trip" value={search} onChange={e => setSearch(e.target.value)}/></label></div></div>
    <div className="list-caption"><span>{trips.length} perjalanan</span><span>Diurutkan berdasarkan keberangkatan</span></div>
    {months.map(month => <section className="schedule-month" key={month}><div className="month-heading"><h2>{month ? monthLabel(month) : "Belum dijadwalkan"}</h2><span>{trips.filter(t => t.departureDate.slice(0,7) === month).length} trip</span></div>{[...new Set(trips.filter(t => t.departureDate.slice(0,7) === month).map(t => weekKey(t.departureDate)))].map(week => <div className="schedule-week" key={week}><div className="week-heading"><span>{week ? `Minggu ${dateLabel(week)}` : "Lengkapi tanggal melalui detail trip"}</span></div><div className="schedule-trips">{trips.filter(t => t.departureDate.slice(0,7) === month && weekKey(t.departureDate) === week).map(trip => {
      const count = state.participants.filter(p => p.tripId === trip.id && p.status === "active").length;
      const status = tripStatus(trip,state,today);
      return <Link className="schedule-trip" key={trip.id} href={`${basePath}/trips/${trip.id}`}><div className="date-block"><strong>{trip.departureDate ? new Date(trip.departureDate).getUTCDate() : "—"}</strong><span>{trip.departureDate ? new Date(trip.departureDate).toLocaleDateString("id-ID",{weekday:"short"}) : ""}</span></div><div className="schedule-trip-name"><h3>{trip.title}{trip.volume && <small> · {trip.volume}</small>}</h3><p>{dateLabel(trip.departureDate,true)}{trip.location ? ` · ${trip.location}` : ""}</p></div><span className="schedule-participants">{count} peserta</span><span className={`badge ${`status-${status}`}`}>{statusLabel[status]}</span><ArrowRight size={18}/></Link>;
    })}</div></div>)}</section>)}
    {!trips.length && <div className="empty-state"><h3>Tidak ada trip pada periode ini</h3><p>Ubah periode atau impor tautan spreadsheet pendaftaran.</p></div>}
    {importing && <Modal title="Impor spreadsheet" onClose={() => setImporting(false)} wide><SpreadsheetImport/></Modal>}
  </div>;
}
