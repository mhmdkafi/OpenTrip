"use client";
import { useEffect, useId, useRef, useState } from "react";
import { HeartPulse } from "lucide-react";

// Heart icon next to a participant with a medical note. Hover, focus or tap shows the note in a small
// popover; it is fixed to the viewport so the scrolling table never clips it.
export function MedicalBadge({ notes }: { notes: string }) {
  const [at, setAt] = useState<{ x: number; y: number; below: boolean } | null>(null);
  const [pinned, setPinned] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  function show() {
    const r = button.current?.getBoundingClientRect();
    if (!r) return;
    const below = r.bottom + 120 < window.innerHeight;
    setAt({ x: Math.min(Math.max(r.left + r.width / 2, 130), window.innerWidth - 130), y: below ? r.bottom + 8 : r.top - 8, below });
  }
  const hide = () => { if (!pinned) setAt(null); };
  useEffect(() => {
    if (!at) return;
    const close = (event: Event) => { if (event.type === "keydown" && (event as KeyboardEvent).key !== "Escape") return; if (event.type === "pointerdown" && button.current?.contains(event.target as Node)) return; setPinned(false); setAt(null); };
    document.addEventListener("pointerdown", close); document.addEventListener("keydown", close); window.addEventListener("scroll", close, true);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", close); window.removeEventListener("scroll", close, true); };
  }, [at]);
  return <>
    <button ref={button} type="button" className="pt-med" aria-label="Medical history" aria-expanded={Boolean(at)} aria-describedby={at ? id : undefined}
      onPointerEnter={e => { if (e.pointerType === "mouse") show(); }} onPointerLeave={e => { if (e.pointerType === "mouse") hide(); }}
      onFocus={show} onBlur={hide} onClick={() => { if (pinned) { setPinned(false); setAt(null); } else { setPinned(true); show(); } }}>
      <HeartPulse size={12} aria-hidden="true"/>
    </button>
    {at && <span id={id} role="tooltip" className={`med-pop${at.below ? "" : " is-above"}`} style={{ left: at.x, top: at.y }}>
      <strong><HeartPulse size={13} aria-hidden="true"/> Medical history</strong>{notes}
    </span>}
  </>;
}
