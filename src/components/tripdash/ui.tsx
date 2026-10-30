"use client";
import { Children, Fragment, isValidElement, useEffect, useId, useRef, useState, type ReactNode, type FormEvent, type InputHTMLAttributes } from "react";
import { X } from "lucide-react";
import { useWorkspace } from "./context";
import { Dropdown, type DropdownOption } from "./dropdown";
export function Field({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) { return <label className="form-label"><span>{label}</span><input className="td-input" {...props} /></label>; }
// <option> children are read into Dropdown options, so every select shares the styled listbox.
const textOf = (node: ReactNode): string => node == null || typeof node === "boolean" ? "" : typeof node === "string" || typeof node === "number" ? String(node) : Array.isArray(node) ? node.map(textOf).join("") : isValidElement(node) ? textOf((node.props as { children?: ReactNode }).children) : "";
function optionsOf(children: ReactNode): DropdownOption[] {
  const options: DropdownOption[] = [];
  Children.forEach(children, child => {
    if (!isValidElement(child)) return;
    const props = child.props as { value?: string; children?: ReactNode };
    if (child.type === Fragment) { options.push(...optionsOf(props.children)); return; }
    const label = textOf(props.children);
    options.push({ value: props.value ?? label, label });
  });
  return options;
}
export function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) { return <div className="form-label"><span>{label}</span><Dropdown label={label} value={value} options={optionsOf(children)} onChange={onChange}/></div>; }
/** Dropdown for uncontrolled forms: the choice is submitted through a hidden input named `name`. */
export function FormSelect({ label, name, defaultValue, options }: { label: string; name: string; defaultValue?: string; options: readonly DropdownOption[] }) {
  const [value, setValue] = useState(defaultValue ?? options[0]?.value ?? "");
  return <div className="form-label"><span>{label}</span><Dropdown label={label} value={value} options={options} onChange={setValue}/><input type="hidden" name={name} value={value}/></div>;
}
export function Submit({ children = "Save" }: { children?: ReactNode }) { const { busy } = useWorkspace(); return <button className="td-button" disabled={busy} type="submit">{busy ? "Processing…" : children}</button>; }
export function Form({ onSave, children }: { onSave: (data: FormData) => Promise<void>; children: ReactNode }) {
  const { run, busy } = useWorkspace();
  return <form onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const data = new FormData(e.currentTarget); void run(() => onSave(data)); }}><fieldset disabled={busy} className="grid gap-4">{children}</fieldset></form>;
}
export const text = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
export const number = (data: FormData, key: string) => Number(data.get(key));
export function TripSelect({ value, onChange, all = "All trips", activeOnly = false }: { value: string; onChange: (value: string) => void; all?: string; activeOnly?: boolean }) { const { state } = useWorkspace(); const trips = activeOnly ? state.trips.filter(t => t.status === "active") : state.trips; return <Select label="Trip" value={value} onChange={onChange}><option value="">{all}</option>{trips.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</Select>; }
export function Modal({title,children,onClose,wide=false}:{title:string;children:ReactNode;onClose:()=>void;wide?:boolean}) {
  const ref=useRef<HTMLDialogElement>(null); const headingId=useId();
  const {error}=useWorkspace();
  useEffect(()=>{const dialog=ref.current;dialog?.showModal();return()=>dialog?.close();},[]);
  return <dialog ref={ref} aria-labelledby={headingId} className={`td-modal ${wide?"wide":""}`} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><div className="modal-inner"><div className="modal-heading"><h2 id={headingId}>{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={18}/></button></div>{error&&<p role="alert" className="notice error">{error}</p>}{children}</div></dialog>;
}
