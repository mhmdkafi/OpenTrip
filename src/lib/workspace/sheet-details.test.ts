import { describe,it } from "node:test";
import assert from "node:assert/strict";
import { readTripDetails } from "./sheet-details";
import { parseSheetCsv } from "./public-sheet";
import { importSpreadsheet } from "./auto-import";
import { emptyWorkspace } from "./types";

describe("Real spreadsheet metadata import",()=>{
  it("parses multiline quoted headers and escaped commas without moving columns",()=>{
    assert.deepEqual(parseSheetCsv('Timestamp,"Nama, Lengkap","Registrasi\nBukti"\r\n8/14/2026,"Ari ""Adi""",link'),[["Timestamp","Nama, Lengkap","Registrasi\nBukti"],["8/14/2026",'Ari "Adi"',"link"]]);
  });
  it("extracts dates, edition, prices and meeting points while honoring US source timestamps",()=>{
    const values=[["Timestamp","Nama Lengkap","Fasilitas","Mepo","Tanggal keberangkatan","Tarif Full","Tarif Non","Jas Hujan (+15k)"],["8/14/2026 09:00:00","Peserta Contoh","Full Transport","Bandung","20 September 2026","175.000","110.000","Tidak"]];
    const result=importSpreadsheet(emptyWorkspace(),{spreadsheetId:"test-source-spreadsheet",title:"Malabar Vol 12 (Responses)",locale:"en_US"},{sheetId:123,title:"Respons"},values,"test");
    assert.equal(result.state.bookings[0].registeredAt,"2026-08-14T02:00:00.000Z");
    assert.equal(result.state.trips[0].departureDate,"2026-09-20");
    assert.equal(result.state.trips[0].volume,"12");
    assert.equal(result.state.trips[0].raincoatPrice,15000);
    assert.equal(result.state.participants[0].charge,175000);
    assert.equal(result.state.participants[0].reviewed,true);
    assert.deepEqual(result.state.trips[0].meetingPoints,["Bandung"]);
  });
  it("never substitutes registration dates for missing departure dates",()=>{
    const result=readTripDetails("Malabar Vol 12 (Responses)",[["Timestamp","Nama Lengkap"],["8/14/2026","Contoh"]],1,"mdy");
    assert.equal(result.departureDate,"");assert.equal(result.fullPrice,0);
  });
  it("reads pre-header metadata and ignores conflicting or invalid dates",()=>{
    const rows=[["Tanggal keberangkatan","2026-09-20"],["Harga Full Transport","Rp 175.000"],["Timestamp","Nama Lengkap"],["13/09/2026","Contoh"]];
    const result=readTripDetails("Malabar",rows,3,"dmy");
    assert.equal(result.departureDate,"2026-09-20");assert.equal(result.fullPrice,175000);
    assert.equal(readTripDetails("Trip 31 Februari 2026",[],1,"dmy").departureDate,"");
    assert.equal(readTripDetails("Trip",[["Tanggal trip"],["2026-09-20"],["2026-09-21"]],1,"dmy").departureDate,"");
  });
});
