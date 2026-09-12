"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Mountain, Users, ClipboardList, Wallet, Package, Settings, Menu, X, ArrowUpRight, ChevronDown, Leaf } from "lucide-react";
import { useState } from "react";
import { useWorkspace } from "./tripdash/context";
export const navigation = [
  { slug: "", label: "Ringkasan", icon: LayoutDashboard },
  { slug: "/trips", label: "Kelola Trip", icon: Mountain },
  { slug: "/participants", label: "Peserta & Pembayaran", icon: Users },
  { slug: "/attendance", label: "Absensi", icon: ClipboardList },
  { slug: "/finance", label: "Keuangan", icon: Wallet },
  { slug: "/inventory", label: "Inventaris", icon: Package },
];
export function Sidebar() {
  const pathname = usePathname();
  const { basePath, prototype, state } = useWorkspace();
  const [open, setOpen] = useState(false);
  return <>
    <button aria-label={open ? "Tutup navigasi" : "Buka navigasi"} aria-expanded={open} onClick={() => setOpen(!open)} className="mobile-menu">{open ? <X size={21}/> : <Menu size={21}/>}</button>
    <aside className={`forest-sidebar ${open ? "is-open" : ""}`}>
      <Link href={basePath} className="brand-lockup"><Image src="/brand/rimbaloka-logo.jpeg" alt="Logo Rimbaloka Trip" width={47} height={47}/><div><strong>rimbaloka<span>.</span></strong><small>TRIP MANAGEMENT</small></div></Link>
      <div className="workspace-switch"><span className="workspace-avatar">R</span><div><strong>Rimbaloka Trip</strong><small>Ruang kerja bisnis</small></div><ChevronDown size={15}/></div>
      <p className="nav-caption">WORKSPACE</p>
      <nav aria-label="Navigasi utama">{navigation.map(item => { const Icon=item.icon; const active=pathname===basePath+item.slug; return <Link key={item.slug} href={basePath+item.slug} onClick={()=>setOpen(false)} className={`forest-nav-link ${active?"active":""}`} aria-current={active?"page":undefined}><Icon size={19}/><span>{item.label}</span>{item.slug==="/participants"&&state.participants.length>0&&<small className="nav-count">{state.participants.length}</small>}</Link>; })}</nav>
      <div className="sidebar-bottom"><Link href={`${basePath}/settings`} onClick={()=>setOpen(false)} className={`forest-nav-link ${pathname.endsWith('/settings')?"active":""}`}><Settings size={19}/><span>Pengaturan</span></Link><div className="sidebar-note"><Leaf size={21}/><strong>Lebih dekat dengan alam.</strong><p>Lebih mudah mengelola setiap perjalanan.</p><span>BUILT FOR THE OUTDOORS <ArrowUpRight size={13}/></span></div><div className="sidebar-foot"><span className="status-dot"/> {prototype?"Mode prototipe":"TripDash workspace"}<small>v1.0</small></div></div>
    </aside>
    {open&&<button aria-label="Tutup menu navigasi" className="sidebar-scrim" onClick={()=>setOpen(false)}/>}
  </>;
}
