import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { formatRupiah } from "@/lib/money";
import { cashTotals, profitChange } from "@/lib/workspace/finance-view";
import type { Cash } from "@/lib/workspace/types";
import { Dropdown } from "./dropdown";

const PERIOD_OPTIONS = [{ value: "month", label: "Monthly" }, { value: "year", label: "Yearly" }];
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1).padStart(2, "0"), label: new Date(Date.UTC(2000, i, 1)).toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" }) }));

export function FinancePeriod({ period, reference, years, onChange }: { period: string; reference: string; years: string[]; onChange: (period: string, reference: string) => void }) {
  const month = reference.slice(0, 7), year = reference.slice(0, 4);
  return <div className="cf-period-picker" role="group" aria-label="Report period">
    <div className="ov-toolbar" role="group" aria-label="View">{PERIOD_OPTIONS.map(option => <button key={option.value} aria-pressed={period === option.value} className={period === option.value ? "is-active" : ""} onClick={() => onChange(option.value, `${month}-01`)}>{option.label}</button>)}</div>
    {period !== "year" && <Dropdown label="Month" value={reference.slice(5, 7)} options={MONTH_OPTIONS} onChange={value => onChange(period, `${year}-${value}-01`)}/>}
    <Dropdown label="Year" value={year} options={years.map(value => ({ value, label: value }))} onChange={value => onChange(period, `${value}-${period === "year" ? "01" : reference.slice(5, 7)}-01`)}/>
  </div>;
}

export function FinanceSummary({ entries, previous, period, compareLabel }: { entries: Cash[]; previous?: Cash[]; period: string; compareLabel?: string }) {
  const totals = cashTotals(entries), prior = previous ? cashTotals(previous) : null;
  const change = prior ? profitChange(totals.net,prior.net) : null;
  const comparison = period === "year" ? "year" : "month";
  return <div className="cf-metrics">
    <section className="cf-metric cf-metric-net"><div className="cf-metric-label"><span>Net profit</span><Wallet size={18}/></div><strong>{formatRupiah(totals.net)}</strong>{prior && <div className={`cf-comparison ${change !== null && change < 0 ? "is-down" : "is-up"}`}>{change===null ? <span>{compareLabel ?? "Previous period"} {formatRupiah(prior.net)} · percentage not available</span> : <><b>{change>=0?"+":""}{change.toLocaleString("en-US",{maximumFractionDigits:1})}%</b><span>vs {compareLabel ?? `previous ${comparison}`}</span></>}</div>}</section>
    <section className="cf-metric"><div className="cf-metric-label"><span>Income</span><ArrowDownLeft size={18}/></div><strong className="cf-income">{formatRupiah(totals.income)}</strong></section>
    <section className="cf-metric"><div className="cf-metric-label"><span>Expenses</span><ArrowUpRight size={18}/></div><strong>{formatRupiah(totals.expense)}</strong></section>
  </div>;
}
