"use client";

import { useId, useState } from "react";
import { cumulativeProfitComparison, type ProfitPeriod } from "@/lib/workspace/profit-comparison";
import { Dropdown } from "./dropdown";
import type { Cash } from "@/lib/workspace/types";
import { formatRupiah } from "@/lib/money";

const WIDTH = 680, HEIGHT = 252, INSET = 12;
const amount = (value: number | null) => value === null ? "No date" : formatRupiah(value);
const compact = (value: number) => {
  const magnitude = Math.abs(value);
  const unit = magnitude >= 1_000_000 ? 1_000_000 : magnitude >= 1_000 ? 1_000 : 1;
  return `${(value / unit).toLocaleString("en-US", { maximumFractionDigits: 1 })}${unit === 1_000_000 ? "M" : unit === 1_000 ? "K" : ""}`;
};

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1).padStart(2, "0"), label: new Date(Date.UTC(2000, i, 1)).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }) }));

// Picks one compared period: month + year for a monthly chart, year only for a yearly chart.
function PeriodPicker({ value, period, years, tone, onChange }: { value: string; period: ProfitPeriod; years: string[]; tone: "current" | "previous"; onChange: (value: string) => void }) {
  const yearOptions = years.map(year => ({ value: year, label: year }));
  return <span className={`cf-compare-period is-${tone}`}><i aria-hidden="true"/>
    {period === "month" && <Dropdown label={tone === "current" ? "Main month" : "Compared month"} value={value.slice(5, 7)} options={MONTHS} onChange={month => onChange(`${value.slice(0, 4)}-${month}-01`)}/>}
    <Dropdown label={tone === "current" ? "Main year" : "Compared year"} value={value.slice(0, 4)} options={yearOptions} onChange={year => onChange(`${year}-${period === "month" ? value.slice(5, 7) : "01"}-01`)}/>
  </span>;
}

export function CashGraph({ entries, period, reference, compare, years, onReference, onCompare }: { entries: Cash[]; period: ProfitPeriod; reference: string; compare: string; years: string[]; onReference: (date: string) => void; onCompare: (date: string) => void }) {
  const id = useId();
  const { points, currentLabel, previousLabel, hasTransactions } = cumulativeProfitComparison(entries, period, reference, compare);
  const [selected, setSelected] = useState(() => {
    let index = 0;
    points.forEach((point, position) => { if (point.currentChange || point.previousChange) index = position; });
    return index;
  });
  const [hovering, setHovering] = useState(false);
  const point = points[selected] ?? points[0];
  const latest = (key: "current" | "previous") => {
    for (let index = points.length - 1; index >= 0; index--) if (points[index][key] !== null) return points[index][key] ?? 0;
    return 0;
  };
  const currentTotal = latest("current"), previousTotal = latest("previous");
  const values = points.flatMap(point => [point.current ?? 0, point.previous ?? 0]);
  const span = Math.max(1, Math.max(...values) - Math.min(...values));
  const order = 10 ** Math.floor(Math.log10(span / 3));
  const tickStep = [1, 2, 5, 10].map(factor => factor * order).find(step => span / step <= 4) ?? 10 * order;
  const minimum = Math.floor(Math.min(0, ...values) / tickStep) * tickStep;
  const maximum = Math.max(tickStep, Math.ceil(Math.max(0, ...values) / tickStep) * tickStep);
  const ticks = Array.from({ length: Math.round((maximum - minimum) / tickStep) + 1 }, (_, index) => minimum + index * tickStep);
  const x = (index: number) => INSET + index / (points.length - 1) * (WIDTH - INSET * 2);
  const y = (value: number) => INSET + (maximum - value) / (maximum - minimum) * (HEIGHT - INSET * 2);
  const line = (key: "current" | "previous") => {
    let connected = false;
    return points.map((item, index) => {
      if (item[key] === null) { connected = false; return ""; }
      const command = connected ? "L" : "M";
      connected = true;
      return `${command}${x(index)},${y(item[key])}`;
    }).join(" ");
  };
  const selectAt = (clientX: number, width: number, left: number) => {
    if (!width) return;
    const index = Math.round(((clientX - left) / width * WIDTH - INSET) / (WIDTH - INSET * 2) * (points.length - 1));
    setSelected(Math.max(0, Math.min(points.length - 1, index)));
  };

  return <section className="cash-graph cf-graph" aria-labelledby={`${id}-title`}>
    <header className="cf-panel-heading cf-profit-heading">
      <div><h2 id={`${id}-title`}>Net profit trend</h2></div>
      <div className="cf-compare" role="group" aria-label="Compared periods"><PeriodPicker value={reference} period={period} years={years} tone="current" onChange={onReference}/><span className="cf-compare-vs">vs</span><PeriodPicker value={compare} period={period} years={years} tone="previous" onChange={onCompare}/></div>
    </header>
    {hasTransactions ? <>
      <div className="cf-profit-plot">
        <span className="cf-axis-title cf-axis-y" aria-hidden="true">Cumulative net profit (Rp)</span>
        <div className="cf-profit-yaxis" aria-hidden="true">{ticks.map(tick => <span key={tick} style={{ top: `${y(tick) / HEIGHT * 100}%` }}>{compact(tick)}</span>)}</div>
        <div className="cf-profit-canvas">
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" role="img" aria-label={`Cumulative net profit chart for ${currentLabel} and ${previousLabel}. Hover the chart to see the values for each point.`}
            onPointerMove={event => { if (event.pointerType === "mouse") { const box = event.currentTarget.getBoundingClientRect(); selectAt(event.clientX, box.width, box.left); setHovering(true); } }}
            onPointerLeave={event => { if (event.pointerType === "mouse") setHovering(false); }}
            onClick={event => { const box = event.currentTarget.getBoundingClientRect(); selectAt(event.clientX, box.width, box.left); setHovering(true); }}>
            {ticks.map(tick => <line key={tick} className={tick === 0 ? "cf-profit-zero" : "cf-profit-grid"} x1={INSET} x2={WIDTH - INSET} y1={y(tick)} y2={y(tick)}/>)}
            {hovering && <line className="cf-profit-cursor" x1={x(selected)} x2={x(selected)} y1={INSET} y2={HEIGHT - INSET}/>}
            <path className="cf-profit-line is-previous" d={line("previous")}/>
            <path className="cf-profit-line is-current" d={line("current")}/>
            {hovering && (["previous", "current"] as const).map(key => point[key] !== null && <circle key={key} className={`cf-profit-dot is-${key}`} cx={x(selected)} cy={y(point[key])} r={5}/>)}
          </svg>
          {hovering && (() => {
            const left = x(selected) / WIDTH * 100;
            const top = Math.min(...(["current", "previous"] as const).map(key => point[key] === null ? HEIGHT : y(point[key]!))) / HEIGHT * 100;
            const side = left > 70 ? "is-left" : left < 30 ? "is-right" : "";
            return <div className={`cf-profit-tooltip ${side}`} style={{ left: `${left}%`, top: `${top}%` }} aria-live="polite" aria-atomic="true">
              <span className="cf-tooltip-label">{period === "month" ? `Date ${point.label}` : point.label}</span>
              <span className="is-current"><i/>{currentLabel}<strong>{amount(point.current)}</strong></span>
              <span className="is-previous"><i/>{previousLabel}<strong>{amount(point.previous)}</strong></span>
            </div>;
          })()}
          <div className="cf-profit-xaxis" aria-hidden="true">{points.map((item, index) => {
            const visible = period === "year" ? index % 2 === 0 || index === 11 : index === 0 || (index + 1) % 5 === 0 && index < points.length - 3 || index === points.length - 1;
            return visible && <span key={index} style={{ left: `${x(index) / WIDTH * 100}%` }}>{item.label}</span>;
          })}</div>
          <span className="cf-axis-title cf-axis-x" aria-hidden="true">{period === "year" ? "Month" : "Date"}</span>
        </div>
      </div>
    </> : <p className="cf-chart-empty">No transactions in either period yet.</p>}
    <div className="cf-profit-periods" aria-label="Final result of both periods">
      <div className="is-current"><span><i/>{currentLabel}</span><strong>{formatRupiah(currentTotal)}</strong></div>
      <div className="is-previous"><span><i/>{previousLabel}</span><strong>{formatRupiah(previousTotal)}</strong></div>
    </div>
  </section>;
}
