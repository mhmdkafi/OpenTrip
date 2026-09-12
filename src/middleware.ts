import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.redirect(new URL("/login", request.url));
  const client = createServerClient(url,key,{cookies:{getAll:()=>request.cookies.getAll(),setAll(values){values.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});values.forEach(({name,value,options})=>response.cookies.set(name,value,options));}}});
  const {data:{user}}=await client.auth.getUser();
  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const redirect=NextResponse.redirect(new URL("/login",request.url));response.cookies.getAll().forEach(c=>redirect.cookies.set(c));return redirect;
  }
  if (request.method!=="GET" && request.method!=="HEAD") {
    const origin=request.headers.get("origin");
    if (origin && origin!==request.nextUrl.origin) return NextResponse.json({error:"Origin permintaan ditolak."},{status:403});
  }
  return response;
}
export const config={matcher:["/dashboard/:path*","/api/:path*"]};
