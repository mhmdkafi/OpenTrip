"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth/context";
export function TenantSwitcher() {
  const {session,switchTenant}=useAuth();
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  if(!session)return null;
  return <div className="td-panel"><label className="form-label">Workspace aktif<select className="td-input" disabled={busy} value={session.tenant.id} onChange={async e=>{setBusy(true);setError("");try{const result=await switchTenant(e.target.value);if(!result.success)setError(result.error||"Gagal berpindah workspace.");}finally{setBusy(false);}}}>{session.tenants.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>{error&&<p role="alert">{error}</p>}</div>;
}
