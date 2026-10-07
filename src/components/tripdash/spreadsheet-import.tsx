"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, ArrowRight } from "lucide-react";
import { useWorkspace, requestJson } from "./context";
import { Field, Form, Submit, text } from "./ui";

export function SpreadsheetImport({ initialTripId = "" }: { initialTripId?: string }) {
  const { state, revision, replace, basePath } = useWorkspace();
  const router = useRouter();
  const source = state.sources.find(s => s.tripId === initialTripId);
  const [result, setResult] = useState<{ tripId: string; stats: { added: number; unchanged: number; review: number } } | null>(null);
  return <div className="link-import">
    {initialTripId && <p className="empty-note">Paste a spreadsheet link to update this trip&apos;s participants.</p>}
    <Form onSave={async data => {
      const spreadsheetUrl = text(data,"url");
      const departureDate = initialTripId ? undefined : text(data,"departureDate");
      const response = await requestJson("/api/sync/import", { spreadsheetUrl, revision, ...(initialTripId ? {tripId:initialTripId} : {}), ...(departureDate ? {departureDate} : {}) });
      replace(response);
      if (!initialTripId) { router.push(`${basePath}/trips/${response.tripId}`); return; }
      setResult(response);
    }}>
      <Field label="Google Spreadsheet link" name="url" type="url" required placeholder="https://docs.google.com/spreadsheets/d/…" defaultValue={source ? `https://docs.google.com/spreadsheets/d/${source.spreadsheetId}/edit#gid=${source.sheetId}` : ""}/>
      {!initialTripId && <Field label="Departure date" name="departureDate" type="date" required/>}
      <Submit><FileSpreadsheet size={16}/> Import from link</Submit>
    </Form>
    {result && <div className="import-result" role="status"><strong>Import complete</strong><p>{result.stats.added} new responses · {result.stats.unchanged} already saved · {result.stats.review} need review</p>{result && state.trips.find(t=>t.id===result.tripId)?.departureDate===""&&<p className="inline-warning">The source has no departure date. Add it via Edit trip or add a departure date column to the spreadsheet.</p>}<Link className="text-link" href={`${basePath}/trips/${result.tripId}`}>Open trip <ArrowRight size={15}/></Link></div>}
    {(result ? state.sources.find(s=>s.tripId===result.tripId) : source)?.review.map((note,i)=><p className="inline-warning" key={i}>{note}</p>)}
  </div>;
}
