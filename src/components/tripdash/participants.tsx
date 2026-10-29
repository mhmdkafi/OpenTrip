"use client";
import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal, Check, Users, Wallet, Clock3, FileCheck2, ExternalLink, Pencil, ArrowRight, CircleAlert } from "lucide-react";
import { formatRupiah } from "@/lib/money";
import { paidFor, type Person, type Workspace } from "@/lib/workspace/types";
import { requestJson, useWorkspace } from "./context";
import { Field, Form, number, Panel, Select, Submit, text, TripSelect, Modal } from "./ui";
import { ProofImage } from "./proof-image";
import { PaymentReview } from "./payment-review";
import { claimedAmounts, pendingProofs, unscannedProofs } from "@/lib/workspace/payment-queue";
import { Pagination } from "./pagination";
import { Dropdown } from "./dropdown";

const SORT_OPTIONS = [{ value: "source", label: "Registration order" }, { value: "name", label: "Name A–Z" }, { value: "remaining", label: "Largest outstanding" }];
const PACKAGE_OPTIONS = [{ value: "", label: "All packages" }, { value: "Full Transport", label: "Full Transport" }, { value: "Non Transport", label: "Non Transport" }];
export function Participants({fixedTripId}:{fixedTripId?:string}) {
 const {state,mutate,replace,patchState}=useWorkspace();
 const [tripId,setTripId]=useState(fixedTripId??"");const [search,setSearch]=useState("");const [status,setStatus]=useState("");const [mepo,setMepo]=useState("");const [facility,setFacility]=useState("");const [filters,setFilters]=useState(false);const [page,setPage]=useState(0);const [sort,setSort]=useState("source");
 const [reviewing,setReviewing]=useState<string|null>(null);const [editing,setEditing]=useState<Person|null>(null);const [selected,setSelected]=useState<string[]>([]);const [amount,setAmount]=useState(0);
 // Lookups built once per workspace change instead of scanning every booking per row.
 const bookings=useMemo(()=>new Map(state.bookings.map(b=>[b.id,b])),[state.bookings]);
 const bookingOf=(p:Person)=>bookings.get(p.bookingId);
 const awaiting=(p:Person)=>{const b=bookingOf(p);return Boolean(b?.proof&&!b.proofStatus&&paidFor(state,p.id)<p.charge);};
 const billStatus=(p:Person)=>!p.reviewed?"review":paidFor(state,p.id)>=p.charge?"paid":awaiting(p)?"verify":paidFor(state,p.id)>0?"dp":"unpaid";
 const labels:Record<string,string>={review:"Needs review",verify:"To verify",paid:"Paid",dp:"Deposit",unpaid:"Unpaid"};
 const {pendingCount,claimed,unscanned}=useMemo(()=>({pendingCount:pendingProofs(state,tripId||undefined).length,claimed:claimedAmounts(state,tripId||undefined),unscanned:unscannedProofs(state,tripId||undefined).length}),[state,tripId]);const [scanning,setScanning]=useState(false);
 // Read transfer amounts from new proofs in the background; each amount appears as soon as its proof is read.
 useEffect(()=>{if(!unscanned)return;let stop=false;setScanning(true);(async()=>{try{for(let round=0;round<5&&!stop;round++){const final=await streamScan(tripId,line=>{if(!stop)patchState(s=>({...s,bookings:s.bookings.map(b=>b.proof===line.proof&&b.proofAmount===undefined?{...b,proofAmount:line.amount}:b)}));});if(stop||!final)break;replace(final);if(!final.remaining)break;}}catch{}finally{if(!stop)setScanning(false);}})();return()=>{stop=true;setScanning(false);};
 // eslint-disable-next-line react-hooks/exhaustive-deps -- start once per trip; the loop itself drains the rest
 },[tripId,unscanned>0]);
 const active=useMemo(()=>state.participants.filter(p=>p.status==="active"&&(!tripId||p.tripId===tripId)),[state.participants,tripId]);
 // Unpaid participants per trip and proof, for the "Group N" shortcut.
 const proofGroups=useMemo(()=>{const groups=new Map<string,Person[]>();for(const m of active){const proof=bookings.get(m.bookingId)?.proof;if(!proof||paidFor(state,m.id)>=m.charge)continue;const key=`${m.tripId}|${proof}`;groups.set(key,[...(groups.get(key)??[]),m]);}return groups;},[active,bookings,state]);
 const filtered=active.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())&&(!status||billStatus(p)===status)&&(!mepo||p.meetingPoint===mepo)&&(!facility||p.facility===facility));
 if(sort==="name")filtered.sort((a,b)=>a.name.localeCompare(b.name,"id"));
 if(sort==="remaining")filtered.sort((a,b)=>(b.charge-paidFor(state,b.id))-(a.charge-paidFor(state,a.id)));
 const currentPage=Math.min(page,Math.max(0,Math.ceil(filtered.length/10)-1));
 const chosen=selected.map(id=>state.participants.find(p=>p.id===id)!).filter(Boolean);
 const remaining=chosen.reduce((s,p)=>s+Math.max(p.charge-paidFor(state,p.id),0),0);
 function choose(ids:string[]){setSelected(ids);const detected=ids.length===1?claimed.get(ids[0]):undefined;setAmount(typeof detected==="number"&&detected>0?detected:ids.reduce((s,id)=>{const p=state.participants.find(p=>p.id===id)!;return s+Math.max(p.charge-paidFor(state,id),0);},0));}
 const counters=[{label:"Registered participants",value:active.length,icon:Users},{label:"Fully paid",value:active.filter(p=>billStatus(p)==="paid").length,icon:Check},{label:"Deposit payment",value:active.filter(p=>billStatus(p)==="dp").length,icon:Wallet},{label:"Needs follow-up",value:active.filter(p=>["unpaid","review","verify"].includes(billStatus(p))).length,icon:Clock3}];
 return <div className="section-stack">{!fixedTripId&&<div className="stats-grid participant-stats">{counters.map(c=><div className="stat-card" key={c.label}><div className="stat-top"><span>{c.label}</span><span className="stat-icon"><c.icon size={16}/></span></div><div className="stat-value">{c.value}<small> people</small></div></div>)}</div>}
 <section className="td-panel participants-panel"><div className="panel-heading"><div><h2>Participant list</h2>{scanning&&<p className="scan-note">Reading transfer amounts from proofs…</p>}</div><div className="pr-heading-actions">{pendingCount>0&&<button className="td-button" onClick={()=>setReviewing("")}><FileCheck2 size={15}/> Review payments ({pendingCount})</button>}{!fixedTripId&&<div className="compact-select"><TripSelect value={tripId} onChange={v=>{setTripId(v);setPage(0);}}/></div>}</div></div>
 <div className="status-tabs" role="group" aria-label="Filter by payment status">{[["","All participants"],["verify","To verify"],["paid","Paid"],["dp","Deposit"],["unpaid","Unpaid"],["review","Needs review"]].map(([v,l])=><button key={v} aria-pressed={status===v} className={status===v?"active":""} onClick={()=>{setStatus(v);setPage(0);}}>{l}<span>{v?active.filter(p=>billStatus(p)===v).length:active.length}</span></button>)}</div>
 <div className="table-toolbar"><label className="search-field"><Search size={16}/><input aria-label="Search participant name" placeholder="Search participant name…" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/></label><button className="td-secondary" aria-expanded={filters} onClick={()=>setFilters(!filters)}><SlidersHorizontal size={14}/> Filter</button><div className="sort-select"><Dropdown label="Sort participants" value={sort} options={SORT_OPTIONS} onChange={setSort}/></div></div>
 {filters&&<div className="filter-expand"><div className="ts-field"><span className="ts-field-label">Meeting point</span><Dropdown label="Meeting point" value={mepo} options={[{value:"",label:"All meeting points"},...[...new Set(active.map(p=>p.meetingPoint))].filter(Boolean).map(v=>({value:v,label:v}))]} onChange={v=>{setMepo(v);setPage(0);}}/></div><div className="ts-field"><span className="ts-field-label">Package</span><Dropdown label="Package" value={facility} options={PACKAGE_OPTIONS} onChange={v=>{setFacility(v);setPage(0);}}/></div></div>}
 <div className="table-wrap"><table className="td-table pt-table"><thead><tr>{["No","Participant","Package / meeting point","Bill","Paid","Outstanding","Status","Actions"].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{filtered.slice(currentPage*10,currentPage*10+10).map((p,index)=>{const booking=bookingOf(p)!;const verified=paidFor(state,p.id);const pending=awaiting(p);const read=claimed.get(p.id);const paid=pending&&typeof read==="number"?verified+read:verified;const group=proofGroups.get(`${p.tripId}|${booking.proof}`)??[];return <tr key={p.id}><td className="row-number">{currentPage*10+index+1}</td><td className="pt-name"><div className="overview-table-avatar"><div><strong>{p.name}</strong><small>{p.raincoats?`+${p.raincoats} raincoat${p.raincoats>1?"s":""}`:p.raincoats===null?"Raincoat needs review":"No add-ons"}</small></div></div></td><td className="pt-pkg">{p.facility}<small className="block mt-1">{p.meetingPoint||"Meeting point missing"}</small></td><td className="money-cell pt-bill" data-label="Bill">{formatRupiah(p.charge)}{!p.reviewed&&<small className="block">Provisional</small>}</td><td className={`money-cell pt-paid ${pending?"pending-money":""}`} data-label="Paid">{pending&&read===undefined?<span className="money-skeleton" role="status" aria-label="Reading amount from proof"/>:formatRupiah(paid)}{pending&&<small className="block">{read===null?"Amount unreadable, check proof":read===undefined?"":"From proof, not verified"}</small>}</td><td className={`money-cell pt-out ${p.charge>paid?"remaining-money":""}`} data-label="Outstanding">{formatRupiah(Math.max(p.charge-paid,0))}</td><td className="pt-state"><span className={`pt-status pt-status-${billStatus(p)}`}>{labels[billStatus(p)]}</span></td><td className="pt-act"><div className="row-actions"><button className="table-icon" aria-label={`Edit ${p.name}`} onClick={()=>setEditing(p)}><Pencil size={13}/></button>{pending?<button className="row-review" onClick={()=>setReviewing(`${p.tripId}|${booking.proof}`)}>Review{group.length>1?` · ${group.length}`:""} <ArrowRight size={12}/></button>:p.reviewed&&verified<p.charge&&<button className="row-record" onClick={()=>choose([p.id])}>Record payment</button>}</div></td></tr>;})}</tbody></table>{!filtered.length&&<div className="empty-state"><Search size={26}/><h3>No matching participants</h3><p>Try another name or filter, or import responses from the Trips menu.</p></div>}</div>
 <Pagination page={currentPage} total={filtered.length} pageSize={10} unit="participants" onChange={setPage}/></section>
 {editing&&<Modal title="Review participant data" onClose={()=>setEditing(null)}><Form key={editing.id} onSave={async d=>{await mutate({action:"participant.edit",participantId:editing.id,name:text(d,"name"),meetingPoint:text(d,"mepo"),facility:text(d,"facility") as "Full Transport"|"Non Transport",raincoats:number(d,"rain"),reason:text(d,"reason")});setEditing(null);}}><Field label="Full name" name="name" defaultValue={editing.name} required/><Field label="Meeting point" name="mepo" defaultValue={editing.meetingPoint} required/><label className="form-label">Package<select className="td-input" name="facility" defaultValue={editing.facility}><option>Full Transport</option><option>Non Transport</option></select></label><Field label="Raincoats" type="number" min={0} name="rain" defaultValue={editing.raincoats??0} required/><Field label="Reason / confirmation note" name="reason" required placeholder="Example: confirmed by the participant"/><Submit>Confirm & save</Submit></Form><details className="cancel-details"><summary>Participant cancelling the trip?</summary><Form onSave={async d=>{await mutate({action:"participant.cancel",participantId:editing.id,reason:text(d,"reason")});setEditing(null);}}><Field label="Cancellation reason" name="reason" required/><Submit>Cancel participation</Submit></Form></details></Modal>}
 {reviewing!==null&&<PaymentReview tripId={tripId||undefined} startKey={reviewing||undefined} onClose={()=>setReviewing(null)} onReviewBill={setEditing}/>}
 
 {selected.length>0&&<Modal title={selected.length>1?"Verify group payment":"Verify payment"} onClose={()=>setSelected([])} wide><div className="verification-grid"><div><Evidence person={chosen[0]}/><p className="evidence-caption"><ShieldInfo/> Check the recipient, amount, and transaction before saving.</p></div><div><div className="payment-summary"><span>Participants being verified</span><strong>{chosen.map(p=>p.name).join(", ")}</strong><div><span>Outstanding</span><b>{formatRupiah(remaining)}</b></div></div><Form onSave={async d=>{await mutate({action:"payment.verify",participantIds:selected,amount,method:text(d,"method") as "transfer"|"cash"|"other",notes:text(d,"notes"),fullyPaid:d.get("fullyPaid")==="on"});setSelected([]);}}><Field label="Actual transfer amount (Rp)" type="number" min={1} required value={amount} onChange={e=>setAmount(Number(e.target.value))}/><label className="form-label">Payment method<select className="td-input" name="method"><option value="transfer">Bank transfer</option><option value="cash">Cash</option><option value="other">Other</option></select></label><Field label="Note (optional)" name="notes" maxLength={500} placeholder="Add a verification note"/><p className="empty-note">The cash date follows the {selected.length>1?"earliest ":""}registration timestamp{selected.length>1?" in the group":""}. {selected.length>1?"Allocation follows name order; any excess becomes unallocated funds.":""}</p><label className="check-label"><input type="checkbox" name="fullyPaid"/> Tandai lunas jika nominal mencukupi</label><label className="check-label"><input type="checkbox" required/> I have checked the proof and transfer amount.</label><Submit><Check size={15}/> Save verification</Submit></Form></div></div></Modal>}
 </div>;
 function Evidence({person}:{person:Person}){const booking=state.bookings.find(b=>b.id===person.bookingId);return <div className="evidence-preview"><div className="evidence-stamp"><FileCheck2 size={32}/></div><span className="eyebrow">{"PAYMENT PROOF"}</span><h3>{person.name}</h3><p>{"Check the transfer proof in Google Drive"}</p><div className="receipt-line"><span>Trip</span><strong>{state.trips.find(t=>t.id===person.tripId)?.title}</strong></div><div className="receipt-line"><span>Participant bill</span><strong>{formatRupiah(person.charge)}</strong></div><div className="receipt-line"><span>Registration</span><strong>{booking?new Date(booking.registeredAt).toLocaleDateString("en-GB"):"—"}</strong></div>{booking?.proof&&<ProofImage url={booking.proof}/>}{booking?.proof&&<a className="td-secondary mt-5" href={booking.proof} target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/> Open original proof</a>}</div>;}
}
function ShieldInfo(){return <CircleAlert size={15}/>;}

type ScanLine = { proof: string; amount: number | null };
type ScanDone = { state: Workspace; revision: number; remaining: number };
// Reads the scan stream line by line; resolves with the saved workspace once the server is done.
async function streamScan(tripId: string, onLine: (line: ScanLine) => void): Promise<ScanDone | null> {
  const response = await fetch("/api/payments/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(tripId ? { tripId } : {}) });
  if (!response.ok || !response.body) return null;
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "", done: ScanDone | null = null;
  for (;;) {
    const { value, done: ended } = await reader.read();
    if (ended) break;
    buffer += value;
    const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
    for (const text of lines) {
      if (!text) continue;
      const line = JSON.parse(text);
      if ("proof" in line) onLine(line); else if (line.done) done = line;
    }
  }
  return done;
}
