import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DomainError } from "./commands";
import { emptyWorkspace, type Workspace } from "./types";
import { NextResponse } from "next/server";
import { z } from "zod";
import { GoogleApiError } from "@/lib/google";
import { requireMembership } from "@/lib/auth/membership";

export async function requireWorkspace() {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new DomainError("Please sign in first.", 401);
  const tenantId = (await cookies()).get("tenant-id")?.value;
  if (!tenantId) throw new DomainError("No workspace selected. Please sign in again.", 403);
  const role = await requireMembership(client, user.id, tenantId);
  return { tenantId, workspace_id: tenantId, userId: user.id, role };
}

export async function requireOwner() {
  const auth = await requireWorkspace();
  if (auth.role !== "owner") throw new DomainError("Only the owner can add admins.", 403);
  return auth;
}

export async function loadWorkspace(tenantId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.from("tripdash_workspaces").select("revision,data").eq("tenant_id", tenantId).maybeSingle();
  if (error) throw new DomainError("TripDash storage is not ready. Run migration 0002_tripdash_workspace.sql in Supabase.", 503);
  return { revision: data?.revision ?? 0, state: { ...emptyWorkspace(), ...(data?.data ?? {}) } as Workspace, exists: Boolean(data) };
}

export async function saveWorkspace(tenantId: string, revision: number, state: Workspace, exists: boolean) {
  const admin = createAdminClient();
  const row = { data: state, revision: revision + 1, updated_at: new Date().toISOString() };
  const result = exists
    ? await admin.from("tripdash_workspaces").update(row).eq("tenant_id", tenantId).eq("revision", revision).select("revision").maybeSingle()
    : await admin.from("tripdash_workspaces").insert({ tenant_id: tenantId, ...row }).select("revision").single();
  if (result.error?.code === "23505" || (!result.error && !result.data)) throw new DomainError("Another user changed the data. Reload and review again.", 409);
  if (result.error) throw new DomainError("Could not save changes. Please try again.", 503);
  return revision + 1;
}
export function apiError(error: unknown) {
  if (error instanceof GoogleApiError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ") }, { status: 400 });
  if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.status });
  return NextResponse.json({ error: "Something went wrong. Check the service configuration and try again." }, { status: 500 });
}
