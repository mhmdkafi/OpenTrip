"use client";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
import { useWorkspace } from "./context";
export function AppShell({ children }: { children: ReactNode }) {
  const { prototype, reset } = useWorkspace();
  return <div className="rimbaloka-app"><a href="#main-content" className="skip-link">Langsung ke konten</a><Sidebar/><div className="app-main"><main id="main-content" className="app-content">{children}</main><footer className="app-footer"><span>{prototype ? "Prototipe · data simulasi tersimpan di browser ini" : "Rimbaloka Trip · TripDash"}</span>{prototype && <button onClick={reset}>Reset data simulasi</button>}</footer></div></div>;
}
