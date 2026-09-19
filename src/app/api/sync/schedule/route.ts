import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, requireWorkspace } from "@/lib/workspace/server";
import { DomainError } from "@/lib/workspace/commands";
export async function GET() {
  try {
    const auth=await requireWorkspace();
    const {data,error}=await createAdminClient().from("tripdash_sync_jobs").select("enabled,interval_minutes,next_run_at,last_run_at,last_error").eq("tenant_id",auth.tenantId).maybeSingle();
    if(error)throw new DomainError("Jadwal belum tersedia. Jalankan migrasi 0003.",503);
    return NextResponse.json(data || {enabled:false,interval_minutes:60});
  }catch(error){return apiError(error);}
}
export async function POST(request:NextRequest) {
  try {
    const auth=await requireWorkspace();
    const body=z.object({enabled:z.boolean(),interval_minutes:z.number().int().min(15).max(10080)}).parse(await request.json());
    const {error}=await createAdminClient().from("tripdash_sync_jobs").upsert({tenant_id:auth.tenantId,...body,next_run_at:new Date().toISOString()});
    if(error)throw new DomainError("Jadwal gagal disimpan.",503);
    return NextResponse.json({success:true});
  }catch(error){return apiError(error);}
}
