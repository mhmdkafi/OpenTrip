import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { requireMembership } from "./membership";
import { DomainError } from "@/lib/workspace/commands";
import { FORWARDED, MEMBERSHIP_COOKIE, MEMBERSHIP_TTL_S, readMembership, signIdentity, signMembership } from "./forwarded";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/api/auth/register") return NextResponse.json({error:"Public registration is disabled. Contact the owner."},{status:410});
  const headers = new Headers(request.headers);
  Object.values(FORWARDED).forEach(name => headers.delete(name));
  let response = NextResponse.next({ request: { headers } });
  if (!["GET", "HEAD"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin) return NextResponse.json({error:"Origin rejected."}, {status:403});
  }
  // Cron authenticates its service credential in the handler, never a browser cookie.
  if (["/api/cron/sync", "/api/health"].includes(path)) return response;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.json({error:"Auth is not configured."}, {status:503});
  const client = createServerClient(url, key, {cookies:{
    getAll:()=>request.cookies.getAll(),
    setAll(values) {
      values.forEach(({name,value})=>request.cookies.set(name,value));
      headers.set("cookie", request.cookies.toString());
      response = NextResponse.next({request:{headers}});
      values.forEach(({name,value,options})=>response.cookies.set(name,value,options));
    },
  }});
  // getClaims verifies the JWT locally when the project uses asymmetric signing keys.
  const {data:claimsData} = await client.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  function deny(status:number) {
    const result = path.startsWith("/dashboard") ? NextResponse.redirect(new URL("/login",request.url)) : NextResponse.json({error:"Workspace access denied."},{status});
    response.cookies.getAll().forEach(c=>result.cookies.set(c));
    return result;
  }
  if (!userId) return deny(401);
  if (path.startsWith("/api/auth/")) {
    const {data:activeProfile}=await client.from("users").select("status").eq("id",userId).maybeSingle();
    if (activeProfile?.status !== "active") return deny(403);
  } else {
    const tenant = request.cookies.get("tenant-id")?.value;
    if (!tenant) return deny(403);
    let role = readMembership(request.cookies.get(MEMBERSHIP_COOKIE)?.value, userId, tenant);
    if (!role) {
      try { role = await requireMembership(client, userId, tenant); }
      catch (error) { return deny(error instanceof DomainError ? error.status : 503); }
      response.cookies.set(MEMBERSHIP_COOKIE, signMembership({ userId, tenantId: tenant, role }), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: MEMBERSHIP_TTL_S });
    }
    headers.set(FORWARDED.user,userId);
    headers.set(FORWARDED.tenant,tenant);
    headers.set(FORWARDED.role,role);
    headers.set(FORWARDED.signature,signIdentity({userId,tenantId:tenant,role}));
  }
  const result = NextResponse.next({request:{headers}});
  response.cookies.getAll().forEach(c=>result.cookies.set(c));
  result.headers.set("Cache-Control","private, no-store");
  return result;
}
