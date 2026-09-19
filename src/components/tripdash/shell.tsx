"use client";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
export function AppShell({ children }: { children: ReactNode }) {
  return <div className="rimbaloka-app"><a href="#main-content" className="skip-link">Langsung ke konten</a><Sidebar/><div className="app-main"><main id="main-content" className="app-content">{children}</main><footer className="app-footer"><span>{"Rimbaloka Trip · TripDash"}</span></footer></div></div>;
}
