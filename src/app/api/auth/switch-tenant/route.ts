import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const switchTenantSchema = z.object({
  tenantId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = switchTenantSchema.parse(body);
    
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ 
        success: false, 
        error: "User tidak login" 
      }, { status: 401 });
    }
    
    const { data: membership, error } = await supabase
      .from("user_memberships")
      .select()
      .eq("user_id", session.user.id)
      .eq("tenant_id", validated.tenantId)
      .single();
    
    if (error || !membership) {
      return NextResponse.json({ 
        success: false, 
        error: "User tidak memiliki akses ke tenant ini" 
      }, { status: 403 });
    }
    
    const response = NextResponse.json({ 
      success: true, 
      message: "Berhasil pindah tenant" 
    });
    
    response.cookies.set("tenant-id", validated.tenantId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        success: false, 
        error: error.issues[0].message 
      }, { status: 400 });
    }
    
    console.error("Switch tenant error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Gagal pindah tenant" 
    }, { status: 500 });
  }
}