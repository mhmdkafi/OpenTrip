import { formatRupiah } from "@/lib/money";
import { cashTotals } from "@/lib/workspace/finance-view";
import { paidFor, type Cash, type Workspace } from "@/lib/workspace/types";

export function ExpenseBreakdown({ entries }: { entries: Cash[] }) {
  const expenses = entries.filter(c => c.direction === "out");
  const total = cashTotals(expenses).expense;
  const categories = [...new Set(expenses.map(c => c.category))].map(category => ({ category, amount: expenses.filter(c=>c.category===category).reduce((s,c)=>s+c.amount,0), count: expenses.filter(c=>c.category===category).length })).sort((a,b)=>b.amount-a.amount);
  return <section className="td-panel expense-breakdown">
    <div className="panel-heading"><div><h2>Alokasi pengeluaran</h2><p className="panel-subtitle">{expenses.length} transaksi pada periode terpilih</p></div></div>
    <div className="cf-category-summary"><span>Total pengeluaran</span><strong>{formatRupiah(total)}</strong></div>
    <div className="cf-category-stack" aria-hidden="true">{categories.map((row,index)=><span key={row.category} className={`cf-category-color cf-category-${index%4}`} style={{width:`${row.amount/total*100}%`}}/>)}</div>
    <div className="cf-category-list">{categories.map((row,index)=><div className="category-row" key={row.category}>
      <i className={`cf-category-color cf-category-${index%4}`} aria-hidden="true"/>
      <div><strong>{row.category}</strong><small>{row.count} transaksi</small></div>
      <div><strong>{formatRupiah(row.amount)}</strong><small>{Math.round(row.amount/total*100)}%</small></div>
    </div>)}</div>
    {!categories.length&&<p className="empty-note">Belum ada pengeluaran pada periode ini.</p>}
    <p className="cf-category-note">Proporsi biaya dari total pengeluaran tercatat.</p>
  </section>;
}

export function TripReceivables({ state, tripId }: { state: Workspace; tripId: string }) {
  const people = state.participants.filter(p=>p.tripId===tripId&&p.status==="active");
  const reviewed = people.filter(p=>p.reviewed);
  const charged = reviewed.reduce((s,p)=>s+p.charge,0);
  const paid = reviewed.reduce((s,p)=>s+paidFor(state,p.id),0);
  const outstanding = reviewed.reduce((s,p)=>s+Math.max(0,p.charge-paidFor(state,p.id)),0);
  const due = reviewed.filter(p=>paidFor(state,p.id)<p.charge);
  return <section className="td-panel receivables"><div className="panel-heading"><div><h2>Pembayaran peserta</h2><p className="panel-subtitle">Posisi seluruh perjalanan, tidak dibatasi periode kas.</p></div><span className="badge">{reviewed.filter(p=>paidFor(state,p.id)>=p.charge).length} / {people.length} lunas</span></div><div className="receivable-totals"><div><span>Tagihan ditinjau</span><strong>{formatRupiah(charged)}</strong></div><div><span>Sudah dibayar</span><strong>{formatRupiah(paid)}</strong></div><div><span>Sisa pembayaran</span><strong>{formatRupiah(outstanding)}</strong></div></div>{people.length>reviewed.length&&<p className="inline-warning">{people.length-reviewed.length} tagihan belum ditinjau dan belum dihitung dalam ringkasan ini.</p>}<details className="receivable-list"><summary>{due.length} peserta dengan sisa pembayaran</summary><div className="table-wrap"><table className="td-table"><thead><tr><th>Peserta</th><th>Tagihan</th><th>Dibayar</th><th>Sisa</th></tr></thead><tbody>{due.map(p=><tr key={p.id}><td>{p.name}</td><td>{formatRupiah(p.charge)}</td><td>{formatRupiah(paidFor(state,p.id))}</td><td>{formatRupiah(Math.max(0,p.charge-paidFor(state,p.id)))}</td></tr>)}</tbody></table></div></details></section>;
}
