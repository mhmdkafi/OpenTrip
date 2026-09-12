"use client";
import { useEffect, useId, useRef, type ReactNode, type FormEvent, type InputHTMLAttributes } from "react";
import { X } from "lucide-react";
import { useWorkspace } from "./context";
export function Panel({ title, children }: { title: string; children: ReactNode }) { return <section className="td-panel space-y-4"><h2 className="text-lg font-semibold">{title}</h2>{children}</section>; }
export function Field({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) { return <label className="form-label"><span>{label}</span><input className="td-input" {...props} /></label>; }
export function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) { return <label className="form-label"><span>{label}</span><select className="td-input" value={value} onChange={e => onChange(e.target.value)}>{children}</select></label>; }
export function Submit({ children = "Simpan" }: { children?: ReactNode }) { const { busy } = useWorkspace(); return <button className="td-button" disabled={busy} type="submit">{busy ? "Memproses…" : children}</button>; }
export function Form({ onSave, children }: { onSave: (data: FormData) => Promise<void>; children: ReactNode }) {
  const { run, busy } = useWorkspace();
  return <form onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const data = new FormData(e.currentTarget); void run(() => onSave(data)); }}><fieldset disabled={busy} className="grid gap-4">{children}</fieldset></form>;
}
export const text = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
export const number = (data: FormData, key: string) => Number(data.get(key));
export function TripSelect({ value, onChange, all = "Semua trip" }: { value: string; onChange: (value: string) => void; all?: string }) { const { state } = useWorkspace(); return <Select label="Trip" value={value} onChange={onChange}><option value="">{all}</option>{state.trips.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</Select>; }
export function Modal({title,children,onClose,wide=false}:{title:string;children:ReactNode;onClose:()=>void;wide?:boolean}) {
  const ref=useRef<HTMLDialogElement>(null); const headingId=useId();
  const {error}=useWorkspace();
  useEffect(()=>{const dialog=ref.current;dialog?.showModal();return()=>dialog?.close();},[]);
  return <dialog ref={ref} aria-labelledby={headingId} className={`td-modal ${wide?"wide":""}`} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><div className="modal-inner"><div className="modal-heading"><div><span className="eyebrow">RIMBALOKA WORKSPACE</span><h2 id={headingId}>{title}</h2></div><button type="button" className="icon-button" aria-label="Tutup dialog" onClick={onClose}><X size={18}/></button></div>{error&&<p role="alert" className="notice error">{error}</p>}{children}</div></dialog>;
}
