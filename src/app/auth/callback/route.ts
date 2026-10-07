import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function fail(request: NextRequest, code: string, detail?: string) {
  const url = new URL(`/login?error=${code}`, request.url);
  if (detail) url.searchParams.set("detail", detail.slice(0, 200));
  return NextResponse.redirect(url);
}

// First-run setup: while no workspace has an owner, the Google account matching
// OWNER_EMAIL becomes owner of a new workspace. It is a no-op once any owner exists.
async function bootstrapOwner(user: User) {
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (!ownerEmail || user.email?.toLowerCase() !== ownerEmail) return null;
  const admin = createAdminClient();
  const { count, error } = await admin.from("user_memberships").select("id", { count: "exact", head: true }).eq("role", "owner");
  if (error || count) return null;
  const { data: tenant, error: tenantError } = await admin.from("tenants").insert({ name: process.env.OWNER_WORKSPACE_NAME?.trim() || "Rimbaloka Trip" }).select("id").single();
  if (tenantError || !tenant) return null;
  const { error: profileError } = await admin.from("users").upsert({ id: user.id, email: user.email, status: "active" });
  const { error: memberError } = profileError ? { error: profileError } : await admin.from("user_memberships").insert({ user_id: user.id, tenant_id: tenant.id, role: "owner" });
  if (memberError) {
    await admin.from("tenants").delete().eq("id", tenant.id);
    return null;
  }
  return tenant.id as string;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  if (!code) return fail(request, "oauth", params.get("error_description") ?? params.get("error") ?? "Missing authorization code");
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !user) return fail(request, "oauth", error?.message);

  // Google sign-in only grants access to accounts an owner already provisioned.
  const { data: profile } = await supabase.from("users").select("status").eq("id", user.id).maybeSingle();
  const { data: memberships } = await supabase.from("user_memberships").select("tenant_id").eq("user_id", user.id);
  let tenantId = profile?.status === "active" ? memberships?.[0]?.tenant_id : undefined;
  if (!tenantId && !memberships?.length) tenantId = await bootstrapOwner(user) ?? undefined;
  if (!tenantId) {
    await supabase.auth.signOut();
    return fail(request, "no-access");
  }

  (await cookies()).set("tenant-id", tenantId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
