import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import { formatRupiah } from "@/lib/money";
import { cashTotals, previousReference, profitChange } from "@/lib/workspace/finance-view";
import { dateLabel, monthLabel, weekKey } from "@/lib/workspace/presentation";
import type { Cash } from "@/lib/workspace/types";
import { Field } from "./ui";

export function FinancePeriod({ period, reference, onChange }: { period: string; reference: string; onChange: (period: string, reference: string) => void }) {
  const title = period === "year" ? reference.slice(0,4) : period === "week" ? `Minggu ${dateLabel(weekKey(reference))}` : monthLabel(reference);
  function next() {
    const date = new Date(`${reference}T12:00:00Z`);
    if (period === "week") date.setUTCDate(date.getUTCDate()+7);
    else if (period === "year") date.setUTCFullYear(date.getUTCFullYear()+1,0,1);
    else { date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth()+1); }
    onChange(period,date.toISOString().slice(0,10));
  }
  return <div className="cf-period finance-period-bar">
    <div className="cf-period-title"><span>Periode laporan</span><div><h2>{title}</h2><button aria-label="Periode sebelumnya" onClick={()=>onChange(period,previousReference(period,reference))}><ChevronLeft size={17}/></button><button aria-label="Periode berikutnya" onClick={next}><ChevronRight size={17}/></button></div></div>
    <div className="cf-period-inputs"><div className="status-tabs" role="group" aria-label="Periode cashflow">{[["month","Bulanan"],["week","Mingguan"],["year","Tahunan"]].map(([value,label])=><button key={value} aria-pressed={period===value} className={period===value?"active":""} onClick={()=>onChange(value,reference)}>{label}</button>)}</div><Field label="Tanggal acuan (WIB)" type="date" value={reference} onChange={e=>{if(e.target.value)onChange(period,e.target.value);}}/></div>
  </div>;
}

export function FinanceSummary({ entries, previous, period }: { entries: Cash[]; previous?: Cash[]; period: string }) {
  const totals = cashTotals(entries), prior = previous ? cashTotals(previous) : null;
  const change = prior ? profitChange(totals.net,prior.net) : null;
  const comparison = period === "week" ? "minggu" : period === "year" ? "tahun" : "bulan";
  return <div className="cf-metrics">
    <section className="cf-metric cf-metric-net"><div className="cf-metric-label"><span>Profit bersih</span><Wallet size={18}/></div><strong>{formatRupiah(totals.net)}</strong><p>Kas masuk − pengeluaran</p>{prior && <div className="cf-comparison">{change===null ? <span>Periode sebelumnya {formatRupiah(prior.net)} · persentase belum tersedia</span> : <><b>{change>=0?"+":""}{change.toLocaleString("id-ID",{maximumFractionDigits:1})}%</b><span>dari {comparison} sebelumnya</span></>}</div>}</section>
    <section className="cf-metric"><div className="cf-metric-label"><span>Pemasukan</span><ArrowDownLeft size={18}/></div><strong className="cf-income">{formatRupiah(totals.income)}</strong><p>{entries.filter(c=>c.direction==="in").length} transaksi pembayaran</p><small>Pembayaran peserta terverifikasi</small></section>
    <section className="cf-metric"><div className="cf-metric-label"><span>Pengeluaran</span><ArrowUpRight size={18}/></div><strong>{formatRupiah(totals.expense)}</strong><p>{entries.filter(c=>c.direction==="out").length} transaksi pengeluaran</p><small>Biaya operasional yang tercatat</small></section>
  </div>;
}
