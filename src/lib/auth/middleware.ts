import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function authMiddleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublicPath = ["/login", "/register", "/api/auth"].some(path => pathname.startsWith(path));
  const isApiPath = pathname.startsWith("/api");
  
  try {
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error("Auth error:", error);
      if (isPublicPath) return NextResponse.next();
      return redirectToLogin(request);
    }
    
    if (!session && !isPublicPath) {
      return redirectToLogin(request);
    }
    
    if (session && isPublicPath && !isApiPath) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    
    if (session) {
      const headers = new Headers(request.headers);
      headers.set("x-user-id", session.user.id);
      
      const modifiedRequest = new NextRequest(request, {
        headers
      });
      
      return NextResponse.next();
    }
    
    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);
    
    if (isPublicPath) {
      return NextResponse.next();
    }
    
    return redirectToLogin(request);
  }
}

export async function requireTenantMiddleware(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const tenantId = cookieStore.get("tenant-id")?.value;
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return redirectToLogin(request);
    }
    
    if (!tenantId) {
      return redirectToTenantSelection(request);
    }
    
    const { data: membership, error } = await supabase
      .from("user_memberships")
      .select("*, tenant:tenants(*)")
      .eq("user_id", session.user.id)
      .eq("tenant_id", tenantId)
      .single();
    
    if (error || !membership) {
      return redirectToTenantSelection(request);
    }
    
    const headers = new Headers(request.headers);
    headers.set("x-tenant-id", tenantId);
    headers.set("x-tenant-name", membership.tenant.name);
    
    const modifiedRequest = new NextRequest(request, {
      headers
    });
    
    return NextResponse.next();
  } catch (error) {
    console.error("Tenant middleware error:", error);
    return redirectToTenantSelection(request);
  }
}

export async function requireRoleMiddleware(request: NextRequest, allowedRoles: string[]) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const tenantId = request.headers.get("x-tenant-id");
    
    if (!session || !tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { data: membership, error } = await supabase
      .from("user_memberships")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("tenant_id", tenantId)
      .single();
    
    if (error || !membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    
    if (!allowedRoles.includes(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }
    
    return NextResponse.next();
  } catch (error) {
    console.error("Role middleware error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

function redirectToTenantSelection(request: NextRequest) {
  const tenantUrl = new URL("/tenants", request.url);
  tenantUrl.searchParams.set("redirect", request.nextUrl.pathname);
  return NextResponse.redirect(tenantUrl);
}