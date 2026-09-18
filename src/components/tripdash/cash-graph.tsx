"use client";

import { useId, useState } from "react";
import { cumulativeProfitComparison, type ProfitPeriod } from "@/lib/workspace/profit-comparison";
import type { Cash } from "@/lib/workspace/types";
import { formatRupiah } from "@/lib/money";

const WIDTH = 680, HEIGHT = 252, INSET = 12;
const amount = (value: number | null) => value === null ? "Tidak ada tanggal" : formatRupiah(value);
const compact = (value: number) => {
  const magnitude = Math.abs(value);
  const unit = magnitude >= 1_000_000 ? 1_000_000 : magnitude >= 1_000 ? 1_000 : 1;
  return `${(value / unit).toLocaleString("id-ID", { maximumFractionDigits: 1 })}${unit === 1_000_000 ? " jt" : unit === 1_000 ? " rb" : ""}`;
};

export function CashGraph({ entries, period, reference }: { entries: Cash[]; period: ProfitPeriod; reference: string }) {
  const id = useId();
  const { points, currentLabel, previousLabel, hasTransactions } = cumulativeProfitComparison(entries, period, reference);
  const [selected, setSelected] = useState(() => {
    let index = 0;
    points.forEach((point, position) => { if (point.currentChange || point.previousChange) index = position; });
    return index;
  });
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
  const unit = period === "month" ? "tanggal" : "bulan";

  return <section className="cash-graph cf-graph" aria-labelledby={`${id}-title`}>
    <header className="cf-panel-heading cf-profit-heading">
      <div><span className="cf-profit-eyebrow">PERBANDINGAN PERIODE</span><h2 id={`${id}-title`}>Perkembangan profit bersih</h2><p>Akumulasi pemasukan dikurangi pengeluaran.</p></div>
    </header>
    <div className="cf-profit-periods" aria-label="Hasil akhir kedua periode">
      <div className="is-current"><span><i/>{currentLabel}</span><strong>{formatRupiah(currentTotal)}</strong></div>
      <div className="is-previous"><span><i/>{previousLabel}</span><strong>{formatRupiah(previousTotal)}</strong></div>
    </div>
    <p className="cf-profit-delta">{currentTotal === previousTotal ? "Hasil kedua periode sama" : `${currentTotal > previousTotal ? "Naik" : "Turun"} ${formatRupiah(Math.abs(currentTotal - previousTotal))} dari periode sebelumnya`}</p>
    {hasTransactions ? <>
      <div className="cf-profit-plot">
        <div className="cf-profit-yaxis" aria-hidden="true">{ticks.map(tick => <span key={tick} style={{ top: `${y(tick) / HEIGHT * 100}%` }}>{compact(tick)}</span>)}</div>
        <div className="cf-profit-canvas">
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" role="img" aria-label={`Grafik akumulasi profit bersih ${currentLabel} dan ${previousLabel}. Angka lengkap ada dalam tabel di bawah.`}
            onPointerMove={event => { if (event.pointerType === "mouse") { const box = event.currentTarget.getBoundingClientRect(); selectAt(event.clientX, box.width, box.left); } }}
            onClick={event => { const box = event.currentTarget.getBoundingClientRect(); selectAt(event.clientX, box.width, box.left); }}>
            {ticks.map(tick => <line key={tick} className={tick === 0 ? "cf-profit-zero" : "cf-profit-grid"} x1={INSET} x2={WIDTH - INSET} y1={y(tick)} y2={y(tick)}/>)}
            <line className="cf-profit-cursor" x1={x(selected)} x2={x(selected)} y1={INSET} y2={HEIGHT - INSET}/>
            <path className="cf-profit-line is-previous" d={line("previous")}/>
            <path className="cf-profit-line is-current" d={line("current")}/>
            {(["previous", "current"] as const).map(key => point[key] !== null && <circle key={key} className={`cf-profit-dot is-${key}`} cx={x(selected)} cy={y(point[key])} r={5}/>)}
          </svg>
          <div className="cf-profit-xaxis" aria-hidden="true">{points.map((item, index) => {
            const visible = period === "year" ? index % 2 === 0 || index === 11 : index === 0 || (index + 1) % 5 === 0 && index < points.length - 3 || index === points.length - 1;
            return visible && <span key={index} style={{ left: `${x(index) / WIDTH * 100}%` }}>{item.label}</span>;
          })}</div>
        </div>
      </div>
      <div className="cf-profit-detail" aria-live="polite" aria-atomic="true">
        <label htmlFor={`${id}-point`}>Lihat {unit}</label>
        <select id={`${id}-point`} value={selected} onChange={event => setSelected(Number(event.target.value))}>
          {points.map((item, index) => <option key={index} value={index}>{period === "month" ? `Tanggal ${item.label}` : item.label}</option>)}
        </select>
        <div><span>{currentLabel}</span><strong>{amount(point.current)}</strong></div>
        <div><span>{previousLabel}</span><strong>{amount(point.previous)}</strong></div>
      </div>
    </> : <p className="cf-chart-empty">Belum ada transaksi pada kedua periode ini.</p>}
    <details className="graph-data"><summary>Lihat angka per {period === "year" ? "bulan" : "tanggal"}</summary>
      <div className="table-wrap"><table className="td-table"><caption className="sr-only">Akumulasi profit bersih {currentLabel} dan {previousLabel}</caption>
        <thead><tr><th>{period === "year" ? "Bulan" : "Tanggal"}</th><th>{currentLabel}</th><th>{previousLabel}</th><th>Selisih</th></tr></thead>
        <tbody>{points.map(item => <tr key={item.label}><td>{item.label}</td><td>{amount(item.current)}</td><td>{amount(item.previous)}</td><td>{item.current !== null && item.previous !== null ? formatRupiah(item.current - item.previous) : "—"}</td></tr>)}</tbody>
      </table></div>
    </details>
  </section>;
}
