"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { formatRupiah } from "@/lib/money";
import { cashDate, cashTotals, filterPeriod, previousReference } from "@/lib/workspace/finance-view";
import { dateLabel, demoToday, todayWib, weekKey } from "@/lib/workspace/presentation";
import { periodBounds } from "@/lib/workspace/period";
import type { Cash } from "@/lib/workspace/types";
import { useWorkspace } from "./context";
import { Field, Form, Modal, Submit, text } from "./ui";
import { ExpenseBreakdown, TripReceivables } from "./finance-breakdown";
import { CashGraph } from "./cash-graph";
import { ExpenseForm } from "./expense-form";
import { FinancePeriod, FinanceSummary } from "./finance-summary";
import { FinanceRecap } from "./finance-recap";
import { FinanceLedger } from "./finance-ledger";

export function Finance() {
  return <Suspense fallback={<p>Memuat cashflow…</p>}><FinanceView/></Suspense>;
}

function FinanceView() {
  const { state, prototype, mutate } = useWorkspace();
  const params = useSearchParams();
  const [period,setPeriod] = useState("month");
  const [reference,setReference] = useState(prototype ? demoToday : todayWib);
  const [tripId,setTripId] = useState<string|null>(params.get("trip"));
  const [detailWeek,setDetailWeek] = useState<string|null>(null);
  const [tab,setTab] = useState("transactions");
  const [editing,setEditing] = useState<Cash|"new"|null>(null);
  const [deleting,setDeleting] = useState<Cash|null>(null);

  const entries = filterPeriod(state.cash,period,reference);
  const previous = filterPeriod(state.cash,period,previousReference(period,reference));
  const [start,end] = periodBounds(period,reference);
  const opening = cashTotals(state.cash.filter(c=>Date.parse(c.occurredAt)<start)).net;
  const closing = cashTotals(state.cash.filter(c=>Date.parse(c.occurredAt)<end)).net;
  const selectedTrip = state.trips.find(t=>t.id===tripId);
  const detailEntries = entries
    .filter(c=>c.tripId===tripId&&(!detailWeek||weekKey(cashDate(c))===detailWeek))
    .sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt));

  function openTrip(id: string, week?: string) {
    setTripId(id); setDetailWeek(week??null); setTab("transactions");
  }
  function changePeriod(value: string, date: string) {
    setPeriod(value); setReference(date); setDetailWeek(null);
  }
  const expenseDate = detailWeek
    ? (period==="month"&&detailWeek<reference.slice(0,7)+"-01" ? reference.slice(0,7)+"-01" : detailWeek)
    : reference;
  const tabs = [
    { id:"transactions", label:"Transaksi", count:detailEntries.length },
    ...(selectedTrip ? [{ id:"participants", label:"Pembayaran peserta", count:state.participants.filter(p=>p.tripId===tripId&&p.status==="active").length }] : []),
    { id:"categories", label:"Kategori pengeluaran", count:undefined },
  ];

  return <div className="cashflow-workspace">
    <FinancePeriod period={period} reference={reference} onChange={changePeriod}/>
    {tripId===null ? <>
      <FinanceSummary entries={entries} previous={previous} period={period}/>
      <div className={`cf-analysis ${period==="week" ? "is-weekly" : ""}`}>
        <div className="cf-panel cf-chart-panel">
          {(period==="month"||period==="year")&&<CashGraph key={period+reference} entries={state.cash} period={period} reference={reference}/>}
          <div className="cash-balance" aria-label="Saldo kas tercatat"><div><span>Saldo awal tercatat</span><strong>{formatRupiah(opening)}</strong></div><ArrowRight size={16}/><div><span>Saldo akhir tercatat</span><strong>{formatRupiah(closing)}</strong></div><small>Berdasarkan transaksi di aplikasi</small></div>
        </div>
        <ExpenseBreakdown entries={entries}/>
      </div>
      <FinanceRecap entries={entries} trips={state.trips} period={period} reference={reference} onOpen={openTrip}/>
    </> : <>
      <section className="cf-detail-heading detail-finance-heading">
        <div><button className="text-link" onClick={()=>setTripId(null)}><ArrowLeft size={15}/> Kembali ke rekap cashflow</button><h2>{selectedTrip?.title??(tripId===""?"Umum bisnis":"Trip tidak ditemukan")}</h2><p>{selectedTrip ? dateLabel(selectedTrip.departureDate,true)+" · " : ""}{detailWeek ? "Transaksi minggu "+dateLabel(detailWeek) : "Transaksi pada periode terpilih"}</p></div>
        {(selectedTrip||tripId==="")&&<button className="td-button" onClick={()=>setEditing("new")}><Plus size={16}/> Catat pengeluaran</button>}
      </section>
      <FinanceSummary entries={detailEntries} period={period}/>
      <section className="cf-panel finance-trip-detail">
        <div className="cf-detail-tabs" role="tablist" aria-label="Detail keuangan trip">
          {tabs.map((item,index)=><button key={item.id} role="tab" id={"cf-tab-"+item.id} aria-controls={"cf-panel-"+item.id} aria-selected={tab===item.id} tabIndex={tab===item.id?0:-1} onClick={()=>setTab(item.id)} onKeyDown={e=>{
            if (!["ArrowLeft","ArrowRight","Home","End"].includes(e.key)) return;
            e.preventDefault();
            const next=e.key==="Home"?0:e.key==="End"?tabs.length-1:(index+(e.key==="ArrowRight"?1:-1)+tabs.length)%tabs.length;
            setTab(tabs[next].id); document.getElementById("cf-tab-"+tabs[next].id)?.focus();
          }}>{item.label}{item.count!==undefined&&<span>{item.count}</span>}</button>)}
        </div>
        <div role="tabpanel" id={"cf-panel-"+tab} aria-labelledby={"cf-tab-"+tab} tabIndex={0}>
          {tab==="transactions"&&<FinanceLedger key={tripId+period+reference+(detailWeek??"")} entries={detailEntries} allEntries={state.cash} trips={state.trips} tripId={tripId} prototype={prototype} onEdit={setEditing} onDelete={setDeleting}/>}
          {tab==="participants"&&selectedTrip&&<TripReceivables state={state} tripId={tripId}/>}
          {tab==="categories"&&<ExpenseBreakdown entries={detailEntries}/>}
        </div>
      </section>
    </>}
    {editing&&tripId!==null&&<ExpenseForm tripId={tripId} expense={editing==="new"?undefined:editing} date={expenseDate} onClose={()=>setEditing(null)}/>}
    {deleting&&<Modal title="Hapus pengeluaran" onClose={()=>setDeleting(null)}><p className="empty-note">{deleting.description} · {formatRupiah(deleting.amount)}</p><Form onSave={async data=>{
      await mutate({action:"expense.delete",expenseId:deleting.id,reason:text(data,"reason")}); setDeleting(null);
    }}><Field label="Alasan penghapusan" name="reason" required/><Submit>Hapus pengeluaran</Submit></Form></Modal>}
  </div>;
}
