"use client";
import { useEffect } from "react";

const HEARTBEAT_MS = 60_000;

// Reports activity while a dashboard tab is visible so the Users page can show who is online.
export function Presence() {
  useEffect(() => {
    const ping = () => { if (document.visibilityState === "visible") void fetch("/api/presence", { method: "POST", keepalive: true }).catch(() => {}); };
    ping();
    const timer = setInterval(ping, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", ping);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", ping); };
  }, []);
  return null;
}
