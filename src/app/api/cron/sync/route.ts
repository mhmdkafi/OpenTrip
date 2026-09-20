import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncTenant } from "@/lib/workspace/scheduled-sync";
import { apiError } from "@/lib/workspace/server";
import { DomainError } from "@/lib/workspace/commands";
export const maxDuration = 300;
export async function GET(request:NextRequest) {
  const secret=process.env.CRON_SECRET;
  const actual=Buffer.from(request.headers.get("authorization")||"");
  const expected=Buffer.from(`Bearer ${secret}`);
  if (!secret || actual.length!==expected.length || !timingSafeEqual(actual,expected)) return NextResponse.json({error:"Unauthorized"},{status:401});
  try {
    const admin=createAdminClient();
    const {data,error}=await admin.rpc("claim_tripdash_sync_job");
    if (error) throw new DomainError("Antrean sync belum tersedia.",503);
    const job=data?.[0];
    if (!job) return NextResponse.json({processed:0});
    let failure:string|null=null;
    try { await syncTenant(job.tenant_id); }
    catch(error) { failure=error instanceof DomainError ? error.message : "Sync gagal. Periksa konfigurasi layanan."; }
    const {data:finished,error:finishError}=await admin.from("tripdash_sync_jobs").update({lease_id:null,lease_until:null,last_run_at:new Date().toISOString(),last_error:failure}).eq("tenant_id",job.tenant_id).eq("lease_id",job.lease_id).select("tenant_id").maybeSingle();
    if (finishError) throw new DomainError("Status job gagal disimpan.",503);
    if (!finished) throw new DomainError("Lease job sudah berubah; hasil worker lama tidak diterima.",409);
    return NextResponse.json({processed:1,success:!failure},{status:failure?502:200});
  } catch(error) { return apiError(error); }
}
