import { ArrowUpRight, ChevronDown, MapPin } from "lucide-react";
import { formatRupiah } from "@/lib/money";
import { cashDate, cashTotals } from "@/lib/workspace/finance-view";
import { dateLabel, monthLabel, weekKey } from "@/lib/workspace/presentation";
import type { Cash, Trip } from "@/lib/workspace/types";
import { Select } from "./ui";

export function FinanceRecap({ entries, trips, period, reference, onOpen }: { entries: Cash[]; trips: Trip[]; period: string; reference: string; onOpen: (id: string, week?: string) => void }) {
  const scheduled = trips.filter(t=>t.departureDate&&(period==="year"?t.departureDate.startsWith(reference.slice(0,4)):period==="week"?weekKey(t.departureDate)===weekKey(reference):t.departureDate.startsWith(reference.slice(0,7))));
  const months = [...new Set([...entries.map(c=>cashDate(c).slice(0,7)),...scheduled.map(t=>t.departureDate.slice(0,7))])].sort();
  return <section className="cf-panel cf-recap cash-periods">
    <header className="cf-panel-heading"><div><h2>Keuangan per perjalanan</h2><p>Telusuri transaksi berdasarkan bulan dan minggu.</p></div><Select label="Buka detail trip" value="" onChange={id=>{if(id)onOpen(id==="general"?"":id);}}><option value="">Pilih perjalanan</option><option value="general">Umum bisnis</option>{trips.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</Select></header>
    {months.map(month=>{
      const monthly=entries.filter(c=>cashDate(c).startsWith(month));
      const weeks=[...new Set([...monthly.map(c=>weekKey(cashDate(c))),...scheduled.filter(t=>t.departureDate.startsWith(month)).map(t=>weekKey(t.departureDate))])].sort();
      return <div className="cf-month" key={month}><div className="cf-month-heading"><h3>{monthLabel(month)}</h3><span>{monthly.length} transaksi</span></div>{weeks.map(week=>{
        const rows=monthly.filter(c=>weekKey(cashDate(c))===week);
        const ids=[...new Set([...rows.map(c=>c.tripId),...scheduled.filter(t=>t.departureDate.startsWith(month)&&weekKey(t.departureDate)===week).map(t=>t.id)])];
        return <details className="cash-week" key={week}><summary><ChevronDown size={16}/><span>Minggu {dateLabel(week)}</span><small>{ids.length} perjalanan / pos</small><strong>{formatRupiah(cashTotals(rows).net)}</strong></summary><div className="cf-recap-labels" aria-hidden="true"><span>Perjalanan</span><span>Masuk</span><span>Keluar</span><span>Bersih</span><span/></div>{ids.map(id=>{
          const amounts=cashTotals(rows.filter(c=>c.tripId===id)), trip=trips.find(t=>t.id===id);
          return <button className="cash-trip" key={id||"general"} onClick={()=>onOpen(id,week)}><span className="cf-trip-name"><i><MapPin size={17}/></i><span><strong>{trip?.title??"Umum bisnis"}</strong><small>{rows.filter(c=>c.tripId===id).length} transaksi{trip?.departureDate?` · ${dateLabel(trip.departureDate)}`:""}</small></span></span><span className="cf-trip-amount cf-income"><small>Masuk</small>{formatRupiah(amounts.income)}</span><span className="cf-trip-amount"><small>Keluar</small>{formatRupiah(amounts.expense)}</span><span className="cf-trip-amount cf-trip-net"><small>Bersih</small>{formatRupiah(amounts.net)}</span><ArrowUpRight size={17}/></button>;
        })}</details>;
      })}</div>;
    })}
    {!months.length&&<div className="cf-empty"><MapPin size={26}/><h3>Belum ada aktivitas pada periode ini</h3><p>Pilih periode lain atau buka perjalanan untuk mencatat pengeluaran.</p></div>}
  </section>;
}
