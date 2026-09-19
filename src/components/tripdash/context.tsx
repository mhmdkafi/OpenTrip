"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { emptyWorkspace, type Workspace } from "@/lib/workspace/types";
import { type Command } from "@/lib/workspace/commands";
export async function requestJson(url: string, body?: unknown, method = "POST") {
  const response = await fetch(url, body === undefined ? { cache: "no-store", method: "GET" } : { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Permintaan gagal.");
  return result;
}
type Snapshot = { state: Workspace; revision: number };
type Context = Snapshot & { basePath: string; busy: boolean; loading: boolean; error: string; notice: string; reload: () => Promise<void>; run: (fn: () => Promise<void>) => Promise<void>; mutate: (command: Command) => Promise<void>; replace: (data: Snapshot) => void };
const Store = createContext<Context | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode; }) {
  const [data, setData] = useState<Snapshot>(() => ({ state: emptyWorkspace(), revision: 0 }));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const locked = useRef(false);
  const pending = useRef<{ payload: string; id: string } | null>(null);
  function replace(next: Snapshot) {
    
    setData({ state: next.state, revision: next.revision });
  }
  const reload = useCallback(async () => {
    try {
      setData(await requestJson("/api/workspace"));
      setError("");
    } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    requestJson("/api/workspace").then(result => { if (active) { setData(result); setError(""); } }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function run(fn: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(""); setNotice("");
    try { await fn(); setNotice("Perubahan berhasil disimpan."); }
    catch (e) { setError((e as Error).message); }
    finally { locked.current = false; setBusy(false); }
  }
  async function mutate(command: Command) {
    const payload = JSON.stringify(command);
    if (pending.current?.payload !== payload) pending.current = { payload, id: crypto.randomUUID() };
    replace(await requestJson("/api/workspace", { revision: data.revision, requestId: pending.current.id, command }));
    pending.current = null;
  }
  return <Store.Provider value={{ ...data, basePath: "/dashboard", loading, busy, error, notice, reload, run, mutate, replace }}>{children}</Store.Provider>;
}
export function useWorkspace() { const store = useContext(Store); if (!store) throw new Error("Workspace provider missing"); return store; }
