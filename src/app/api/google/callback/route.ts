import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireWorkspace } from "@/lib/workspace/server";
import { encryptToken, exchangeToken, googleConfig } from "@/lib/workspace/google-auth";
import { createAdminClient } from "@/lib/supabase/admin";
export async function GET(request: NextRequest) {
  const destination = new URL("/dashboard/settings", request.url);
  try {
    const auth = await requireWorkspace(); const jar = await cookies();
    const expected = jar.get("google-oauth-state")?.value;
    jar.delete("google-oauth-state");
    const state = request.nextUrl.searchParams.get("state");
    const code = request.nextUrl.searchParams.get("code");
    if (!state || expected !== `${state}:${auth.tenantId}:${auth.userId}` || !code) throw new Error("Invalid callback");
    const token = await exchangeToken({ code, grant_type: "authorization_code", redirect_uri: googleConfig().redirectUri });
    if (!token.refresh_token) throw new Error("Missing refresh token");
    const { error } = await createAdminClient().from("tripdash_google_connections").upsert({ tenant_id: auth.tenantId, encrypted_refresh_token: encryptToken(token.refresh_token), encrypted_access_token:encryptToken(token.access_token), expires_at:new Date(Date.now()+(token.expires_in||3600)*1000).toISOString(), updated_at: new Date().toISOString() });
    if (error) throw error;
    destination.searchParams.set("google", "connected");
  } catch { destination.searchParams.set("google", "failed"); }
  return NextResponse.redirect(destination);
}
