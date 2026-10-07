import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

function fail(request: NextRequest, code: string) {
  return NextResponse.redirect(new URL(`/login?error=${code}`, request.url));
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return fail(request, "oauth");
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !user) return fail(request, "oauth");

  // Google sign-in only grants access to accounts an owner already provisioned.
  const { data: profile } = await supabase.from("users").select("status").eq("id", user.id).maybeSingle();
  const { data: memberships } = await supabase.from("user_memberships").select("tenant_id").eq("user_id", user.id);
  if (profile?.status !== "active" || !memberships?.length) {
    await supabase.auth.signOut();
    return fail(request, "no-access");
  }

  (await cookies()).set("tenant-id", memberships[0].tenant_id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
