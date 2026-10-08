"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LoginFormData } from "@/types/auth";
import { z } from "zod";
import { requireMembership } from "@/lib/auth/membership";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
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
        return { success: false, error: "The server cannot reach Supabase. Check the server network connection and try again." };
      }
      return { success: false, error: error.message };
    }

    if (!user) {
      return { success: false, error: "User not found" };
    }

    const {data:profile,error:profileError} = await supabase.from("users").select("status").eq("id",user.id).maybeSingle();
    if (profileError) {
      return {success:false,error:"Could not load the account profile. Please try again."};
    }
    if (profile?.status !== "active") {
      await supabase.auth.signOut();
      return {success:false,error:"This account is inactive."};
    }

    const { data: memberships, error: membershipError } = await supabase
      .from("user_memberships")
      .select("tenant_id")
      .eq("user_id", user.id)
      .in("role", ["owner", "admin"]);

    if (membershipError) {
      return { success: false, error: "Could not load workspace data" };
    }

    if (memberships.length === 0) {
      await supabase.auth.signOut();
      return { success: false, error: "This account has no workspace access. Ask your workspace owner to add you." };
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
      message: "Signed in",
      redirectTo: "/dashboard"
    };

  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }

    console.error("Login error:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

export async function logout() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) return { success: false, error: "Sign-out failed. Please try again." };

    const cookieStore = await cookies();
    cookieStore.delete("tenant-id");

    revalidatePath("/");

    return { success: true, message: "Signed out" };
  } catch (error) {
    console.error("Logout error:", error);
    return { success: false, error: "Sign-out failed" };
  }
}
