"use client";

import { useId, useState } from "react";
import { cumulativeProfitComparison, type ProfitPeriod } from "@/lib/workspace/profit-comparison";
import { Plus, X } from "lucide-react";
import { previousReference } from "@/lib/workspace/finance-view";
import { PeriodStepper } from "./period-stepper";
import type { Cash } from "@/lib/workspace/types";
import { formatRupiah } from "@/lib/money";

const WIDTH = 680, HEIGHT = 252, INSET = 12;
const amount = (value: number | null) => value === null ? "No date" : formatRupiah(value);
const compact = (value: number) => {
  const magnitude = Math.abs(value);
  const unit = magnitude >= 1_000_000 ? 1_000_000 : magnitude >= 1_000 ? 1_000 : 1;
  return `${(value / unit).toLocaleString("en-US", { maximumFractionDigits: 1 })}${unit === 1_000_000 ? "M" : unit === 1_000 ? "K" : ""}`;
};

// One line by default; "+ Compare" adds a second period. The main period stays in sync with the page header.
export function CashGraph({ entries, period, reference, compare, today, onReference, onCompare, onRemoveCompare }: { entries: Cash[]; period: ProfitPeriod; reference: string; compare: string | null; today: string; onReference: (date: string) => void; onCompare: (date: string) => void; onRemoveCompare: () => void }) {
  const id = useId();
  const comparing = compare !== null;
  // "+ Compare" first asks which period; the second line appears once one is picked.
  const [choosing, setChoosing] = useState(false);
  const { points, currentLabel, previousLabel, hasTransactions } = cumulativeProfitComparison(entries, period, reference, compare ?? previousReference(period, reference));
  const keys = comparing ? ["previous", "current"] as const : ["current"] as const;
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
  const values = points.flatMap(point => keys.map(key => point[key] ?? 0));
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
      <div className="cf-compare" role="group" aria-label="Compared period">
        <span className="cf-compare-item">{(comparing || choosing) && <span className="cf-compare-key is-current"><i aria-hidden="true"/></span>}
        <PeriodStepper size="sm" mode={period} value={reference} today={today} label="Main period" showToday={false} onChange={onReference}/></span>
        {comparing || choosing ? <>
          <span className="cf-compare-vs">vs</span>
          <span className="cf-compare-item"><span className="cf-compare-key is-previous"><i aria-hidden="true"/></span>
          <PeriodStepper size="sm" mode={period} value={compare} today={today} label="Compared period" showToday={false} placeholder={period === "year" ? "Choose year" : "Choose month"} onChange={date => { setChoosing(false); onCompare(date); }} onDismiss={() => setChoosing(false)}/>
          <button type="button" className="cf-compare-remove" aria-label="Remove comparison" title="Remove comparison" onClick={() => { setChoosing(false); onRemoveCompare(); }}><X size={16}/></button></span>
        </> : <button type="button" className="cf-compare-add" onClick={() => setChoosing(true)}><Plus size={15}/> Compare</button>}
      </div>
    </header>
    {hasTransactions ? <>
      <div className="cf-profit-plot">
        <span className="cf-axis-title cf-axis-y" aria-hidden="true">Cumulative net profit (Rp)</span>
        <div className="cf-profit-yaxis" aria-hidden="true">{ticks.map(tick => <span key={tick} style={{ top: `${y(tick) / HEIGHT * 100}%` }}>{compact(tick)}</span>)}</div>
        <div className="cf-profit-canvas">
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" role="img" aria-label={`Cumulative net profit chart for ${currentLabel}${comparing ? ` and ${previousLabel}` : ""}. Hover the chart to see the values for each point.`}
            onPointerMove={event => { if (event.pointerType === "mouse") { const box = event.currentTarget.getBoundingClientRect(); selectAt(event.clientX, box.width, box.left); setHovering(true); } }}
            onPointerLeave={event => { if (event.pointerType === "mouse") setHovering(false); }}
            onClick={event => { const box = event.currentTarget.getBoundingClientRect(); selectAt(event.clientX, box.width, box.left); setHovering(true); }}>
            {ticks.map(tick => <line key={tick} className={tick === 0 ? "cf-profit-zero" : "cf-profit-grid"} x1={INSET} x2={WIDTH - INSET} y1={y(tick)} y2={y(tick)}/>)}
            {hovering && <line className="cf-profit-cursor" x1={x(selected)} x2={x(selected)} y1={INSET} y2={HEIGHT - INSET}/>}
            {comparing && <path className="cf-profit-line is-previous" d={line("previous")}/>}
            <path className="cf-profit-line is-current" d={line("current")}/>
            {hovering && keys.map(key => point[key] !== null && <circle key={key} className={`cf-profit-dot is-${key}`} cx={x(selected)} cy={y(point[key])} r={5}/>)}
          </svg>
          {hovering && (() => {
            const left = x(selected) / WIDTH * 100;
            const top = Math.min(...keys.map(key => point[key] === null ? HEIGHT : y(point[key]!))) / HEIGHT * 100;
            const side = left > 70 ? "is-left" : left < 30 ? "is-right" : "";
            return <div className={`cf-profit-tooltip ${side}`} style={{ left: `${left}%`, top: `${top}%` }} aria-live="polite" aria-atomic="true">
              <span className="cf-tooltip-label">{period === "month" ? `Date ${point.label}` : point.label}</span>
              <span className="is-current"><i/>{currentLabel}<strong>{amount(point.current)}</strong></span>
              {comparing && <span className="is-previous"><i/>{previousLabel}<strong>{amount(point.previous)}</strong></span>}
            </div>;
          })()}
          <div className="cf-profit-xaxis" aria-hidden="true">{points.map((item, index) => {
            const visible = period === "year" ? index % 2 === 0 || index === 11 : index === 0 || (index + 1) % 5 === 0 && index < points.length - 3 || index === points.length - 1;
            return visible && <span key={index} style={{ left: `${x(index) / WIDTH * 100}%` }}>{item.label}</span>;
          })}</div>
          <span className="cf-axis-title cf-axis-x" aria-hidden="true">{period === "year" ? "Month" : "Date"}</span>
        </div>
      </div>
    </> : <p className="cf-chart-empty">{comparing ? "No transactions in either period yet." : "No transactions in this period yet."}</p>}
    {comparing && <div className="cf-profit-periods" aria-label="Final result of both periods">
      <div className="is-current"><span><i/>{currentLabel}</span><strong>{formatRupiah(currentTotal)}</strong></div>
      {comparing && <div className="is-previous"><span><i/>{previousLabel}</span><strong>{formatRupiah(previousTotal)}</strong></div>}
    </div>}
  </section>;
}
