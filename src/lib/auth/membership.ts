import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { DomainError } from "@/lib/workspace/commands";

export async function requireMembership(client: SupabaseClient, userId: string, tenantId: string) {
  if (!z.uuid().safeParse(tenantId).success) throw new DomainError("Invalid workspace.", 403);
  const [{ data: membership, error }, { data: profile, error: profileError }] = await Promise.all([
    client.from("user_memberships").select("tenant_id,role").eq("user_id", userId).eq("tenant_id", tenantId).maybeSingle(),
    client.from("users").select("status").eq("id", userId).maybeSingle(),
  ]);
  if (error || profileError) throw new DomainError("Could not verify workspace access. Check the connection and database migrations.", 503);
  if (!membership || !["owner", "admin"].includes(membership.role) || profile?.status !== "active") {
    throw new DomainError("Workspace access denied.", 403);
  }
  return membership.role as "owner" | "admin";
}
