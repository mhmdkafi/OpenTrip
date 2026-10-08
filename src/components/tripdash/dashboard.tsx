"use client";
import { useWorkspace } from "./context";
import { Trips } from "./trips";
import { Participants } from "./participants";
import { Finance } from "./finance";
import { Inventory } from "./inventory";
import { Attendance } from "./attendance";
import { Overview } from "./overview";
import { TripDetail } from "./trip-detail";
const titles: Record<string,string>={overview:"Overview",trips:"Trip Schedule",participants:"Participants & Payments",finance:"Cashflow",inventory:"Inventory",attendance:"Attendance"};
export function Dashboard({section,tripId}:{section:string;tripId?:string}) {
 const {loading,loadError,error,notice}=useWorkspace();
 return <>{!tripId&&section!=="overview"&&<div className="page-heading"><div><h1>{titles[section]}</h1></div></div>}
 {loadError&&<p role="alert" className="notice error">{loadError}</p>}{error&&<p role="alert" className="notice error">{error}</p>}{notice&&<p role="status" className="notice">{notice}</p>}
 {loading?<p role="status">Loading workspace data…</p>:<>{section==="overview"&&<Overview/>}{section==="trips"&&(tripId?<TripDetail tripId={tripId}/>:<Trips/>)}{section==="participants"&&<Participants/>}{section==="finance"&&<Finance/>}{section==="inventory"&&<Inventory/>}{section==="attendance"&&<Attendance/>}</>}</>;
}
