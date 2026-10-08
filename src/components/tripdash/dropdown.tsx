"use client";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";

export type DropdownOption = { value: string; label: string; icon?: LucideIcon };

// Styled listbox replacement for <select>; supports mouse, Arrow keys, Enter/Space, Escape, and Tab.
export function Dropdown({ value, options, onChange, label, variant = "field" }: { value: string; options: readonly DropdownOption[]; onChange: (value: string) => void; label: string; variant?: "field" | "inline" }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();
  const selected = options.find(o => o.value === value) ?? options[0];
  const SelectedIcon = selected.icon;

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    list.current?.focus();
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  function show() { setActive(Math.max(0, options.findIndex(o => o.value === value))); setOpen(true); }
  function choose(index: number) { onChange(options[index].value); setOpen(false); root.current?.querySelector("button")?.focus(); }
  function onListKey(event: KeyboardEvent) {
    if (event.key === "ArrowDown") { event.preventDefault(); setActive(i => (i + 1) % options.length); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive(i => (i - 1 + options.length) % options.length); }
    else if (event.key === "Home") { event.preventDefault(); setActive(0); }
    else if (event.key === "End") { event.preventDefault(); setActive(options.length - 1); }
    else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(active); }
    else if (event.key === "Escape") { event.preventDefault(); setOpen(false); root.current?.querySelector("button")?.focus(); }
    else if (event.key === "Tab") setOpen(false);
  }

  return <div className={`dd ${variant === "inline" ? "dd-inline" : ""}`} ref={root}>
    <button type="button" className="dd-trigger" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} aria-label={`${label}: ${selected.label}`}
      onClick={() => open ? setOpen(false) : show()} onKeyDown={e => { if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); show(); } }}>
      {SelectedIcon && variant === "field" && <SelectedIcon size={16} className="dd-icon"/>}<span>{selected.label}</span><ChevronDown size={16} className="dd-chevron"/>
    </button>
    {open && <ul ref={list} id={listId} role="listbox" tabIndex={-1} aria-label={label} aria-activedescendant={`${listId}-${active}`} className="dd-menu" onKeyDown={onListKey}>
      {options.map((option, index) => { const Icon = option.icon; const isSelected = option.value === value; return <li key={option.value} id={`${listId}-${index}`} role="option" aria-selected={isSelected}
        className={`dd-option ${index === active ? "is-active" : ""} ${isSelected ? "is-selected" : ""}`} onPointerEnter={() => setActive(index)} onClick={() => choose(index)}>
        {Icon && <Icon size={16} className="dd-icon"/>}<span>{option.label}</span>{isSelected && <Check size={16} className="dd-check"/>}
      </li>; })}
    </ul>}
  </div>;
}
