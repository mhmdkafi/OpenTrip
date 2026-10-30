"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, CircleAlert, MessageCircle, PencilLine, RotateCcw } from "lucide-react";
import { formatRupiah } from "@/lib/money";
import { DEFAULT_TEMPLATES, excessFor, messageFor, reminderQueue, renderMessage, TEMPLATE_FIELDS, templateOf, waLink, type MessageKind, type ReminderEntry } from "@/lib/workspace/reminders";
import { paidFor, type Workspace } from "@/lib/workspace/types";
import { useWorkspace } from "./context";
import { Modal } from "./ui";

const KIND_LABEL: Record<MessageKind, string> = { reminder: "Balance reminder", overpaid: "Overpayment notice" };
const sentLabel = (at: string) => new Date(at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

/** Day-before-departure queue: everyone who still owes or overpaid, each with a ready WhatsApp message. */
export function ReminderPanel({ tripId }: { tripId: string }) {
  const { state, mutate } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const queue = useMemo(() => reminderQueue(state, tripId), [state, tripId]);
  const sent = queue.filter(e => e.person.contacted?.[e.kind]).length;
  return <section className="ov-card wa-panel" id="reminders" aria-label="WhatsApp reminders">
    <header className="wa-head">
      <div><h2><MessageCircle size={18} aria-hidden="true"/> WhatsApp reminders</h2><p>Departs tomorrow · {queue.length ? `${sent} of ${queue.length} messaged` : "everyone has paid exactly their bill"}</p></div>
      <button type="button" className="td-secondary" onClick={() => setEditing(true)}><PencilLine size={15}/> Edit templates</button>
    </header>
    {queue.length > 0 && <ul className="wa-list">{queue.map(entry => <ReminderRow key={entry.person.id} entry={entry} state={state} onSent={() => void mutate({ action: "message.sent", participantId: entry.person.id, kind: entry.kind })}/>)}</ul>}
    {editing && <TemplatesModal onClose={() => setEditing(false)}/>}
  </section>;
}

function ReminderRow({ entry, state, onSent }: { entry: ReminderEntry; state: Workspace; onSent: () => void }) {
  const { person, kind, amount, phone, proofPending } = entry;
  const sentAt = person.contacted?.[kind];
  return <li className={`wa-row${sentAt ? " is-sent" : ""}`}>
    <div className="wa-who"><strong>{person.name}</strong><small>{phone ? `+${phone}` : "No valid WhatsApp number"}</small></div>
    {/* Bill and paid side by side, then what the message is about. */}
    <dl className="wa-money">
      <div><dt>Bill</dt><dd>{formatRupiah(person.charge)}</dd></div>
      <div><dt>Paid</dt><dd>{formatRupiah(paidFor(state, person.id) + excessFor(state, person.id))}</dd></div>
      <div><dt>{kind === "reminder" ? "Balance" : "Overpaid"}</dt><dd><span className={`wa-badge is-${kind}`}>{formatRupiah(amount)}</span></dd></div>
      {proofPending && <small className="wa-note"><CircleAlert size={13} aria-hidden="true"/> Proof awaiting review</small>}
    </dl>
    <div className="wa-action">
      {sentAt && <small className="wa-sent"><Check size={13} aria-hidden="true"/> Sent {sentLabel(sentAt)}</small>}
      {phone
        ? <a className={sentAt ? "td-secondary wa-send" : "td-button wa-send"} href={waLink(phone, messageFor(state, entry))} target="_blank" rel="noopener noreferrer" onClick={onSent} aria-label={`${sentAt ? "Send again" : "Send"} ${KIND_LABEL[kind].toLowerCase()} to ${person.name} on WhatsApp`}><MessageCircle size={15}/> {sentAt ? "Send again" : "Send WhatsApp"}</a>
        : <span className="wa-missing">Add a number in the form response</span>}
    </div>
  </li>;
}

/** Edits both message templates with clickable placeholders and a live preview. */
export function TemplatesModal({ onClose }: { onClose: () => void }) {
  const { state, mutate, busy } = useWorkspace();
  const [drafts, setDrafts] = useState<Record<MessageKind, string>>(() => ({ reminder: templateOf(state, "reminder"), overpaid: templateOf(state, "overpaid") }));
  const [kind, setKind] = useState<MessageKind>("reminder");
  const area = useRef<HTMLTextAreaElement>(null);
  const sample = { name: "Budi", trip: "Mt Artapela Vol 11", date: "Sabtu, 7 November 2026", meeting_point: "St. Bandung", bill: formatRupiah(190000), paid: kind === "reminder" ? formatRupiah(100000) : formatRupiah(200000), balance: formatRupiah(kind === "reminder" ? 90000 : 0), excess: formatRupiah(kind === "reminder" ? 0 : 10000), bank: "BCA 5151040000 a.n. Amirul Andas" };
  function insert(field: string) {
    const el = area.current, token = `{${field}}`;
    const text = drafts[kind], start = el?.selectionStart ?? text.length, end = el?.selectionEnd ?? text.length;
    setDrafts({ ...drafts, [kind]: text.slice(0, start) + token + text.slice(end) });
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + token.length, start + token.length); });
  }
  async function save() { await mutate({ action: "message.templates", reminder: drafts.reminder, overpaid: drafts.overpaid }); onClose(); }
  return <Modal title="WhatsApp templates" onClose={onClose} wide>
    <div className="wa-tpl">
      <div className="ov-toolbar" role="group" aria-label="Template">{(["reminder", "overpaid"] as const).map(k => <button key={k} type="button" aria-pressed={kind === k} className={kind === k ? "is-active" : ""} onClick={() => setKind(k)}>{KIND_LABEL[k]}</button>)}</div>
      <div className="wa-tpl-grid">
        <div className="wa-tpl-edit">
          <label className="form-label"><span>Message</span><textarea ref={area} className="td-input wa-textarea" rows={11} maxLength={2000} value={drafts[kind]} onChange={e => setDrafts({ ...drafts, [kind]: e.target.value })}/></label>
          <div className="wa-fields"><span>Insert</span>{TEMPLATE_FIELDS.map(f => <button key={f} type="button" onClick={() => insert(f)}>{`{${f}}`}</button>)}</div>
          <p className="wa-tip">Use *text* for bold. Emoji are left out because WhatsApp links can’t carry them.</p>
          <button type="button" className="filter-reset" onClick={() => setDrafts({ ...drafts, [kind]: DEFAULT_TEMPLATES[kind] })}><RotateCcw size={14}/> Restore default</button>
        </div>
        <div className="wa-preview"><span>Preview</span><p>{renderMessage(drafts[kind], sample)}</p></div>
      </div>
      <div className="editor-form-actions"><button type="button" className="td-secondary" onClick={onClose}>Cancel</button><button type="button" className="td-button" disabled={busy || !drafts.reminder.trim() || !drafts.overpaid.trim()} onClick={() => void save()}>Save templates</button></div>
    </div>
  </Modal>;
}

/** Overview banner: trips departing tomorrow that still have people to message. */
export function ReminderBanner({ trips, basePath }: { trips: { id: string; title: string; pending: number }[]; basePath: string }) {
  if (!trips.length) return null;
  const total = trips.reduce((n, t) => n + t.pending, 0);
  return <section className="ov-card wa-banner" aria-label="Reminders due today">
    <MessageCircle size={20} aria-hidden="true"/>
    <div><strong>{total} WhatsApp {total === 1 ? "message" : "messages"} to send today</strong><p>{trips.map((t, i) => <span key={t.id}>{i > 0 && " · "}<Link href={`${basePath}/trips/${t.id}#reminders`}>{t.title}</Link> ({t.pending})</span>)} depart{trips.length === 1 ? "s" : ""} tomorrow</p></div>
  </section>;
}
