"use client";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
import { Presence } from "./presence";
export function AppShell({ children }: { children: ReactNode }) {
  return <div className="rimbaloka-app"><Presence/><a href="#main-content" className="skip-link">Skip to content</a><Sidebar/><div className="app-main"><main id="main-content" className="app-content">{children}</main></div></div>;
}
