"use client";
import { useState } from "react";
import Link from "next/link";
import { FileSpreadsheet, ArrowRight } from "lucide-react";
import { useWorkspace, requestJson } from "./context";
import { Field, Form, Submit, text } from "./ui";

import { importSpreadsheet } from "@/lib/workspace/auto-import";

export function SpreadsheetImport({ initialTripId = "" }: { initialTripId?: string }) {
  const { state, revision, replace, prototype, basePath } = useWorkspace();
  const source = state.sources.find(s => s.tripId === initialTripId);
  const [result, setResult] = useState<{ tripId: string; stats: { added: number; unchanged: number; review: number } } | null>(null);
  return <div className="link-import">
    <p className="empty-note">{initialTripId ? "Tempel tautan spreadsheet untuk memperbarui peserta trip ini." : "Tempel tautan spreadsheet pendaftaran. Trip dan daftar peserta dibuat dari sumber tersebut."} Header dan kolom dikenali otomatis.</p>
    {prototype && <p className="notice">Spreadsheet akan dibaca langsung. Hasil impor tersimpan di browser ini. Gunakan tautan dengan akses Pelihat.</p>}
    <Form onSave={async data => {
      const spreadsheetUrl = text(data,"url");
      let response;
      if (prototype) {
        const {metadata,sheet,values}=await requestJson("/api/sync/public",{spreadsheetUrl});
        response = {...importSpreadsheet(state,metadata,sheet,values,"demo",initialTripId||undefined),revision:revision+1};
      } else response = await requestJson("/api/sync/import", { spreadsheetUrl, revision, ...(initialTripId ? {tripId:initialTripId} : {}) });
      replace(response); setResult(response);
    }}>
      <Field label="Tautan Google Spreadsheet" name="url" type="url" required placeholder="https://docs.google.com/spreadsheets/d/…" defaultValue={source ? `https://docs.google.com/spreadsheets/d/${source.spreadsheetId}/edit#gid=${source.sheetId}` : ""}/>
      <Submit><FileSpreadsheet size={16}/> Impor dari tautan</Submit>
    </Form>
    {result && <div className="import-result" role="status"><strong>Impor selesai</strong><p>{result.stats.added} respons baru · {result.stats.unchanged} sudah tersimpan · {result.stats.review} perlu diperiksa</p>{result && state.trips.find(t=>t.id===result.tripId)?.departureDate===""&&<p className="inline-warning">Tanggal keberangkatan tidak tercantum di sumber. Lengkapi melalui Edit trip atau tambahkan kolom Tanggal keberangkatan di spreadsheet.</p>}<Link className="text-link" href={`${basePath}/trips/${result.tripId}`}>Buka perjalanan <ArrowRight size={15}/></Link></div>}
    {(result ? state.sources.find(s=>s.tripId===result.tripId) : source)?.review.map((note,i)=><p className="inline-warning" key={i}>{note}</p>)}
  </div>;
}
