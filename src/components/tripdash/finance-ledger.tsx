"use client";
import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Check, Download, Pencil, Search, Trash2 } from "lucide-react";
import { formatRupiah } from "@/lib/money";
import { cashDate, recordedTime } from "@/lib/workspace/finance-view";
import { dateLabel } from "@/lib/workspace/presentation";
import type { Cash, Trip } from "@/lib/workspace/types";
import { Select } from "./ui";

export function FinanceLedger({ entries, allEntries, trips, tripId, onEdit, onDelete }: { entries: Cash[]; allEntries: Cash[]; trips: Trip[]; tripId: string; onEdit: (cash: Cash) => void; onDelete: (cash: Cash) => void }) {
  const [search,setSearch]=useState(""), [direction,setDirection]=useState(""), [page,setPage]=useState(0);
  const visible=entries.filter(c=>(!direction||c.direction===direction)&&`${c.description} ${c.category}`.toLowerCase().includes(search.toLowerCase()));
  const current=Math.min(page,Math.max(0,Math.ceil(visible.length/10)-1));
  const balances=new Map<string,number>();
  let balance=0;
  // Stable ordering also preserves insertion order for equal timestamps.
  for (const row of allEntries.filter(c=>c.tripId===tripId).sort((a,b)=>recordedTime(a).localeCompare(recordedTime(b)))) {
    balance+=row.direction==="in"?row.amount:-row.amount;
    balances.set(row.id,balance);
  }
  function exportCsv() {
    const escape=(value:string)=>'"'+(/^[=+@-]/.test(value)?"'":"")+value.replace(/"/g,'""')+'"';
    const csv="\ufeffDate (WIB),Trip,Category,Description,In,Out\n"+visible.map(e=>[new Date(recordedTime(e)).toLocaleString("en-GB",{timeZone:"Asia/Jakarta"}),trips.find(t=>t.id===e.tripId)?.title??"General business",e.category,e.description,e.direction==="in"?String(e.amount):"0",e.direction==="out"?String(e.amount):"0"].map(escape).join(",")).join("\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
    const link=document.createElement("a"); link.href=url; link.download="trip-finances.csv"; link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <div className="cf-ledger">
    <div className="transaction-toolbar"><label className="search-field"><Search size={16}/><input aria-label="Search transactions" placeholder="Search transactions or categories…" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/></label><Select label="Transaction type" value={direction} onChange={value=>{setDirection(value);setPage(0);}}><option value="">All transactions</option><option value="in">Income</option><option value="out">Pengeluaran</option></Select><button className="td-secondary" disabled={!visible.length} onClick={exportCsv}><Download size={16}/> Export CSV</button></div>
    <div className="table-wrap"><table className="td-table cf-ledger-table"><thead><tr><th>Date</th><th>Transaction</th><th>Category</th><th>Amount</th><th>Running balance</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{visible.slice(current*10,current*10+10).map(c=><tr key={c.id}>
      <td className="cf-cell-date">{dateLabel(cashDate({...c,occurredAt:recordedTime(c)}))}</td>
      <td className="cf-cell-name"><div><span className={`cf-transaction-icon ${c.direction==="in"?"is-income":"is-expense"}`}>{c.direction==="in"?<ArrowDownLeft size={17}/>:<ArrowUpRight size={17}/>}</span><span><strong>{c.description}</strong><small>{c.direction==="in"?"Participant payment":"Operating expense"}</small></span></div></td>
      <td className="cf-cell-category"><span>{c.category}</span></td>
      <td className={`cf-cell-amount ${c.direction==="in"?"cf-income":"cf-expense"}`}>{c.direction==="in"?"+":"−"}{formatRupiah(c.amount)}</td>
      <td className="cf-cell-balance"><span>Balance </span>{formatRupiah(balances.get(c.id)??0)}</td>
      <td className="cf-cell-actions">{c.direction==="out"?<div className="row-actions"><button className="table-icon" aria-label={`Edit ${c.description}`} onClick={()=>onEdit(c)}><Pencil size={15}/></button><button className="table-icon danger-button" aria-label={`Delete ${c.description}`} onClick={()=>onDelete(c)}><Trash2 size={15}/></button></div>:<span className="cf-verified"><Check size={13}/> Verified</span>}</td>
    </tr>)}</tbody></table>{!visible.length&&<div className="cf-empty"><Search size={26}/><h3>No matching transactions</h3><p>Try another search, transaction type, or period.</p></div>}</div>
    {visible.length>10&&<div className="table-foot"><span>{visible.length?current*10+1:0}–{Math.min((current+1)*10,visible.length)} of {visible.length} transactions</span><div className="pagination"><button disabled={current===0} onClick={()=>setPage(current-1)}>Previous</button><span>{current+1}</span><button disabled={(current+1)*10>=visible.length} onClick={()=>setPage(current+1)}>Next</button></div></div>}
    
  </div>;
}
