import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, requireOwner, requireWorkspace } from "@/lib/workspace/server";
import { DomainError } from "@/lib/workspace/commands";

const password = z.string().min(6, "Password must be at least 6 characters.").max(128);
const name = z.string().trim().min(2).max(100);
const email = z.string().trim().email().toLowerCase();

// Owners manage admins only; the owner row and other workspaces are never touched.
async function requireAdminMember(admin: ReturnType<typeof createAdminClient>, tenantId: string, userId: string) {
  const { data, error } = await admin.from("user_memberships").select("role").eq("tenant_id", tenantId).eq("user_id", userId).maybeSingle();
  if (error) throw new DomainError("Could not load users.", 503);
  if (!data) throw new DomainError("User not found in this workspace.", 404);
  if (data.role !== "admin") throw new DomainError("Only admins can be edited or removed.", 403);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireWorkspace();
    const page = z.coerce.number().int().min(1).max(100000).parse(request.nextUrl.searchParams.get("page") || 1);
    const admin = createAdminClient();
    const { data, count, error } = await admin.from("user_memberships")
      .select("user_id,role,users!inner(email)", { count: "exact" })
      .eq("tenant_id", auth.tenantId).order("created_at").order("id").range((page - 1) * 20, page * 20 - 1);
    if (error) throw new DomainError("Could not load users.", 503);
    const users = await Promise.all((data || []).map(async member => {
      const profile = Array.isArray(member.users) ? member.users[0] : member.users;
      const { data: account, error: accountError } = await admin.auth.admin.getUserById(member.user_id);
      if (accountError) throw new DomainError("Could not load user profiles. Try again.", 503);
      return { id: member.user_id, name: account.user?.user_metadata?.name || "", email: profile.email,
        role: member.role, lastSignInAt: account.user?.last_sign_in_at ?? null };
    }));
    return NextResponse.json({ users, total: count || 0, page, role: auth.role }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireOwner();
    // Neither role nor tenant can be supplied by the browser.
    const input = z.object({ name, email, password }).strict().parse(await request.json());
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({ email: input.email, password: input.password,
      email_confirm: true, user_metadata: { name: input.name } });
    if (error || !data.user) {
      if (error?.code === "email_exists" || error?.code === "user_already_exists") throw new DomainError("This email is already registered. Use a different email.", 409);
      throw new DomainError("Could not create the account. Check the email and the Supabase password policy.", 400);
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
      if (cleanupError) throw new DomainError("Could not create the membership. The account has no access yet; ask your Supabase admin to clean it up.", 503);
      throw new DomainError("Could not grant access; the account was rolled back. Please try again.", 503);
    }
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireOwner();
    const input = z.object({ id: z.uuid(), name, email, password: password.optional().or(z.literal("")) }).strict().parse(await request.json());
    const admin = createAdminClient();
    await requireAdminMember(admin, auth.tenantId, input.id);
    const { error } = await admin.auth.admin.updateUserById(input.id, { email: input.email, email_confirm: true,
      user_metadata: { name: input.name }, ...(input.password ? { password: input.password } : {}) });
    if (error) {
      if (error.code === "email_exists" || error.code === "user_already_exists") throw new DomainError("This email is already registered. Use a different email.", 409);
      throw new DomainError("Could not update the admin. Check the email and the Supabase password policy.", 400);
    }
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireOwner();
    const id = z.uuid().parse(request.nextUrl.searchParams.get("id"));
    const admin = createAdminClient();
    await requireAdminMember(admin, auth.tenantId, id);
    const { error } = await admin.from("user_memberships").delete().eq("tenant_id", auth.tenantId).eq("user_id", id);
    if (error) throw new DomainError("Could not remove the admin.", 503);
    // Delete the login itself only when it no longer belongs to any workspace.
    const { count } = await admin.from("user_memberships").select("id", { count: "exact", head: true }).eq("user_id", id);
    if (!count) await admin.auth.admin.deleteUser(id);
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
