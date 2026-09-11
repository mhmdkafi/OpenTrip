import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 400 });
    }
    
    const response = NextResponse.json({ 
      success: true, 
      message: "Logout berhasil" 
    });
    
    response.cookies.delete("tenant-id");
    
    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Gagal logout" 
    }, { status: 500 });
  }
}