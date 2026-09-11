import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      return NextResponse.json({ session: null });
    }
    
    const tenantId = request.cookies.get("tenant-id")?.value;
    
    if (!tenantId) {
      return NextResponse.json({
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name,
        },
        tenant: null,
      });
    }
    
    const { data: membership, error: membershipError } = await supabase
      .from("user_memberships")
      .select("tenant:tenants(*)")
      .eq("user_id", session.user.id)
      .eq("tenant_id", tenantId)
      .single();
    
    if (membershipError || !membership) {
      return NextResponse.json({
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name,
        },
        tenant: null,
      });
    }
    
    const tenant = Array.isArray(membership.tenant) 
      ? membership.tenant[0] 
      : membership.tenant;

    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata?.name,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
      },
    });
  } catch (error) {
    console.error("Get session error:", error);
    return NextResponse.json({ session: null }, { status: 500 });
  }
}