import { registrationDate } from "./import";
import type { Trip } from "./types";

export function sheetDateOrder(values:string[][],locale?:string):"dmy"|"mdy" {
  if(locale?.replace("-","_").toLowerCase()==="en_us")return "mdy";
  const timestamps=values.map(row=>row[0]??"").filter(v=>/^\d{1,2}\/\d{1,2}\/\d{4}/.test(v));
  return timestamps.some(v=>Number(v.split("/")[1])>12)?"mdy":"dmy";
}
const normalize=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]/g,"");
export function readTripDetails(title:string,values:string[][],headerRow:number,dateOrder:"dmy"|"mdy") {
  const headers=values[headerRow-1]??[],rows=values.slice(headerRow);
  function field(names:string[]) {
    const wanted=names.map(normalize),found:string[]=[];
    headers.forEach((header,index)=>{if(wanted.includes(normalize(header)))found.push(...rows.map(r=>r[index]??""));});
    for(const row of values.slice(0,headerRow-1))if(wanted.includes(normalize(row[0]??"")))found.push(row[1]??"");
    const unique=[...new Set(found.map(v=>v.trim()).filter(Boolean))];
    return unique.length===1?unique[0]:"";
  }
  function date(value:string) {
    const months=["januari|january|jan","februari|february|feb","maret|march|mar","april|apr","mei|may","juni|june|jun","juli|july|jul","agustus|august|agu|ags|aug","september|sep|sept","oktober|october|okt|oct","november|nov","desember|december|des|dec"];
    let candidate=value.trim();
    for(const [index,month] of months.entries()) {
      const match=candidate.match(new RegExp("(?:^|[^0-9])(\\d{1,2})\\s+(?:"+month+")\\s+(20\\d{2})(?:$|[^0-9])","i"));
      if(match){candidate=`${match[2]}-${String(index+1).padStart(2,"0")}-${match[1].padStart(2,"0")}`;break;}
    }
    try{return new Date(registrationDate(candidate,dateOrder)).toLocaleDateString("en-CA",{timeZone:"Asia/Jakarta"});}catch{return "";}
  }
  function amount(value:string) {
    const cleaned=value.replace(/rp\.?\s*/gi,"").trim();
    if(!/^\d+(?:[.,]\d{3})*(?:\s*[kK])?$/.test(cleaned))return 0;
    const result=Number(cleaned.replace(/[.,\sKk]/g,""))*(/[kK]$/.test(cleaned)?1000:1);
    return result<=1_000_000_000?result:0;
  }
  const titleDate=title.match(/\d{4}-\d{2}-\d{2}/)?.[0]??title.match(/\d{1,2}\s+[a-z]+\s+20\d{2}/i)?.[0]??"";
  const departureDate=date(field(["Tanggal keberangkatan","Tanggal trip","Departure date","Tanggal perjalanan"])||titleDate);
  const volume=field(["Volume","Edisi"])||title.match(/\bvol(?:ume)?\.?\s*(\d+)/i)?.[1]||"";
  // Registration headers often bundle prices as free text (e.g. "175k Full Transport"),
  // not as their own labeled column — fall back to scanning the header text for them.
  const note=headers.join("\n");
  const fromNote=(regex:RegExp)=>amount(note.match(regex)?.[1]??"");
  const fields:Omit<Trip,"id"|"status">={
    title:(field(["Nama perjalanan","Nama trip","Trip name"])||title.replace(/\s*\((?:Responses|Respons|Jawaban)\)\s*$/i,"").replace(/\s*\bvol(?:ume)?\.?\s*\d+/i,"")).trim().slice(0,200),
    departureDate,volume,location:field(["Lokasi","Destinasi","Location"]),bankAccount:field(["Rekening","Informasi rekening","Bank account"]),
    fullPrice:amount(field(["Tarif Full","Harga Full","Tarif Full Transport","Harga Full Transport","Full Transport (Rp)"]))||fromNote(/(\d[\d.,]*\s*k?)\s*full\s*transport/i),
    nonPrice:amount(field(["Tarif Non","Harga Non","Tarif Non Transport","Harga Non Transport","Non Transport (Rp)"]))||fromNote(/(\d[\d.,]*\s*k?)\s*non\s*transport/i),
    raincoatPrice:amount(field(["Tarif jas hujan","Harga jas hujan"])||headers.find(h=>/jas hujan/i.test(h))?.match(/\+\s*([\d.,]+\s*k?)/i)?.[1]||"")||fromNote(/jas\s*hujan[^\d]*?\+\s*(\d[\d.,]*\s*k?)/i),
  };
  return fields;
}
