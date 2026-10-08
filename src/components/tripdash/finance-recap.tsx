import { ArrowUpRight, ChevronDown, MapPin } from "lucide-react";
import { formatRupiah } from "@/lib/money";
import { cashDate, cashTotals } from "@/lib/workspace/finance-view";
import { dateLabel, monthLabel, weekKey } from "@/lib/workspace/presentation";
import type { Cash, Trip } from "@/lib/workspace/types";

// Week N of a month: week 1 is the Monday-start week holding the 1st.
const weekOfMonth = (date: string) => Math.floor((Number(date.slice(8, 10)) + (new Date(`${date.slice(0, 7)}-01T12:00:00Z`).getUTCDay() + 6) % 7 - 1) / 7) + 1;

export function FinanceRecap({ entries, trips, period, reference, onOpen }: { entries: Cash[]; trips: Trip[]; period: string; reference: string; onOpen: (id: string, week?: string) => void }) {
  const scheduled = trips.filter(t=>t.departureDate&&(period==="year"?t.departureDate.startsWith(reference.slice(0,4)):period==="week"?weekKey(t.departureDate)===weekKey(reference):t.departureDate.startsWith(reference.slice(0,7))));
  const months = [...new Set([...entries.map(c=>cashDate(c).slice(0,7)),...scheduled.map(t=>t.departureDate.slice(0,7))])].sort();
  return <section className="cf-panel cf-recap cash-periods">
    <header className="cf-panel-heading"><div><h2>Finances by trip</h2></div>{months.length === 1 && <div className="cf-recap-period"><span>{monthLabel(months[0])}</span><small>{entries.filter(c=>cashDate(c).startsWith(months[0])).length} transactions</small></div>}</header>
    {months.map(month=>{
      const monthly=entries.filter(c=>cashDate(c).startsWith(month));
      const weeks=[...new Set([...monthly.map(c=>weekKey(cashDate(c))),...scheduled.filter(t=>t.departureDate.startsWith(month)).map(t=>weekKey(t.departureDate))])].sort();
      const weekRows=weeks.map(week=>{
        const rows=monthly.filter(c=>weekKey(cashDate(c))===week);
        const ids=[...new Set([...rows.map(c=>c.tripId),...scheduled.filter(t=>t.departureDate.startsWith(month)&&weekKey(t.departureDate)===week).map(t=>t.id)])];
        return <details className="cash-week" key={week}><summary><ChevronDown size={16}/><span>Week {weekOfMonth(week < `${month}-01` ? `${month}-01` : week)}</span><small>{ids.length} {ids.length === 1 ? "trip" : "trips"} / week</small><strong className={cashTotals(rows).net < 0 ? "is-negative" : "is-positive"}>{formatRupiah(cashTotals(rows).net)}</strong></summary><div className="cf-recap-labels" aria-hidden="true"><span>Trip</span><span>In</span><span>Out</span><span>Net</span><span/></div>{ids.map(id=>{
          const amounts=cashTotals(rows.filter(c=>c.tripId===id)), trip=trips.find(t=>t.id===id);
          return <button className="cash-trip" key={id||"general"} onClick={()=>onOpen(id,week)}><span className="cf-trip-name"><i><MapPin size={17}/></i><span><strong>{trip?.title??"General business"}</strong><small>{rows.filter(c=>c.tripId===id).length} transactions{trip?.departureDate?` · ${dateLabel(trip.departureDate)}`:""}</small></span></span><span className="cf-trip-amount cf-income"><small>In</small>{formatRupiah(amounts.income)}</span><span className="cf-trip-amount cf-expense"><small>Out</small>{formatRupiah(amounts.expense)}</span><span className={`cf-trip-amount cf-trip-net ${amounts.net < 0 ? "is-negative" : "is-positive"}`}><small>Net</small>{formatRupiah(amounts.net)}</span><ArrowUpRight size={17}/></button>;
        })}</details>;
      });
      // In a yearly view each month starts collapsed; its weeks appear once the month is opened.
      if (months.length === 1) return <div className="cf-month" key={month}>{weekRows}</div>;
      const net=cashTotals(monthly).net;
      return <details className="cf-month cf-month-toggle" key={month}><summary className="cf-month-heading"><ChevronDown size={16}/><h3>{monthLabel(month)}</h3><span>{monthly.length} transactions</span><strong className={net < 0 ? "is-negative" : "is-positive"}>{formatRupiah(net)}</strong></summary>{weekRows}</details>;
    })}
    {!months.length&&<div className="cf-empty"><MapPin size={26}/><h3>No activity in this period yet</h3><p>Pick another period or open a trip to record expenses.</p></div>}
  </section>;
}
