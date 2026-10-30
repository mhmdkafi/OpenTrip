"use client";
import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Search, Check, FileCheck2, Pencil, ArrowRight, UserX, Image as ImageIcon } from "lucide-react";
import { formatRupiah } from "@/lib/money";
import { paidFor, type Person, type Workspace } from "@/lib/workspace/types";
import { useWorkspace } from "./context";
import { Field, Form, FormSelect, number, Submit, text, TripSelect, Modal } from "./ui";
import { preloadProof, ProofImage } from "./proof-image";
import { driveFileId } from "@/lib/drive";
import { PaymentReview, RecordPayment } from "./payment-review";
import { excessFor } from "@/lib/workspace/reminders";
import { claimedAmounts, pendingProofs, unscannedProofs } from "@/lib/workspace/payment-queue";
import { Pagination } from "./pagination";
import { Dropdown } from "./dropdown";
import { MedicalBadge } from "./medical-badge";

const PACKAGES = [{ value: "Full Transport", label: "Full Transport" }, { value: "Non Transport", label: "Non Transport" }];
const PACKAGE_FILTERS = [{ value: "", label: "All packages" }, ...PACKAGES];
// "Tidak ada", "-" and similar answers mean there is nothing to flag.
const hasMedical = (notes?: string) => Boolean(notes && !/^(-+|tidak( ada)?|ga(k)? ada|nggak( ada)?|no(ne)?|none|nihil|aman|sehat)\.?$/i.test(notes.trim()));
const STATUS_FILTERS = [["", "All statuses"], ["verify", "To verify"], ["paid", "Paid"], ["dp", "Deposit"], ["unpaid", "Unpaid"], ["review", "Needs review"]] as const;
export function Participants({fixedTripId}:{fixedTripId?:string}) {
 const {state,mutate,replace,patchState}=useWorkspace();
 const [tripId,setTripId]=useState(fixedTripId??"");const [search,setSearch]=useState("");const [status,setStatus]=useState("");const [facility,setFacility]=useState("");const [page,setPage]=useState(0);const [viewing,setViewing]=useState<Person|null>(null);
 const [reviewing,setReviewing]=useState<string|null>(null);const [editing,setEditing]=useState<Person|null>(null);const [recording,setRecording]=useState<Person|null>(null);
 // Lookups built once per workspace change instead of scanning every booking per row.
 const bookings=useMemo(()=>new Map(state.bookings.map(b=>[b.id,b])),[state.bookings]);
 const bookingOf=(p:Person)=>bookings.get(p.bookingId);
 const awaiting=(p:Person)=>{const b=bookingOf(p);return Boolean(b?.proof&&!b.proofStatus&&paidFor(state,p.id)<p.charge);};
 const billStatus=(p:Person)=>!p.reviewed?"review":paidFor(state,p.id)>=p.charge?"paid":awaiting(p)?"verify":paidFor(state,p.id)>0?"dp":"unpaid";
 const labels:Record<string,string>={review:"Needs review",verify:"To verify",paid:"Paid",dp:"Deposit",unpaid:"Unpaid"};
 const {pendingCount,claimed,unscanned}=useMemo(()=>({pendingCount:pendingProofs(state,tripId||undefined).length,claimed:claimedAmounts(state,tripId||undefined),unscanned:unscannedProofs(state,tripId||undefined).length}),[state,tripId]);const [scanning,setScanning]=useState(false);
 // Read transfer amounts from new proofs in the background; each amount appears as soon as its proof is read.
 useEffect(()=>{if(!unscanned)return;let stop=false;(async()=>{setScanning(true);try{for(let round=0;round<5&&!stop;round++){const final=await streamScan(tripId,line=>{if(!stop)patchState(s=>({...s,bookings:s.bookings.map(b=>b.proof===line.proof&&b.proofAmount===undefined?{...b,proofAmount:line.amount}:b)}));});if(stop||!final)break;replace(final);if(!final.remaining)break;}}catch{}finally{if(!stop)setScanning(false);}})();return()=>{stop=true;setScanning(false);};
 // eslint-disable-next-line react-hooks/exhaustive-deps -- start once per trip; the loop itself drains the rest
 },[tripId,unscanned>0]);
 const active=useMemo(()=>state.participants.filter(p=>p.status==="active"&&(!tripId||p.tripId===tripId)),[state.participants,tripId]);
 // Unpaid participants per trip and proof, for the "Group N" shortcut.
 const proofGroups=useMemo(()=>{const groups=new Map<string,Person[]>();for(const m of active){const proof=bookings.get(m.bookingId)?.proof;if(!proof||paidFor(state,m.id)>=m.charge)continue;const key=`${m.tripId}|${proof}`;groups.set(key,[...(groups.get(key)??[]),m]);}return groups;},[active,bookings,state]);
 const filtered=active.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())&&(!status||billStatus(p)===status)&&(!facility||p.facility===facility));
 const currentPage=Math.min(page,Math.max(0,Math.ceil(filtered.length/10)-1));
 // Warm the proofs on the visible page once the browser is idle, so opening one is instant.
 const pageProofs=filtered.slice(currentPage*10,currentPage*10+10).map(p=>bookingOf(p)?.proof).filter((u):u is string=>Boolean(u&&driveFileId(u))).join("\n");
 useEffect(()=>{if(!pageProofs)return;const warm=()=>pageProofs.split("\n").forEach(preloadProof);if("requestIdleCallback" in window){const id=requestIdleCallback(warm,{timeout:2000});return()=>cancelIdleCallback(id);}const id=setTimeout(warm,300);return()=>clearTimeout(id);},[pageProofs]);
 // Payment summary for the trip: what came in, what is still owed, and what waits for review.
 const billed=active.reduce((sum,p)=>sum+p.charge,0), collected=active.reduce((sum,p)=>sum+Math.min(paidFor(state,p.id),p.charge),0), outstanding=Math.max(billed-collected,0);
 const fullyPaid=active.filter(p=>p.charge>0&&paidFor(state,p.id)>=p.charge).length, owing=active.filter(p=>paidFor(state,p.id)<p.charge).length;
 return <div className="section-stack"><section className="pt-summary" aria-label="Payment summary">
  <div className="pt-sum"><span>Collected</span><strong>{formatRupiah(collected)}</strong><div className="pt-progress" role="progressbar" aria-label="Share of bills collected" aria-valuemin={0} aria-valuemax={100} aria-valuenow={billed?Math.round(collected/billed*100):0}><i style={{width:`${billed?Math.min(100,collected/billed*100):0}%`}}/></div><small>of {formatRupiah(billed)} billed</small></div>
  <div className="pt-sum"><span>Outstanding</span><strong className={outstanding?"is-owed":""}>{formatRupiah(outstanding)}</strong><small>{owing?`${owing} ${owing===1?"person has":"people have"} a balance`:"Nothing left to collect"}</small></div>
  <div className="pt-sum"><span>Paid in full</span><strong>{fullyPaid}<em> / {active.length}</em></strong><small>participants</small></div>
  <div className={`pt-sum pt-sum-review${pendingCount?" has-pending":""}`}><span>To verify</span><strong>{pendingCount}<em> {pendingCount===1?"proof":"proofs"}</em></strong>{pendingCount?<button className="td-button" onClick={()=>setReviewing("")}><FileCheck2 size={15}/> Review payments</button>:<small><Check size={13}/> All proofs reviewed</small>}</div>
 </section>
 <section className="td-panel participants-panel"><div className="panel-heading"><div><h2>Participants</h2>{scanning&&<p className="scan-note">Reading transfer amounts from proofs…</p>}</div><div className="pr-heading-actions">{!fixedTripId&&<div className="compact-select"><TripSelect value={tripId} onChange={v=>{setTripId(v);setPage(0);}}/></div>}</div></div>
 <div className="table-toolbar"><label className="search-field"><Search size={16}/><input aria-label="Search participant name" placeholder="Search participant name…" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/></label><div className="pt-filter"><Dropdown label="Payment status" value={status} options={STATUS_FILTERS.map(([v,l])=>({value:v,label:`${l} (${v?active.filter(p=>billStatus(p)===v).length:active.length})`}))} onChange={v=>{setStatus(v);setPage(0);}}/></div><div className="pt-filter"><Dropdown label="Package" value={facility} options={PACKAGE_FILTERS} onChange={v=>{setFacility(v);setPage(0);}}/></div>{(search||status||facility)&&<button type="button" className="filter-reset" onClick={()=>{setSearch("");setStatus("");setFacility("");setPage(0);}}><RotateCcw size={14}/> Reset</button>}</div>
 <div className="table-wrap"><table className="td-table pt-table"><thead><tr>{["No","Participant","Package","Contact","Bill","Paid","Balance","Status","Actions"].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{filtered.slice(currentPage*10,currentPage*10+10).map((p,index)=>{const booking=bookingOf(p)!;const verified=paidFor(state,p.id);const pending=awaiting(p);const read=claimed.get(p.id);const paid=pending&&typeof read==="number"?verified+read:verified;const group=proofGroups.get(`${p.tripId}|${booking.proof}`)??[];return <tr key={p.id}><td className="row-number">{currentPage*10+index+1}</td><td className="pt-name"><div className="pt-who"><span className="pt-who-line"><strong>{p.name}</strong>{p.age&&<span className="pt-age">{p.age} yrs</span>}{hasMedical(p.medicalNotes)&&<MedicalBadge notes={p.medicalNotes!}/>}</span><small title={p.address}>{p.address||"No address"}</small></div></td><td className="pt-pkg">{p.facility}<small className="block mt-1">{p.meetingPoint||"Meeting point missing"}{p.raincoats?` · +${p.raincoats} raincoat${p.raincoats>1?"s":""}`:p.raincoats===null?" · Raincoat needs review":""}</small></td><td className="pt-contact" data-label="Contact">{booking.phone?<span className="pt-phone">{booking.phone}</span>:<span className="pt-none">No WhatsApp</span>}<small>{p.emergencyPhone?<>SOS {p.emergencyPhone}</>:"No emergency contact"}</small></td><td className="money-cell pt-bill" data-label="Bill">{formatRupiah(p.charge)}{!p.reviewed&&<small className="block">Provisional</small>}</td><td className={`money-cell pt-paid ${pending?"pending-money":""}`} data-label="Paid">{(()=>{const reading=pending&&read===undefined,amount=reading?<span className="money-skeleton" role="status" aria-label="Reading amount from proof"/>:formatRupiah(paid);return driveFileId(booking.proof)?<button type="button" className="paid-proof" title="View transfer proof" aria-label={`${reading?"Amount being read":formatRupiah(paid)}, view transfer proof from ${p.name}`} onPointerEnter={()=>preloadProof(booking.proof)} onFocus={()=>preloadProof(booking.proof)} onClick={()=>setViewing(p)}>{amount}<ImageIcon size={13} aria-hidden="true"/></button>:amount;})()}{pending&&read===null&&<small className="block">Amount unreadable, check proof</small>}{excessFor(state,p.id)>0&&<small className="block pt-over">+{formatRupiah(excessFor(state,p.id))} over</small>}</td><td className={`money-cell pt-out ${p.charge>paid?"remaining-money":""}`} data-label="Balance">{formatRupiah(Math.max(p.charge-paid,0))}</td><td className="pt-state"><span className={`pt-status pt-status-${billStatus(p)}`}>{labels[billStatus(p)]}</span></td><td className="pt-act"><div className="row-actions"><button className="table-icon" aria-label={`Edit ${p.name}`} title="Edit participant" onClick={()=>setEditing(p)}><Pencil size={13}/></button>{pending?<button className="row-review" onClick={()=>setReviewing(`${p.tripId}|${booking.proof}`)}>Review{group.length>1?` · ${group.length}`:""} <ArrowRight size={12}/></button>:p.reviewed&&verified<p.charge&&<button className="row-record" onClick={()=>setRecording(p)}>Record payment</button>}</div></td></tr>;})}</tbody></table>{!filtered.length&&<div className="empty-state"><Search size={26}/><h3>No matching participants</h3><p>Try another name or filter, or import responses from the Trips menu.</p></div>}</div>
 <Pagination page={currentPage} total={filtered.length} pageSize={10} unit="participants" onChange={setPage}/></section>
 {editing&&<Modal title="Participant details" onClose={()=>setEditing(null)} wide><Form key={editing.id} onSave={async d=>{await mutate({action:"participant.edit",participantId:editing.id,name:text(d,"name"),meetingPoint:text(d,"mepo"),facility:text(d,"facility") as "Full Transport"|"Non Transport",raincoats:number(d,"rain"),phone:text(d,"phone"),age:text(d,"age"),address:text(d,"address"),emergencyPhone:text(d,"emergency"),medicalNotes:text(d,"medical")});setEditing(null);}}>
  {/* One form, read top to bottom: who they are, how to reach them, their trip, then health notes. */}
  <div className="pd-form">
   <div className="pd-span-4"><Field label="Full name" name="name" defaultValue={editing.name} maxLength={200} required/></div>
   <div className="pd-span-2"><Field label="Age" name="age" defaultValue={editing.age} maxLength={20} inputMode="numeric" placeholder="e.g. 27"/></div>
   <div className="pd-span-3"><Field label="WhatsApp" name="phone" type="tel" defaultValue={bookingOf(editing)?.phone} maxLength={40} placeholder="08…"/></div>
   <div className="pd-span-3"><Field label="Emergency contact" name="emergency" type="tel" defaultValue={editing.emergencyPhone} maxLength={40} placeholder="Family or friend’s number"/></div>
   <div className="pd-span-6"><Field label="Address" name="address" defaultValue={editing.address} maxLength={300}/></div>
   <div className="pd-span-6 pd-rule" aria-hidden="true"/>
   <div className="pd-span-2"><Field label="Meeting point" name="mepo" defaultValue={editing.meetingPoint} maxLength={200} required/></div>
   <div className="pd-span-2"><FormSelect label="Package" name="facility" defaultValue={editing.facility} options={PACKAGES}/></div>
   <div className="pd-span-2"><Field label="Raincoats" type="number" min={0} max={100} name="rain" defaultValue={editing.raincoats??0} required/></div>
   <label className="form-label pd-span-6"><span>Medical history</span><textarea className="td-input pd-textarea" name="medical" rows={3} maxLength={1000} defaultValue={editing.medicalNotes} placeholder="Illnesses, allergies, or medication the field team should know about"/><small>Visible to admins only. Never included in WhatsApp messages.</small></label>
   {state.participants.filter(x=>x.bookingId===editing.bookingId).length>1&&<p className="pd-hint pd-span-6">The WhatsApp number is shared with everyone on the same registration.</p>}
  </div>
  <div className="pd-actions"><Submit>Save details</Submit></div></Form><details className="cancel-details"><summary><UserX size={16} aria-hidden="true"/> Participant cancelling the trip?</summary><p className="cancel-note">The participant is removed from this trip’s list and bill totals. Recorded payments stay in cashflow.</p><Form onSave={async d=>{await mutate({action:"participant.cancel",participantId:editing.id,reason:text(d,"reason")});setEditing(null);}}><Field label="Cancellation reason" name="reason" required/><Submit>Cancel participation</Submit></Form></details></Modal>}
 {viewing&&<Modal title={`Transfer proof · ${viewing.name}`} onClose={()=>setViewing(null)}><div className="proof-view">{bookingOf(viewing)?.proof&&<ProofImage url={bookingOf(viewing)!.proof!}/>}</div></Modal>}
 {reviewing!==null&&<PaymentReview tripId={tripId||undefined} startKey={reviewing||undefined} onClose={()=>setReviewing(null)} onReviewBill={setEditing}/>}
 
 {recording&&<RecordPayment person={recording} onClose={()=>setRecording(null)}/>}
 </div>;
}

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
