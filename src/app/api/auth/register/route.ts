import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2).max(100),
  tenantName: z.string().min(2).max(100),
  phone: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = registerSchema.parse(body);

    if (
      !process.env.SUPABASE_SECRET_KEY &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.json({
        success: false,
        error: "Database belum dikonfigurasi: SUPABASE_SECRET_KEY belum diisi.",
      }, { status: 503 });
    }

    const supabase = await createClient();
    const admin = createAdminClient();
    
    const { data: { user, session }, error: signUpError } = await supabase.auth.signUp({
      email: validated.email,
      password: validated.password,
      options: {
        data: {
          name: validated.name,
          phone: validated.phone,
        }
      }
    });
    
    if (signUpError) {
      const isEmailRateLimited =
        signUpError.status === 429 ||
        signUpError.code === "over_email_send_rate_limit" ||
        signUpError.message.toLowerCase().includes("email rate limit");

      return NextResponse.json({ 
        success: false, 
        error: isEmailRateLimited
          ? "Batas pengiriman email Supabase tercapai. Periksa email konfirmasi yang sudah terkirim atau coba lagi setelah satu jam."
          : signUpError.message
      }, { status: isEmailRateLimited ? 429 : 400 });
    }
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: "Gagal membuat user" 
      }, { status: 400 });
    }

    const { error: profileError } = await admin
      .from("users")
      .upsert({ id: user.id, email: validated.email }, { onConflict: "id" });

    if (profileError) {
      console.error("Create profile error:", profileError);
      await admin.auth.admin.deleteUser(user.id);
      return NextResponse.json({
        success: false,
        error: "Gagal membuat profil pengguna. Pastikan migrasi database sudah dijalankan.",
      }, { status: 500 });
    }

    const { data: tenant, error: tenantError } = await admin
      .from("tenants")
      .insert({ name: validated.tenantName })
      .select()
      .single();
    
    if (tenantError) {
      console.error("Create tenant error:", tenantError);
      await admin.auth.admin.deleteUser(user.id);
      return NextResponse.json({ 
        success: false, 
        error: "Gagal membuat tenant. Pastikan migrasi database sudah dijalankan."
      }, { status: 500 });
    }
    
    const { error: membershipError } = await admin
      .from("user_memberships")
      .insert({
        user_id: user.id,
        tenant_id: tenant.id,
      });
    
    if (membershipError) {
      console.error("Create membership error:", membershipError);
      await admin.from("tenants").delete().eq("id", tenant.id);
      await admin.auth.admin.deleteUser(user.id);
      return NextResponse.json({ 
        success: false, 
        error: "Gagal menghubungkan user dengan tenant. Periksa tabel user_memberships."
      }, { status: 500 });
    }
    
    const response = NextResponse.json({ 
      success: true, 
      message: session
        ? "Registrasi berhasil."
        : "Registrasi berhasil. Periksa email untuk mengaktifkan akun, lalu login.",
      tenantId: tenant.id,
      requiresEmailConfirmation: !session,
    });
    
    if (session) {
      response.cookies.set("tenant-id", tenant.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
    }
    
    return response;
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        success: false, 
        error: error.issues[0].message 
      }, { status: 400 });
    }
    
    console.error("Register error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Terjadi kesalahan internal" 
    }, { status: 500 });
  }
}
