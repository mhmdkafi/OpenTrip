import { createAdminClient } from "@/lib/supabase/admin";
import { DomainError } from "./commands";

export const USERS_PAGE_SIZE = 20;

// Latest of the dashboard heartbeat and the last sign-in.
function presence(lastSeen?: string, lastSignIn?: string) {
  return { lastActiveAt: [lastSeen, lastSignIn].filter((value): value is string => Boolean(value)).sort().at(-1) ?? null };
}

export async function listUsers(tenantId: string, role: "owner" | "admin", page = 1) {
  const admin = createAdminClient();
  const { data, count, error } = await admin.from("user_memberships")
    .select("user_id,role,users!inner(email)", { count: "exact" })
    .eq("tenant_id", tenantId).order("created_at").order("id").range((page - 1) * USERS_PAGE_SIZE, page * USERS_PAGE_SIZE - 1);
  if (error) throw new DomainError("Could not load users.", 503);
  const users = await Promise.all((data || []).map(async member => {
    const profile = Array.isArray(member.users) ? member.users[0] : member.users;
    const { data: account, error: accountError } = await admin.auth.admin.getUserById(member.user_id);
    if (accountError) throw new DomainError("Could not load user profiles. Try again.", 503);
    return { id: member.user_id, name: (account.user?.user_metadata?.name as string) || "", email: profile.email as string,
      role: member.role as "owner" | "admin", ...presence(account.user?.app_metadata?.last_seen_at as string | undefined, account.user?.last_sign_in_at) };
  }));
  return { users, total: count || 0, page, role };
}
