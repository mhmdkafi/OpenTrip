"use client";
import { useWorkspace } from "./context";
import { Trips } from "./trips";
import { Finance } from "./finance";
import { Inventory } from "./inventory";
import { Overview } from "./overview";
import { TripDetail } from "./trip-detail";
const titles: Record<string,string>={overview:"Overview",trips:"Trip Schedule",finance:"Cashflow",inventory:"Inventory"};
export function Dashboard({section,tripId}:{section:string;tripId?:string}) {
 const {loading,loadError,error,notice}=useWorkspace();
 return <>{!tripId&&section!=="overview"&&section!=="trips"&&section!=="finance"&&section!=="inventory"&&<div className="page-heading"><div><h1>{titles[section]}</h1></div></div>}
 <div className="toast-stack" aria-live="polite">{loadError&&<p role="alert" className="notice error">{loadError}</p>}{error&&<p role="alert" className="notice error">{error}</p>}{notice&&<p role="status" className="notice">{notice}</p>}</div>
 {loading?<p role="status">Loading workspace data…</p>:<>{section==="overview"&&<Overview/>}{section==="trips"&&(tripId?<TripDetail tripId={tripId}/>:<Trips/>)}{section==="finance"&&<Finance/>}{section==="inventory"&&<Inventory/>}</>}</>;
}
