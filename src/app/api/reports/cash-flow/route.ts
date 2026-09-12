import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireWorkspace, loadWorkspace } from "@/lib/workspace/server";
import { periodBounds } from "@/lib/workspace/period";
export async function GET(request: NextRequest) {
  try {
    const auth=await requireWorkspace(); const {state}=await loadWorkspace(auth.tenantId);
    const query=z.object({tripId:z.string().default(""),filterType:z.enum(["all","week","month","year"]).default("month"),referenceDate:z.iso.date().default(new Date().toISOString().slice(0,10))}).parse(Object.fromEntries(request.nextUrl.searchParams));
    const [start,end]=periodBounds(query.filterType,query.referenceDate);
    const entries=state.cash.filter(e=>(!query.tripId||query.tripId==="all"||e.tripId===query.tripId)&&Date.parse(e.occurredAt)>=start&&Date.parse(e.occurredAt)<end);
    const income=entries.filter(e=>e.direction==="in").reduce((s,e)=>s+e.amount,0); const expenses=entries.filter(e=>e.direction==="out").reduce((s,e)=>s+e.amount,0);
    return NextResponse.json({entries,summary:{income,expenses,net:income-expenses},timezone:"Asia/Jakarta",dateBasis:"registration"});
  } catch(e){return apiError(e);}
}
