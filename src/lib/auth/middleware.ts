import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/api/auth/register") return NextResponse.json({error:"Registrasi publik dinonaktifkan. Hubungi owner."},{status:410});
  const headers = new Headers(request.headers);
  headers.delete("x-workspace-id");
  headers.delete("x-user-id");
  let response = NextResponse.next({ request: { headers } });
  if (!["GET", "HEAD"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin) return NextResponse.json({error:"Origin ditolak."}, {status:403});
  }
  // Cron authenticates its service credential in the handler, never a browser cookie.
  if (["/api/cron/sync", "/api/health"].includes(path)) return response;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.json({error:"Auth belum dikonfigurasi."}, {status:503});
  const client = createServerClient(url, key, {cookies:{
    getAll:()=>request.cookies.getAll(),
    setAll(values) {
      values.forEach(({name,value})=>request.cookies.set(name,value));
      headers.set("cookie", request.cookies.toString());
      response = NextResponse.next({request:{headers}});
      values.forEach(({name,value,options})=>response.cookies.set(name,value,options));
    },
  }});
  const {data:{user}} = await client.auth.getUser();
  function deny(status:number) {
    const result = path.startsWith("/dashboard") ? NextResponse.redirect(new URL("/login",request.url)) : NextResponse.json({error:"Akses workspace ditolak."},{status});
    response.cookies.getAll().forEach(c=>result.cookies.set(c));
    return result;
  }
  if (!user) return deny(401);
  const {data:activeProfile}=await client.from("users").select("status").eq("id",user.id).maybeSingle();
  if (activeProfile?.status !== "active") return deny(403);
  if (!path.startsWith("/api/auth/")) {
    const tenant = request.cookies.get("tenant-id")?.value;
    if (!tenant) return deny(403);
    const [{data:member},{data:profile}] = await Promise.all([
      client.from("user_memberships").select("tenant_id").eq("tenant_id",tenant).eq("user_id",user.id).maybeSingle(),
      client.from("users").select("status").eq("id",user.id).maybeSingle(),
    ]);
    if (!member || profile?.status !== "active") return deny(403);
    headers.set("x-workspace-id",tenant);
    headers.set("x-user-id",user.id);
  }
  const result = NextResponse.next({request:{headers}});
  response.cookies.getAll().forEach(c=>result.cookies.set(c));
  result.headers.set("Cache-Control","private, no-store");
  return result;
}
