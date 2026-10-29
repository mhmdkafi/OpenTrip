import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { formatRupiah } from "@/lib/money";
import { cashTotals, profitChange } from "@/lib/workspace/finance-view";
import type { Cash } from "@/lib/workspace/types";
import { todayWib } from "@/lib/workspace/presentation";
import { PeriodStepper } from "./period-stepper";

const PERIOD_OPTIONS = [{ value: "month", label: "Monthly" }, { value: "year", label: "Yearly" }];

export function FinancePeriod({ period, reference, onChange }: { period: string; reference: string; onChange: (period: string, reference: string) => void }) {
  return <div className="cf-period-picker" role="group" aria-label="Report period">
    <PeriodStepper mode={period === "year" ? "year" : "month"} value={reference} today={todayWib()} label="Report period" onChange={date => onChange(period, date)}/>
    <div className="ov-toolbar" role="group" aria-label="View">{PERIOD_OPTIONS.map(option => <button key={option.value} aria-pressed={period === option.value} className={period === option.value ? "is-active" : ""} onClick={() => onChange(option.value, `${reference.slice(0, 7)}-01`)}>{option.label}</button>)}</div>
  </div>;
}

// "+12% vs Sep 2026" for any figure that has a compared value.
function Change({ now, before, label, invert = false }: { now: number; before: number; label: string; invert?: boolean }) {
  const change = profitChange(now, before);
  if (change === null) return <div className="cf-comparison is-flat"><span>{label} {formatRupiah(before)}</span></div>;
  const good = invert ? change <= 0 : change >= 0;
  return <div className={`cf-comparison ${good ? "is-up" : "is-down"}`}><b>{change >= 0 ? "+" : ""}{change.toLocaleString("en-US", { maximumFractionDigits: 1 })}%</b><span>vs {label}</span></div>;
}

export function FinanceSummary({ entries, previous, period, compareLabel }: { entries: Cash[]; previous?: Cash[]; period: string; compareLabel?: string }) {
  const totals = cashTotals(entries), prior = previous ? cashTotals(previous) : null;
  const label = compareLabel ?? `previous ${period === "year" ? "year" : "month"}`;
  return <div className="cf-metrics">
    <section className="cf-metric cf-metric-net"><div className="cf-metric-label"><span>Net profit</span><Wallet size={18}/></div><strong className={totals.net < 0 ? "is-negative" : ""}>{formatRupiah(totals.net)}</strong>{prior && <Change now={totals.net} before={prior.net} label={label}/>}</section>
    <section className="cf-metric"><div className="cf-metric-label"><span>Income</span><ArrowDownLeft size={18}/></div><strong className="cf-income">{formatRupiah(totals.income)}</strong>{prior && <Change now={totals.income} before={prior.income} label={label}/>}</section>
    <section className="cf-metric"><div className="cf-metric-label"><span>Expenses</span><ArrowUpRight size={18}/></div><strong>{formatRupiah(totals.expense)}</strong>{prior && <Change now={totals.expense} before={prior.expense} label={label} invert/>}</section>
  </div>;
}
