import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyCommand, commandSchema } from "./commands";
import { emptyWorkspace, paidFor, availableStock, type Source } from "./types";
import { importRows, registrationDate } from "./import";
import { periodBounds } from "./period";
import { parseGoogleDriveUrl, parseGoogleSheetsUrl } from "../google";

const uid = () => crypto.randomUUID();
function fixture() {
  const state = emptyWorkspace();
  const tripId = uid();
  state.trips.push({id:tripId,title:"Uji Malabar",departureDate:"2026-09-12",status:"active",fullPrice:175000,nonPrice:110000,raincoatPrice:15000});
  const source: Source={id:uid(),tripId,spreadsheetId:"abcdefghijk123456789012345",sheetId:0,sheetTitle:"Responses",headerRow:1,headers:[],mapping:{registered_at:0,raw_name:1,facility:2,meeting_point:3,raincoat_option:4,proof_refs:5},lastSuccessAt:"",review:[]};
  return {state,source,tripId};
}
describe("Client PRD integrated domain",()=>{
  it("splits 19 bookings into 21 people, recognizes Non, and never invents payment",()=>{
    const {state,source}=fixture();
    const rows=Array.from({length:19},(_,i)=>[`12/09/2026 10:${String(i).padStart(2,"0")}:00`,i===14?"Adi + Antares + Zanki":`Peserta ${i}`,i===14?"Non Transport":"Full","St Bandung","Ngga, Udah punya",""]);
    const imported=importRows(state,source,rows,"user");
    assert.equal(imported.state.bookings.length,19); assert.equal(imported.state.participants.length,21);
    assert.equal(imported.state.participants.find(p=>p.name==="Antares")?.charge,110000);
    assert.equal(imported.state.cash.length,0); assert.equal(imported.state.payments.length,0);
    const again=importRows(imported.state,source,[...rows].reverse(),"user");
    assert.equal(again.state.bookings.length,19); assert.equal(again.state.participants.length,21);
  });
  it("DP and settlement use actual amounts, registration timestamp, and durable retry keys",()=>{
    const {state,source}=fixture();
    const imported=importRows(state,source,[["31/08/2026 23:59:00","Budi","Full","Bandung","Mau",""]],"user").state;
    const id=imported.participants[0].id; const request=uid();
    const command={action:"payment.verify" as const,participantIds:[id],amount:100000,method:"transfer" as const,notes:"",fullyPaid:false};
    const dp=applyCommand(imported,command,"user",request);
    assert.equal(dp.participants[0].charge,190000); assert.equal(paidFor(dp,id),100000);
    assert.equal(dp.cash[0].occurredAt,"2026-08-31T16:59:00.000Z");
    assert.equal(applyCommand(dp,command,"user",request).cash.length,1);
    assert.throws(()=>applyCommand(dp,{...command,amount:10000,fullyPaid:true},"user",uid()),/mencukupi/);
    const settled=applyCommand(dp,{...command,amount:90000,fullyPaid:true},"user",uid());
    assert.equal(paidFor(settled,id),190000); assert.equal(settled.cash.reduce((s,e)=>s+e.amount,0),190000);
    assert.equal(imported.payments.length,0);
  });
  it("keeps one group transfer, caps allocations, and preserves overpayment",()=>{
    const {state,source}=fixture();
    let imported=importRows(state,source,[["12/09/2026 10:00:00","A + B + C","Non","Bandung","Tidak","https://drive.google.com/open?id=abcdefghijklmnopqrstuvwxyz"]],"user").state;
    for(const p of imported.participants) imported=applyCommand(imported,{action:"participant.edit",participantId:p.id,name:p.name,meetingPoint:p.meetingPoint,facility:"Non Transport",raincoats:0,reason:"Konfirmasi grup"},"user",uid());
    const paid=applyCommand(imported,{action:"payment.verify",participantIds:imported.participants.map(p=>p.id),amount:350000,method:"transfer",notes:"",fullyPaid:true},"user",uid());
    assert.equal(paid.payments.length,1); assert.equal(paid.cash.length,1); assert.equal(paid.cash[0].amount,350000);
    assert.equal(paid.payments[0].allocations.reduce((s,a)=>s+a.amount,0),330000);
  });
  it("blocks ambiguous add-ons and foreign participant IDs",()=>{
    const {state,source}=fixture();
    const imported=importRows(state,source,[["12/09/2026 10:00:00","A","Full","Bandung","",""]],"user").state;
    const cmd={action:"payment.verify" as const,participantIds:[imported.participants[0].id],amount:175000,method:"cash" as const,notes:"",fullyPaid:true};
    assert.throws(()=>applyCommand(imported,cmd,"user",uid()),/tinjau/);
    assert.throws(()=>applyCommand(imported,{...cmd,participantIds:[uid()]},"user",uid()),/tidak ditemukan/);
    assert.equal(imported.cash.length,0);
  });
  it("does not overwrite corrections or delete paid people when source changes",()=>{
    const {state,source}=fixture(); const row=["12/09/2026 10:00:00","A","Full","Bandung","Tidak",""];
    const first=importRows(state,source,[row],"user").state;
    const changed=importRows(first,source,[[...row.slice(0,3),"Jakarta",...row.slice(4)]],"user");
    assert.equal(changed.state.participants.length,1); assert.equal(changed.state.participants[0].meetingPoint,"Bandung");
    assert.ok(changed.stats.review>0); assert.equal(importRows(first,source,[],"user").state.participants.length,1);
  });
  it("prevents negative stock and repeat returns",()=>{
    let {state,tripId}=fixture();
    state=applyCommand(state,{action:"inventory.create",name:"Tenda",kind:"operational",total:3},"user",uid());
    const itemId=state.inventory[0].id;
    state=applyCommand(state,{action:"inventory.lend",itemId,tripId,quantity:2},"user",uid());
    assert.equal(availableStock(state.inventory[0]),1);
    assert.throws(()=>applyCommand(state,{action:"inventory.lend",itemId,tripId,quantity:2},"user",uid()),/mencukupi/);
    assert.throws(()=>applyCommand(state,{action:"inventory.adjust",itemId,total:1,damaged:0,reason:"Koreksi"},"user",uid()),/kurang/);
    const loanId=state.inventory[0].loans[0].id;
    state=applyCommand(state,{action:"inventory.return",itemId,loanId},"user",uid());
    assert.equal(availableStock(state.inventory[0]),3);
    assert.throws(()=>applyCommand(state,{action:"inventory.return",itemId,loanId},"user",uid()),/sudah/);
  });
  it("uses WIB boundaries independent of server timezone",()=>{
    const [start,end]=periodBounds("week","2026-09-09");
    assert.equal(new Date(start).toISOString(),"2026-09-06T17:00:00.000Z");
    assert.equal(new Date(end).toISOString(),"2026-09-13T17:00:00.000Z");
    assert.equal(periodBounds("week","2026-09-14")[0],end);
    assert.equal(registrationDate("12/09/2026 10:30:00"),"2026-09-12T03:30:00.000Z");
    assert.throws(()=>registrationDate("31/02/2026 10:00:00"),/tidak valid/);
  });
  it("rejects noninteger money and hostile proof hosts",()=>{
    assert.equal(commandSchema.safeParse({action:"expense.create",tripId:"",amount:1.5,date:"2026-09-12",category:"Biaya",description:"Uji"}).success,false);
    assert.throws(()=>parseGoogleDriveUrl("https://evil.example/file/d/abcdefghijklmnopqrstuvwxyz/view"));
    assert.throws(()=>parseGoogleSheetsUrl("https://evil.example/spreadsheets/d/abcdefghijklmnopqrstuvwxyz/edit"));
  });
});
