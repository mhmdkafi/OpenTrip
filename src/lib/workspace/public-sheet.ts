import { parseGoogleSheetsUrl } from "@/lib/google";
import { DomainError } from "./commands";

export function parseSheetCsv(text:string) {
  const rows:string[][]=[];let row:string[]=[],cell="",quoted=false;
  for(let i=0;i<text.length;i++) {
    const char=text[i];
    if(char==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
    else if(!quoted&&(char===","||char==="\n")){row.push(cell.replace(/^\ufeff/,""));cell="";if(char==="\n"){rows.push(row);row=[];}}
    else if(char!=="\r"||quoted)cell+=char;
    if(rows.length>5101)throw new DomainError("The spreadsheet exceeds 5,000 responses.");
  }
  if(quoted)throw new DomainError("Incomplete spreadsheet CSV format.");
  if(cell||row.length){row.push(cell);rows.push(row);}
  return rows;
}
async function readGoogle(url:string,depth=0):Promise<string> {
  const response=await fetch(url,{redirect:"manual",cache:"no-store",signal:AbortSignal.timeout(20000)});
  if([301,302,303,307,308].includes(response.status)) {
    const next=new URL(response.headers.get("location")||"",url);
    if(next.hostname==="accounts.google.com")throw new DomainError("The spreadsheet can't be read yet. Share it as \"Anyone with the link: Viewer\".",403);
    if(depth>=4||next.protocol!=="https:"||!(next.hostname==="docs.google.com"||next.hostname.endsWith(".googleusercontent.com")))throw new DomainError("Unrecognized spreadsheet redirect.");
    return readGoogle(next.href,depth+1);
  }
  if(!response.ok)throw new DomainError("Could not read the spreadsheet. Check the link and Viewer access.",response.status===403?403:400);
  const reader=response.body?.getReader();if(!reader)throw new DomainError("The spreadsheet is empty.");
  let size=0,result="";const decoder=new TextDecoder();
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>5*1024*1024){await reader.cancel();throw new DomainError("The spreadsheet exceeds the 5 MB size limit.");}result+=decoder.decode(value,{stream:true});}
  return result+decoder.decode();
}
export async function readPublicSheet(input:string) {
  const parsed=parseGoogleSheetsUrl(input);
  if(!/^[\w-]{20,200}$/.test(parsed.spreadsheetId))throw new DomainError("Invalid spreadsheet ID.");
  const base=`https://docs.google.com/spreadsheets/d/${parsed.spreadsheetId}`;
  const html=await readGoogle(base+"/edit"+(parsed.sheetId!==undefined?`?gid=${parsed.sheetId}`:""));
  const decode=(value:string)=>value.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">");
  const title=decode(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]??"").replace(/\s+- Google (?:Sheets|Spreadsheet|Spreadsheets)$/i,"");
  const sheetId=parsed.sheetId??Number(html.match(/"gridId"\s*:\s*(\d+)/)?.[1]);
  if(!title||!Number.isSafeInteger(sheetId))throw new DomainError("Spreadsheet details unavailable. Check access and use the responses tab link.");
  const sheetTitle=decode(html.match(/docs-sheet-tab-caption[^>]*>([^<]+)/)?.[1]??"Respons");
  const locale=html.match(/"localeName"\s*:\s*"([\w-]+)"/)?.[1];
  const csv=await readGoogle(base+`/export?format=csv&gid=${sheetId}`);
  if(/^\s*</.test(csv))throw new DomainError("The spreadsheet response is not data. Check access permissions.");
  return {metadata:{spreadsheetId:parsed.spreadsheetId,title,locale},sheet:{sheetId,title:sheetTitle},values:parseSheetCsv(csv)};
}
