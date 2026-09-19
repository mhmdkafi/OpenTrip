"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, Wallet, Package, Users, Menu, X, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "./tripdash/context";
import { UserMenu } from "./user-menu";
export const navigation = [
  { slug: "", label: "Overview", icon: LayoutDashboard },
  { slug: "/trips", label: "Trip Schedule", icon: CalendarDays },
  { slug: "/finance", label: "Cashflow", icon: Wallet },
  { slug: "/inventory", label: "Inventory", icon: Package },
  { slug: "/users", label: "Pengguna", icon: Users },
];
export function Sidebar() {
  const pathname = usePathname();
  const { basePath } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const aside = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    aside.current?.querySelector<HTMLElement>("a")?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (aside.current?.querySelector("dialog[open]")) return;
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
      if (event.key !== "Tab") return;
      const controls = Array.from(aside.current?.querySelectorAll<HTMLElement>("a,button") ?? []).filter(el => el.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener("keydown", keyboard);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", keyboard); };
  }, [open]);
  return <>
    <button ref={trigger} aria-label={open ? "Tutup navigasi" : "Buka navigasi"} aria-expanded={open} aria-controls="workspace-navigation" onClick={() => setOpen(!open)} className="mobile-menu">{open ? <X size={20}/> : <Menu size={20}/>}</button>
    <aside ref={aside} id="workspace-navigation" className={`forest-sidebar ${open ? "is-open" : ""} ${collapsed ? "is-collapsed" : ""}`}>
      <Link href={basePath} aria-label="TripDash — Overview" onClick={() => setOpen(false)} className="brand-lockup"><Image src="/brand/rimbaloka-logo.jpeg" alt="Logo Rimbaloka Trip" width={43} height={43}/><div><strong>TripDash<span>.</span></strong><small>Rimbaloka Trip</small></div></Link>
      <nav aria-label="Navigasi utama">{navigation.map(item => {
        const Icon = item.icon;
        const active = item.slug ? pathname.startsWith(basePath + item.slug) : pathname === basePath;
        return <Link key={item.slug} href={basePath + item.slug} title={item.label} aria-label={item.label} onClick={() => setOpen(false)} className={`forest-nav-link ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}><Icon size={19} aria-hidden="true"/><span>{item.label}</span></Link>;
      })}</nav>
      <div className="sidebar-bottom"><button className="sidebar-collapse sidebar-edge-toggle" aria-label={collapsed ? "Perluas navigasi" : "Ringkas navigasi"} aria-expanded={!collapsed} title={collapsed ? "Perluas navigasi" : "Ringkas navigasi"} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <PanelLeftOpen size={19}/> : <PanelLeftClose size={19}/>}</button><div className="sidebar-admin"><UserMenu/></div></div>
    </aside>
    {open && <button aria-label="Tutup menu navigasi" className="sidebar-scrim" onClick={() => setOpen(false)}/>}
  </>;
}
