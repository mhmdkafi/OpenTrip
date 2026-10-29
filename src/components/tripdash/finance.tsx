"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, RotateCcw } from "lucide-react";
import { formatRupiah } from "@/lib/money";
import { attributeToTrips, filterPeriod, previousReference, recordedTime } from "@/lib/workspace/finance-view";
import { dateLabel, todayWib } from "@/lib/workspace/presentation";
import type { Cash } from "@/lib/workspace/types";
import { useWorkspace } from "./context";
import { Field, Form, Modal, Submit, text } from "./ui";
import { ExpenseBreakdown, TripReceivables } from "./finance-breakdown";
import { CashGraph } from "./cash-graph";
import { ExpenseForm } from "./expense-form";
import { FinancePeriod, FinanceSummary } from "./finance-summary";
import { FinanceRecap } from "./finance-recap";
import { FinanceLedger } from "./finance-ledger";
import { periodLabel, samePeriod } from "./period-stepper";

export function Finance() {
  return <Suspense fallback={<p>Loading cashflow…</p>}><FinanceView/></Suspense>;
}

function FinanceView() {
  const { state, mutate } = useWorkspace();
  const params = useSearchParams();
  const [period,setPeriod] = useState("month");
  // Chart comparison is opt-in; without it the tiles compare against the previous period.
  const [customCompare,setCustomCompare] = useState<string|null>(null);
  const [reference,setReference] = useState(todayWib);
  const [tripId,setTripId] = useState<string|null>(params.get("trip"));
  const [tab,setTab] = useState("transactions");
  const [editing,setEditing] = useState<Cash|"new"|null>(null);
  const [deleting,setDeleting] = useState<Cash|null>(null);

  const cash = useMemo(()=>attributeToTrips(state.cash,state.trips),[state.cash,state.trips]);
  const entries = filterPeriod(cash,period,reference);
  const compare = customCompare ?? previousReference(period,reference);
  const previous = filterPeriod(cash,period,compare);
  const compareLabel = periodLabel(period==="year"?"year":"month",compare,true);
  const selectedTrip = state.trips.find(t=>t.id===tripId);
  // A trip's own page shows its whole history: payments are dated at registration,
  // which can fall months before departure.
  const detailEntries = cash
    .filter(c=>c.tripId===tripId)
    .sort((a,b)=>recordedTime(b).localeCompare(recordedTime(a)));

  function openTrip(id: string) {
    setTripId(id); setTab("transactions");
  }
  function changePeriod(value: string, date: string) {
    if (value !== period) setCustomCompare(null);
    setPeriod(value); setReference(date);
  }
  const tabs = [
    { id:"transactions", label:"Transactions", count:detailEntries.length },
    ...(selectedTrip ? [{ id:"participants", label:"Participant payments", count:state.participants.filter(p=>p.tripId===tripId&&p.status==="active").length }] : []),
    { id:"categories", label:"Expense categories", count:undefined },
  ];

  return <div className="cashflow-workspace ov cf-v2">
    <div className="page-heading ov-heading"><h1>Cashflow</h1>{tripId===null&&<div className="cf-heading-tools"><FinancePeriod period={period} reference={reference} onChange={changePeriod}/>{(period!=="month"||!samePeriod("month",reference,todayWib())||customCompare!==null)&&<button type="button" className="filter-reset" onClick={()=>{setPeriod("month");setReference(todayWib());setCustomCompare(null);}}><RotateCcw size={14}/> Reset</button>}</div>}</div>
    {tripId===null ? <>
      <FinanceSummary entries={entries} previous={previous} period={period} compareLabel={compareLabel}/>
      {(period==="month"||period==="year")&&<div className="cf-analysis">
        <div className="cf-panel cf-chart-panel">
          <CashGraph key={period} entries={cash} period={period} reference={reference} compare={customCompare} today={todayWib()} onReference={date=>changePeriod(period,date)} onCompare={setCustomCompare} onRemoveCompare={()=>setCustomCompare(null)}/>
        </div>
      </div>}
      <FinanceRecap entries={entries} trips={state.trips} period={period} reference={reference} onOpen={openTrip}/>
    </> : <>
      <section className="cf-detail-heading detail-finance-heading">
        <button type="button" className="back-button" onClick={()=>setTripId(null)} aria-label="Back to cashflow summary" title="Back to cashflow summary"><ArrowLeft size={18}/></button><div className="cf-detail-title"><h2>{selectedTrip?.title??(tripId===""?"General business":"Trip not found")}</h2><p>{selectedTrip ? dateLabel(selectedTrip.departureDate,true) : "Transactions not tied to a trip"}</p></div>
        {(selectedTrip||tripId==="")&&<button className="td-button" onClick={()=>setEditing("new")}><Plus size={16}/> Record expense</button>}
      </section>
      <FinanceSummary entries={detailEntries} period={period}/>
      <section className="cf-panel finance-trip-detail">
        <div className="cf-detail-tabs" role="tablist" aria-label="Trip finance details">
          {tabs.map((item,index)=><button key={item.id} role="tab" id={"cf-tab-"+item.id} aria-controls={"cf-panel-"+item.id} aria-selected={tab===item.id} tabIndex={tab===item.id?0:-1} onClick={()=>setTab(item.id)} onKeyDown={e=>{
            if (!["ArrowLeft","ArrowRight","Home","End"].includes(e.key)) return;
            e.preventDefault();
            const next=e.key==="Home"?0:e.key==="End"?tabs.length-1:(index+(e.key==="ArrowRight"?1:-1)+tabs.length)%tabs.length;
            setTab(tabs[next].id); document.getElementById("cf-tab-"+tabs[next].id)?.focus();
          }}>{item.label}{item.count!==undefined&&<span>{item.count}</span>}</button>)}
        </div>
        <div role="tabpanel" id={"cf-panel-"+tab} aria-labelledby={"cf-tab-"+tab} tabIndex={0}>
          {tab==="transactions"&&<FinanceLedger key={tripId??""} entries={detailEntries} allEntries={cash} trips={state.trips} tripId={tripId} onEdit={setEditing} onDelete={setDeleting}/>}
          {tab==="participants"&&selectedTrip&&<TripReceivables state={state} tripId={tripId}/>}
          {tab==="categories"&&<ExpenseBreakdown entries={detailEntries}/>}
        </div>
      </section>
    </>}
    {editing&&tripId!==null&&<ExpenseForm tripId={tripId} expense={editing==="new"?undefined:editing} date={reference} onClose={()=>setEditing(null)}/>}
    {deleting&&<Modal title="Delete expense" onClose={()=>setDeleting(null)}><p className="empty-note">{deleting.description} · {formatRupiah(deleting.amount)}</p><Form onSave={async data=>{
      await mutate({action:"expense.delete",expenseId:deleting.id,reason:text(data,"reason")}); setDeleting(null);
    }}><Field label="Reason for deletion" name="reason" required/><Submit>Delete expense</Submit></Form></Modal>}
  </div>;
}
