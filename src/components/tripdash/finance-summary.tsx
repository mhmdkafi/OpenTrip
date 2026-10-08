import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import { formatRupiah } from "@/lib/money";
import { cashTotals, previousReference, profitChange } from "@/lib/workspace/finance-view";
import { dateLabel, monthLabel, weekKey } from "@/lib/workspace/presentation";
import type { Cash } from "@/lib/workspace/types";
import { Field } from "./ui";

export function FinancePeriod({ period, reference, onChange }: { period: string; reference: string; onChange: (period: string, reference: string) => void }) {
  const title = period === "year" ? reference.slice(0,4) : period === "week" ? `Week of ${dateLabel(weekKey(reference))}` : monthLabel(reference);
  function next() {
    const date = new Date(`${reference}T12:00:00Z`);
    if (period === "week") date.setUTCDate(date.getUTCDate()+7);
    else if (period === "year") date.setUTCFullYear(date.getUTCFullYear()+1,0,1);
    else { date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth()+1); }
    onChange(period,date.toISOString().slice(0,10));
  }
  return <div className="cf-period finance-period-bar">
    <div className="cf-period-title"><span>Report period</span><div><h2>{title}</h2><button aria-label="Previous period" onClick={()=>onChange(period,previousReference(period,reference))}><ChevronLeft size={17}/></button><button aria-label="Next period" onClick={next}><ChevronRight size={17}/></button></div></div>
    <div className="cf-period-inputs"><div className="status-tabs" role="group" aria-label="Cashflow period">{[["month","Monthly"],["week","Weekly"],["year","Yearly"]].map(([value,label])=><button key={value} aria-pressed={period===value} className={period===value?"active":""} onClick={()=>onChange(value,reference)}>{label}</button>)}</div><Field label="Reference date (WIB)" type="date" value={reference} onChange={e=>{if(e.target.value)onChange(period,e.target.value);}}/></div>
  </div>;
}

export function FinanceSummary({ entries, previous, period }: { entries: Cash[]; previous?: Cash[]; period: string }) {
  const totals = cashTotals(entries), prior = previous ? cashTotals(previous) : null;
  const change = prior ? profitChange(totals.net,prior.net) : null;
  const comparison = period === "week" ? "week" : period === "year" ? "year" : "month";
  return <div className="cf-metrics">
    <section className="cf-metric cf-metric-net"><div className="cf-metric-label"><span>Net profit</span><Wallet size={18}/></div><strong>{formatRupiah(totals.net)}</strong><p>Cash in − expenses</p>{prior && <div className="cf-comparison">{change===null ? <span>Previous period {formatRupiah(prior.net)} · percentage not available</span> : <><b>{change>=0?"+":""}{change.toLocaleString("en-US",{maximumFractionDigits:1})}%</b><span>vs previous {comparison}</span></>}</div>}</section>
    <section className="cf-metric"><div className="cf-metric-label"><span>Income</span><ArrowDownLeft size={18}/></div><strong className="cf-income">{formatRupiah(totals.income)}</strong><p>{entries.filter(c=>c.direction==="in").length} payment transactions</p><small>Verified participant payments</small></section>
    <section className="cf-metric"><div className="cf-metric-label"><span>Expenses</span><ArrowUpRight size={18}/></div><strong>{formatRupiah(totals.expense)}</strong><p>{entries.filter(c=>c.direction==="out").length} expense transactions</p><small>Recorded operating costs</small></section>
  </div>;
}
