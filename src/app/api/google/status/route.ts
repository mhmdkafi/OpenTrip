import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, requireWorkspace } from "@/lib/workspace/server";
import { DomainError } from "@/lib/workspace/commands";
export async function GET() {
  try {
    const auth = await requireWorkspace();
    const { data,error } = await createAdminClient().from("tripdash_google_connections").select("updated_at").eq("tenant_id", auth.tenantId).maybeSingle();
    if (error) throw new DomainError("Status koneksi Google gagal dimuat. Periksa konfigurasi database.",503);
    return NextResponse.json({ configured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI && process.env.GOOGLE_TOKEN_ENCRYPTION_KEY), connected: Boolean(data) });
  } catch (e) { return apiError(e); }
}
export async function DELETE() {
  try {
    const auth = await requireWorkspace();
    const { error } = await createAdminClient().from("tripdash_google_connections").delete().eq("tenant_id", auth.tenantId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e) { return apiError(e); }
}
