import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, requireOwner, requireWorkspace } from "@/lib/workspace/server";
import { DomainError } from "@/lib/workspace/commands";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireWorkspace();
    const page = z.coerce.number().int().min(1).max(100000).parse(request.nextUrl.searchParams.get("page") || 1);
    const admin = createAdminClient();
    const { data, count, error } = await admin.from("user_memberships")
      .select("user_id,role,created_at,users!inner(email,status)", { count: "exact" })
      .eq("tenant_id", auth.tenantId).order("created_at").order("id").range((page - 1) * 20, page * 20 - 1);
    if (error) throw new DomainError("Daftar pengguna gagal dimuat.", 503);
    const users = await Promise.all((data || []).map(async member => {
      const profile = Array.isArray(member.users) ? member.users[0] : member.users;
      const { data: account, error: accountError } = await admin.auth.admin.getUserById(member.user_id);
      if (accountError) throw new DomainError("Profil pengguna gagal dimuat. Coba kembali.", 503);
      return { id: member.user_id, name: account.user?.user_metadata?.name || "", email: profile.email,
        status: profile.status, role: member.role, createdAt: member.created_at };
    }));
    return NextResponse.json({ users, total: count || 0, page, role: auth.role }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireOwner();
    // Neither role nor tenant can be supplied by the browser.
    const input = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email().toLowerCase(),
      password: z.string().min(6, "Password minimal 6 karakter.").max(128) }).strict().parse(await request.json());
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({ email: input.email, password: input.password,
      email_confirm: true, user_metadata: { name: input.name } });
    if (error || !data.user) {
      if (error?.code === "email_exists" || error?.code === "user_already_exists") throw new DomainError("Email sudah terdaftar. Gunakan email lain.", 409);
      throw new DomainError("Akun gagal dibuat. Periksa email dan kebijakan password Supabase.", 400);
    }
    const userId = data.user.id;
    try {
      const { error: profileError } = await admin.from("users").upsert({ id: userId, email: input.email, status: "active" });
      if (profileError) throw profileError;
      const { error: memberError } = await admin.from("user_memberships").insert({ user_id: userId, tenant_id: auth.tenantId, role: "admin" });
      if (memberError) throw memberError;
    } catch {
      // Compensate only the account created by this request, never an existing user.
      const { error: cleanupError } = await admin.auth.admin.deleteUser(userId);
      if (cleanupError) throw new DomainError("Pembuatan membership gagal. Akun belum memiliki akses; hubungi pengelola Supabase untuk membersihkan akun tersebut.", 503);
      throw new DomainError("Pembuatan akses gagal; akun dibatalkan. Silakan coba kembali.", 503);
    }
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) { return apiError(error); }
}
