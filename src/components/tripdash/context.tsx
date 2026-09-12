"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { emptyWorkspace, type Workspace } from "@/lib/workspace/types";
import { applyCommand, commandSchema, type Command } from "@/lib/workspace/commands";
import { prototypeWorkspace } from "@/lib/workspace/prototype";
export async function requestJson(url: string, body?: unknown, method = "POST") {
  const response = await fetch(url, body === undefined ? { cache: "no-store", method: "GET" } : { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Permintaan gagal.");
  return result;
}
type Snapshot = { state: Workspace; revision: number };
type Context = Snapshot & { prototype: boolean; basePath: string; busy: boolean; loading: boolean; error: string; notice: string; reload: () => Promise<void>; reset: () => void; run: (fn: () => Promise<void>) => Promise<void>; mutate: (command: Command) => Promise<void>; replace: (data: Snapshot) => void };
const Store = createContext<Context | null>(null);
const storageKey = "rimbaloka-prototype-v1";
export function WorkspaceProvider({ children, prototype = false }: { children: ReactNode; prototype?: boolean }) {
  const [data, setData] = useState<Snapshot>(() => ({ state: prototype ? prototypeWorkspace() : emptyWorkspace(), revision: 0 }));
  const [loading, setLoading] = useState(!prototype);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const locked = useRef(false);
  const pending = useRef<{ payload: string; id: string } | null>(null);
  function replace(next: Snapshot) {
    if (prototype) { try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Demo remains usable without storage. */ } }
    setData({ state: next.state, revision: next.revision });
  }
  const reload = useCallback(async () => {
    try {
      if (prototype) { const saved = localStorage.getItem(storageKey); if (saved) setData(JSON.parse(saved)); }
      else setData(await requestJson("/api/workspace"));
      setError("");
    } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }, [prototype]);
  useEffect(() => {
    let active = true;
    if (prototype) {
      Promise.resolve().then(() => { try { const saved = localStorage.getItem(storageKey); if (active && saved) { const next = JSON.parse(saved); if (Array.isArray(next.state?.trips)) setData(next); } } catch { /* Invalid demo cache is ignored. */ } });
    } else requestJson("/api/workspace").then(result => { if (active) { setData(result); setError(""); } }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [prototype]);
  async function run(fn: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(""); setNotice("");
    try { await fn(); setNotice(prototype ? "Tersimpan di prototipe. Data bisnis asli tidak berubah." : "Perubahan berhasil disimpan."); }
    catch (e) { setError((e as Error).message); }
    finally { locked.current = false; setBusy(false); }
  }
  async function mutate(command: Command) {
    const payload = JSON.stringify(command);
    if (pending.current?.payload !== payload) pending.current = { payload, id: crypto.randomUUID() };
    if (prototype) replace({ state: applyCommand(data.state, commandSchema.parse(command), "demo", pending.current.id), revision: data.revision + 1 });
    else replace(await requestJson("/api/workspace", { revision: data.revision, requestId: pending.current.id, command }));
    pending.current = null;
  }
  function reset() { replace({ state: prototypeWorkspace(), revision: 0 }); setError(""); setNotice("Data simulasi dikembalikan ke kondisi awal."); }
  return <Store.Provider value={{ ...data, prototype, basePath: prototype ? "/prototype" : "/dashboard", loading, busy, error, notice, reload, reset, run, mutate, replace }}>{children}</Store.Provider>;
}
export function useWorkspace() { const store = useContext(Store); if (!store) throw new Error("Workspace provider missing"); return store; }
