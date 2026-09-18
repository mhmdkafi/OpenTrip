"use client";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { LogIn, LogOut, Settings, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { ProfileDialog, type AdminProfile } from "./tripdash/profile-dialog";
import { requestJson } from "./tripdash/context";

const demoProfile: AdminProfile={name:"Admin Rimbaloka",email:"admin@rimbaloka.example",phone:""};
export function UserMenu({prototype=false}:{prototype?:boolean}) {
  return prototype ? <DemoAccount/> : <AuthenticatedAccount/>;
}
function Identity({profile,business,onClick}:{profile:AdminProfile;business:string;onClick:()=>void}) {
  return <button className="account-identity profile-trigger" aria-label="Buka profil administrator" title="Profil administrator" onClick={onClick}><span className="avatar">{(profile.name||"Admin").split(" ").slice(0,2).map(n=>n[0]).join("").toUpperCase()}</span><div><strong>{profile.name||"Administrator"}</strong><small>{business}</small></div><ChevronRight size={15}/></button>;
}
function DemoAccount() {
  const [profile,setProfile]=useState(demoProfile),[open,setOpen]=useState(false);
  useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem("rimbaloka-admin-profile-v1")||"null");if(saved&&typeof saved.name==="string")queueMicrotask(()=>setProfile({...demoProfile,...saved}));}catch{}},[]);
  return <div className="sidebar-account"><Identity profile={profile} business="Mode demo" onClick={()=>setOpen(true)}/><div className="account-actions"><Link href="/login" title="Login akun" className="account-action"><LogIn size={16}/><span>Login akun</span></Link><Link href="/login?demo=ended" title="Keluar demo" className="account-action"><LogOut size={16}/><span>Keluar demo</span></Link></div>{open&&<ProfileDialog profile={profile} business="Rimbaloka Trip" prototype onClose={()=>setOpen(false)} onSave={async next=>{localStorage.setItem("rimbaloka-admin-profile-v1",JSON.stringify(next));setProfile(next);}}/>}</div>;
}
function AuthenticatedAccount() {
  const {session,logout,refresh}=useAuth();
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const profile={name:session?.user.name||"",phone:session?.user.phone||"",email:session?.user.email||""};
  return <div className="sidebar-account"><Identity profile={profile} business={session?.tenant?.name||"Rimbaloka Trip"} onClick={()=>setOpen(true)}/><div className="account-actions"><Link href="/dashboard/settings" title="Pengaturan akun" className="account-action"><Settings size={16}/><span>Pengaturan akun</span></Link><button className="account-action" title="Logout" disabled={busy} onClick={async()=>{setBusy(true);setError("");try{await logout();}catch(e){setError(e instanceof Error?e.message:"Logout gagal.");}finally{setBusy(false);}}}><LogOut size={16}/><span>{busy?"Keluar…":"Logout"}</span></button></div>{error&&<p role="alert" className="account-error">{error}</p>}{open&&<ProfileDialog profile={profile} business={session?.tenant?.name||"Rimbaloka Trip"} prototype={false} onClose={()=>setOpen(false)} onSave={async next=>{await requestJson("/api/auth/profile",{name:next.name,phone:next.phone});await refresh();}}/>}</div>;
}
