import { AttendanceDocument, AttendanceParticipant, unpaidParticipants } from "./types";

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[character] ?? character);
const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export function renderUnpaidAttachment(document: AttendanceDocument, participants: AttendanceParticipant[]) {
  const rows = unpaidParticipants(participants).map((participant) => {
    const charge = participant.charge ?? 0;
    const paid = participant.paid ?? 0;
    const remaining = Math.max(0, charge - paid);
    const shared = participant.sharedBilling ? "<div class=\"badge\">Tagihan bersama</div>" : "";
    return `<tr><td>${escapeHtml(participant.bookerName || participant.name)}${shared}</td><td>${escapeHtml(participant.meetingPoint)}</td><td>${money(charge)}</td><td>${money(paid)}</td><td>${money(remaining)}</td><td>${escapeHtml(participant.contact)}</td></tr>`;
  }).join("");

  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Lampiran Sisa Tagihan</title><style>@page{size:A4 portrait;margin:16mm 14mm 18mm}body{font-family:Arial,sans-serif;font-size:9pt;color:#111}h1{font-size:15pt;margin:0 0 10px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #111;padding:5px;vertical-align:top;overflow-wrap:anywhere}th{background:#eee;text-align:center}.badge{font-size:8pt;font-weight:bold;margin-top:3px}</style></head><body><h1>${escapeHtml(document.title)} · Lampiran Sisa Tagihan</h1><table><thead><tr><th>NAMA / PEMESAN</th><th>MEPO</th><th>TAGIHAN</th><th>TERBAYAR</th><th>SISA</th><th>KONTAK</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
}
