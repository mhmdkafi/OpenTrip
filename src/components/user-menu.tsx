"use client";
import { useAuth } from "@/lib/auth/context";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { useAutoDismiss } from "./tripdash/use-auto-dismiss";

export function UserMenu() {
  const {logout}=useAuth();
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  useAutoDismiss(error,()=>setError(""));
  return <div className="sidebar-account"><div className="account-actions"><button className="account-action" title="Logout" disabled={busy} onClick={async()=>{setBusy(true);setError("");try{await logout();}catch(e){setError(e instanceof Error?e.message:"Sign-out failed.");}finally{setBusy(false);}}}><LogOut size={16}/><span>{busy?"Signing out…":"Logout"}</span></button></div>{error&&<p role="alert" className="account-error">{error}</p>}</div>;
}
