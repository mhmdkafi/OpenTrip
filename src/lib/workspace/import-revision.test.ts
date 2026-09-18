import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectSheetHeader, importSpreadsheet } from "./auto-import";
import { emptyWorkspace, availableStock } from "./types";
import { applyCommand, commandSchema } from "./commands";
import { prototypeWorkspace } from "./prototype";
import { tripStatus, dateLabel } from "./presentation";

const metadata = { spreadsheetId: "client-spreadsheet-source", title: "Malabar Vol 12 (Responses)" };
const sheet = { sheetId: 5, title: "Respons" };
const values = [["Form pendaftaran"], [], ["Timestamp", "Nama Lengkap", "Fasilitas", "Mepo"], ["13/09/2026 08:00", "Ari + Budi", "Full Transport", "Bandung"]];
const command = (state: ReturnType<typeof emptyWorkspace>, input: unknown) => applyCommand(state, commandSchema.parse(input), "test", crypto.randomUUID());
describe("Link-only import and equipment incident revision", () => {
  it("finds headers below introductory rows and imports a trip once without invented schedule or price", () => {
    assert.equal(detectSheetHeader(values).headerRow, 3);
    const result = importSpreadsheet(emptyWorkspace(),metadata,sheet,values,"test");
    assert.equal(result.state.trips.length,1);
    assert.equal(result.state.trips[0].title,"Malabar");
    assert.equal(result.state.trips[0].volume,"12");
    assert.equal(result.state.trips[0].departureDate,"");
    assert.equal(dateLabel(""),"Belum dijadwalkan");
    assert.equal(tripStatus(result.state.trips[0],result.state,"2026-09-13"),"upcoming");
    assert.deepEqual(result.state.participants.map(p=>p.name),["Ari","Budi"]);
    assert.ok(result.state.participants.every(p=>!p.reviewed&&p.charge===0));
    const again = importSpreadsheet(result.state,metadata,sheet,values,"test");
    assert.equal(again.state.trips.length,1);
    assert.equal(again.state.participants.length,2);
    assert.equal(again.stats.unchanged,1);
  });
  it("rejects missing and duplicate header columns instead of asking users to map uncertain data", () => {
    assert.throws(()=>detectSheetHeader([["Timestamp","Nama","Fasilitas"]]),/belum dikenali/);
    assert.throws(()=>detectSheetHeader([["Timestamp","Nama","Nama","Fasilitas","Mepo"]]),/belum dikenali/);
    assert.throws(()=>detectSheetHeader([["13/09/2026","Ari","Full Transport","Bandung"]]),/belum dikenali/);
  });
  it("does not attach an existing sheet to another trip or mutate the original on failure", () => {
    const initial = importSpreadsheet(emptyWorkspace(),metadata,sheet,values,"test").state;
    initial.trips.push({...initial.trips[0],id:crypto.randomUUID()});
    assert.throws(()=>importSpreadsheet(initial,metadata,sheet,values,"test",initial.trips[1].id),/trip lain/);
    assert.equal(initial.participants.length,2);
  });
  it("records lost loan items by description and only returns the remaining equipment", () => {
    const initial=prototypeWorkspace(), item=initial.inventory[0], loan=item.loans.find(l=>!l.returned)!;
    const state=command(initial,{action:"inventory.incident",itemId:item.id,loanId:loan.id,kind:"lost",quantity:1,description:"Tenda hilang"});
    const changed=state.inventory[0];
    assert.equal(changed.total,item.total-1);
    assert.equal(changed.incidents![0].description,"Tenda hilang");
    assert.equal(changed.loans[0].quantity,loan.quantity-1);
    assert.equal(availableStock(changed),availableStock(item));
    if (!changed.loans[0].returned) {
      const returned=command(state,{action:"inventory.return",itemId:item.id,loanId:loan.id});
      assert.equal(availableStock(returned.inventory[0]),changed.total-changed.damaged);
    }
    assert.throws(()=>command(initial,{action:"inventory.incident",itemId:item.id,loanId:loan.id,kind:"lost",quantity:999,description:"Tenda hilang"}),/melebihi/);
    assert.equal(initial.inventory[0].total,item.total);
  });
  it("keeps descriptive notes separate from stock changes and quarantines damaged stock", () => {
    const initial=prototypeWorkspace(), item=initial.inventory[0];
    const note=command(initial,{action:"inventory.incident",itemId:item.id,kind:"note",quantity:0,description:"Tenda perlu diperiksa"});
    assert.equal(availableStock(note.inventory[0]),availableStock(item));
    const damaged=command(note,{action:"inventory.incident",itemId:item.id,kind:"damaged",quantity:1,description:"Rangka patah"});
    assert.equal(damaged.inventory[0].total,item.total);
    assert.equal(availableStock(damaged.inventory[0]),availableStock(item)-1);
  });
});
