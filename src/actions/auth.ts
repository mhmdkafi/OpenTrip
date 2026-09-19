"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LoginFormData } from "@/types/auth";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  tenantId: z.string().uuid().optional(),
});


export async function login(formData: LoginFormData) {
  try {
    const validated = loginSchema.parse(formData);
    const supabase = await createClient();

    const { data: { user }, error } = await supabase.auth.signInWithPassword({
      email: validated.email,
      password: validated.password,
    });

    if (error) {
      if (error.name === "AuthRetryableFetchError" || /fetch failed|failed to fetch|network/i.test(error.message)) {
        return { success: false, error: "Server aplikasi tidak dapat terhubung ke Supabase. Periksa koneksi internet server, VPN/proxy, dan akses jaringan proses Next.js, lalu coba lagi." };
      }
      return { success: false, error: error.message };
    }

    if (!user) {
      return { success: false, error: "User tidak ditemukan" };
    }

    const {data:profile,error:profileError} = await supabase.from("users").select("status").eq("id",user.id).maybeSingle();
    if (profileError) {
      return {success:false,error:"Profil akun gagal dimuat dari Supabase. Periksa koneksi server dan migrasi database, lalu coba lagi."};
    }
    if (profile?.status !== "active") {
      await supabase.auth.signOut();
      return {success:false,error:"Akun tidak aktif."};
    }

    const { data: memberships, error: membershipError } = await supabase
      .from("user_memberships")
      .select("tenant_id")
      .eq("user_id", user.id);

    if (membershipError) {
      return { success: false, error: "Gagal memuat data tenant" };
    }

    if (memberships.length === 0) {
      return { success: false, error: "User belum terdaftar di tenant manapun" };
    }

    let tenantId = validated.tenantId;

    if (!tenantId) {
      tenantId = memberships[0].tenant_id;
    } else {
      const isValidTenant = memberships.some(m => m.tenant_id === tenantId);
      if (!isValidTenant) {
        tenantId = memberships[0].tenant_id;
      }
    }

    const cookieStore = await cookies();
    cookieStore.set("tenant-id", tenantId || "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    revalidatePath("/dashboard");

    return {
      success: true,
      message: "Login berhasil",
      redirectTo: "/dashboard"
    };

  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }

    console.error("Login error:", error);
    return { success: false, error: "Terjadi kesalahan internal" };
  }
}

export async function logout() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) return { success: false, error: "Gagal logout. Silakan coba lagi." };

    const cookieStore = await cookies();
    cookieStore.delete("tenant-id");

    revalidatePath("/");

    return { success: true, message: "Logout berhasil" };
  } catch (error) {
    console.error("Logout error:", error);
    return { success: false, error: "Gagal logout" };
  }
}

export async function switchTenant(tenantId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "User tidak login" };
    }

    const { data: membership, error } = await supabase
      .from("user_memberships")
      .select()
      .eq("user_id", user.id)
      .eq("tenant_id", tenantId)
      .single();

    if (error || !membership) {
      return { success: false, error: "User tidak memiliki akses ke tenant ini" };
    }

    const cookieStore = await cookies();
    cookieStore.set("tenant-id", tenantId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    revalidatePath("/dashboard");

    return { success: true, message: "Berhasil pindah tenant" };
  } catch (error) {
    console.error("Switch tenant error:", error);
    return { success: false, error: "Gagal pindah tenant" };
  }
}

export async function getCurrentSession() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    const cookieStore = await cookies();
    const tenantId = cookieStore.get("tenant-id")?.value;

    if (!tenantId) {
      return { user: user, tenant: null };
    }

    const { data: membership, error: membershipError } = await supabase
      .from("user_memberships")
      .select("tenant:tenants(*)")
      .eq("user_id", user.id)
      .eq("tenant_id", tenantId)
      .single();

    if (membershipError || !membership) {
      return { user: user, tenant: null };
    }

    return {
      user: user,
      tenant: membership.tenant,
    };
  } catch (error) {
    console.error("Get session error:", error);
    return null;
  }
}
