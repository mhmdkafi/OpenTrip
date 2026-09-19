"use client";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { LogOut, Settings, ChevronRight } from "lucide-react";
import { useState } from "react";
import { ProfileDialog, type AdminProfile } from "./tripdash/profile-dialog";
import { requestJson } from "./tripdash/context";

function Identity({profile,business,onClick}:{profile:AdminProfile;business:string;onClick:()=>void}) {
  return <button className="account-identity profile-trigger" aria-label="Buka profil administrator" title="Profil administrator" onClick={onClick}><span className="avatar">{(profile.name||"Admin").split(" ").slice(0,2).map(n=>n[0]).join("").toUpperCase()}</span><div><strong>{profile.name||"Administrator"}</strong><small>{business}</small></div><ChevronRight size={15}/></button>;
}
export function UserMenu() {
  const {session,logout,refresh}=useAuth();
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const profile={name:session?.user.name||"",phone:session?.user.phone||"",email:session?.user.email||""};
  return <div className="sidebar-account"><Identity profile={profile} business={session?.tenant?.name||"Rimbaloka Trip"} onClick={()=>setOpen(true)}/><div className="account-actions"><Link href="/dashboard/settings" title="Pengaturan akun" className="account-action"><Settings size={16}/><span>Pengaturan akun</span></Link><button className="account-action" title="Logout" disabled={busy} onClick={async()=>{setBusy(true);setError("");try{await logout();}catch(e){setError(e instanceof Error?e.message:"Logout gagal.");}finally{setBusy(false);}}}><LogOut size={16}/><span>{busy?"Keluar…":"Logout"}</span></button></div>{error&&<p role="alert" className="account-error">{error}</p>}{open&&<ProfileDialog profile={profile} business={session?.tenant?.name||"Rimbaloka Trip"} onClose={()=>setOpen(false)} onSave={async next=>{await requestJson("/api/auth/profile",{name:next.name,phone:next.phone});await refresh();}}/>}</div>;
}
