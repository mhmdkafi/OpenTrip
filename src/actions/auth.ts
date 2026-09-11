"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LoginFormData, RegisterFormData } from "@/types/auth";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  tenantId: z.string().uuid().optional(),
});

const registerSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  tenantName: z.string().min(2, "Nama tenant minimal 2 karakter").max(100, "Nama tenant maksimal 100 karakter"),
  name: z.string().min(2, "Nama minimal 2 karakter").max(100, "Nama maksimal 100 karakter"),
  phone: z.string().optional(),
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
      return { success: false, error: error.message };
    }
    
    if (!user) {
      return { success: false, error: "User tidak ditemukan" };
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
    await supabase.auth.signOut();
    
    const cookieStore = await cookies();
    cookieStore.delete("tenant-id");
    
    revalidatePath("/");
    
    return { success: true, message: "Logout berhasil" };
  } catch (error) {
    console.error("Logout error:", error);
    return { success: false, error: "Gagal logout" };
  }
}

export async function register(formData: RegisterFormData) {
  try {
    const validated = registerSchema.parse(formData);
    const supabase = await createClient();
    
    const { data: { user }, error } = await supabase.auth.signUp({
      email: validated.email,
      password: validated.password,
      options: {
        data: {
          name: validated.name,
          phone: validated.phone,
        }
      }
    });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    if (!user) {
      return { success: false, error: "Gagal membuat user" };
    }
    
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({ name: validated.tenantName })
      .select()
      .single();
    
    if (tenantError) {
      await supabase.auth.admin.deleteUser(user.id);
      return { success: false, error: "Gagal membuat tenant" };
    }
    
    const { error: membershipError } = await supabase
      .from("user_memberships")
      .insert({
        user_id: user.id,
        tenant_id: tenant.id,
      });
    
    if (membershipError) {
      await supabase.from("tenants").delete().eq("id", tenant.id);
      await supabase.auth.admin.deleteUser(user.id);
      return { success: false, error: "Gagal menghubungkan user dengan tenant" };
    }
    
    const cookieStore = await cookies();
    cookieStore.set("tenant-id", tenant.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    
    return { 
      success: true, 
      message: "Registrasi berhasil. Silakan login.",
      redirectTo: "/dashboard"
    };
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    
    console.error("Register error:", error);
    return { success: false, error: "Terjadi kesalahan internal" };
  }
}

export async function switchTenant(tenantId: string) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { success: false, error: "User tidak login" };
    }
    
    const { data: membership, error } = await supabase
      .from("user_memberships")
      .select()
      .eq("user_id", session.user.id)
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
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      return null;
    }
    
    const cookieStore = await cookies();
    const tenantId = cookieStore.get("tenant-id")?.value;
    
    if (!tenantId) {
      return { user: session.user, tenant: null };
    }
    
    const { data: membership, error: membershipError } = await supabase
      .from("user_memberships")
      .select("tenant:tenants(*)")
      .eq("user_id", session.user.id)
      .eq("tenant_id", tenantId)
      .single();
    
    if (membershipError || !membership) {
      return { user: session.user, tenant: null };
    }
    
    return {
      user: session.user,
      tenant: membership.tenant,
    };
  } catch (error) {
    console.error("Get session error:", error);
    return null;
  }
}