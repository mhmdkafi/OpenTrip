"use client";
import { useEffect, useState } from "react";
import { requestJson } from "./context";
import { Panel } from "./ui";
type Schedule={enabled:boolean;interval_minutes:number;last_run_at?:string;last_error?:string};
export function SyncSchedule() {
  const [schedule,setSchedule]=useState<Schedule|null>(null);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  useEffect(()=>{let active=true;requestJson("/api/sync/schedule").then(data=>{if(active)setSchedule(data);}).catch(()=>{if(active)setMessage("Schedule unavailable. Run database migration 0003.");});return()=>{active=false;};},[]);
  return <Panel title="Automatic sync">
    <p className="empty-note">Refresh imported spreadsheet sources. Local edits and transactions are kept.</p>
    {schedule && <form onSubmit={async event=>{event.preventDefault();setBusy(true);try{await requestJson("/api/sync/schedule",{enabled:schedule.enabled,interval_minutes:schedule.interval_minutes});setMessage("Schedule saved.");}catch(error){setMessage(error instanceof Error?error.message:"Could not save.");}finally{setBusy(false);}}}>
      <label className="check-label"><input type="checkbox" checked={schedule.enabled} onChange={e=>setSchedule({...schedule,enabled:e.target.checked})}/> Enable auto-import</label>
      <label className="form-label">Interval (minutes)<input className="td-input" type="number" min={15} max={10080} required value={schedule.interval_minutes} onChange={e=>setSchedule({...schedule,interval_minutes:Number(e.target.value)})}/></label>
      <button className="td-button mt-4" disabled={busy}>{busy?"Saving…":"Save schedule"}</button>
      {schedule.last_run_at && <p>Last run: {new Date(schedule.last_run_at).toLocaleString("en-GB")}</p>}
      {schedule.last_error && <p role="alert">{schedule.last_error}</p>}
    </form>}
    {message && <p role="status">{message}</p>}
  </Panel>;
}
