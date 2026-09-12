"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronRight, Compass, RotateCcw, ChevronDown } from "lucide-react";
import { Sidebar, navigation } from "@/components/sidebar";
import { UserMenu } from "@/components/user-menu";
import { useWorkspace } from "./context";
export function AppShell({children}:{children:ReactNode}) {
  const {prototype,basePath,state,reset}=useWorkspace();
  const path=usePathname(); const [notifications,setNotifications]=useState(false);
  const page=navigation.find(n=>basePath+n.slug===path)?.label ?? "Pengaturan";
  return <div className="rimbaloka-app"><a href="#main-content" className="skip-link">Langsung ke konten</a><Sidebar/><div className="app-main"><header className="app-topbar"><div className="breadcrumbs"><span>Workspace</span><ChevronRight size={13}/><strong>{page}</strong></div><div className="topbar-actions">{prototype&&<span className="prototype-label"><Compass size={13}/> Prototipe interaktif</span>}<div className="notification-wrap"><button className="icon-button" aria-label="Lihat notifikasi" aria-expanded={notifications} onClick={()=>setNotifications(!notifications)}><Bell size={19}/><i/></button>{notifications&&<div className="notification-popover"><strong>Perlu perhatian</strong><p>{state.participants.filter(p=>!p.reviewed).length} tagihan perlu ditinjau.</p><Link onClick={()=>setNotifications(false)} href={`${basePath}/participants`}>Buka peserta <ChevronRight size={14}/></Link></div>}</div><div className="topbar-divider"/>{prototype?<Link className="demo-account" href={`${basePath}/settings`}><span className="avatar">RA</span><div><strong>Rimbaloka Admin</strong><small>Administrator</small></div><ChevronDown size={14}/></Link>:<UserMenu/>}</div></header>
    <main id="main-content" className="app-content">{children}</main><footer className="app-footer"><span>© 2026 Rimbaloka Trip <span className="footer-dot">·</span> Every journey, well managed.</span>{prototype&&<button onClick={reset}><RotateCcw size={13}/> Reset data simulasi</button>}</footer></div></div>;
}
