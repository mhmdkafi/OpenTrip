"use client";
import { useEffect, useState } from "react";
import { FileSpreadsheet, ShieldCheck, Link2 } from "lucide-react";
import { useWorkspace, requestJson } from "./context";
import { Panel } from "./ui";
import { Trips } from "./trips";
import { Participants } from "./participants";
import { Finance } from "./finance";
import { Inventory } from "./inventory";
import { Attendance } from "./attendance";
import { Overview } from "./overview";
import { TripDetail } from "./trip-detail";
import { SyncSchedule } from "./sync-schedule";
const titles: Record<string,string>={overview:"Overview",trips:"Trip Schedule",participants:"Participants & Payments",finance:"Cashflow",inventory:"Inventory",attendance:"Attendance",settings:"Settings"};
const descriptions: Record<string,string>={overview:"Rimbaloka Trip schedule and operational status.",trips:"Departures, participants, and registration sources.",participants:"Participant list and payment verification.",finance:"Income, expenses, and results per trip.",inventory:"",attendance:"Participant attendance by meeting point.",settings:"Account and data connections."};
export function Dashboard({section,tripId}:{section:string;tripId?:string}) {
 const {loading,loadError,error,notice}=useWorkspace();
 const [viewDate]=useState(()=>new Date());
 return <>{!tripId&&<div className="page-heading"><div><h1>{titles[section]}</h1>{descriptions[section]&&<p>{descriptions[section]}</p>}</div>{section==="overview"&&<span className="view-date">{viewDate.toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric",timeZone:"Asia/Jakarta"})}</span>}</div>}
 {loadError&&<p role="alert" className="notice error">{loadError}</p>}{error&&<p role="alert" className="notice error">{error}</p>}{notice&&<p role="status" className="notice">{notice}</p>}
 {loading?<p role="status">Loading workspace data…</p>:<>{section==="overview"&&<Overview/>}{section==="trips"&&(tripId?<TripDetail tripId={tripId}/>:<Trips/>)}{section==="participants"&&<Participants/>}{section==="finance"&&<Finance/>}{section==="inventory"&&<Inventory/>}{section==="attendance"&&<Attendance/>}{section==="settings"&&<Settings/>}</>}</>;
}
function Settings(){
 const {run,busy}=useWorkspace();const [google,setGoogle]=useState<{configured:boolean;connected:boolean}|null>(null);const [error,setError]=useState("");
 useEffect(()=>{requestJson("/api/google/status").then(setGoogle).catch(e=>setError(e.message));},[]);
 return <div className="section-stack"><Panel title="Workspace profile"><div className="business-profile"><div className="profile-mark">R</div><div><h3>Rimbaloka Trip</h3><p>Open trip & outdoor experiences</p><span className="badge">Administrator · Full access</span></div></div><div className="settings-facts"><div><small>App name</small><strong>TripDash</strong></div><div><small>Time zone</small><strong>Asia/Jakarta (WIB)</strong></div><div><small>Currency</small><strong>Indonesian Rupiah (IDR)</strong></div></div></Panel><Panel title="Google Sheets integration"><div className="integration-card"><div className="integration-icon"><FileSpreadsheet size={29}/></div><div><h3>Google Spreadsheet</h3><p>Read Google Form responses directly from your spreadsheet.</p></div><span className={`badge ${google?.connected?"":"gray"}`}>{google?.connected?"Connected":"Not connected"}</span></div>{error&&<p role="alert">{error}</p>}{google&&!google.configured&&<p className="empty-note">Connection unavailable. An administrator needs to finish the Google configuration.</p>}<div className="flex flex-wrap gap-3 mt-5">{google?.configured&&<a className="td-button" href="/api/google/connect"><Link2 size={15}/>{google.connected?"Reconnect":"Connect Google"}</a>}{google?.connected&&<button className="td-secondary" disabled={busy} onClick={()=>void run(async()=>{await requestJson("/api/google/status",{},"DELETE");setGoogle({...google,connected:false});})}>Disconnect</button>}</div><p className="settings-hint"><ShieldCheck size={15}/> Read-only. Your original spreadsheet stays untouched.</p></Panel><SyncSchedule/></div>;
}
