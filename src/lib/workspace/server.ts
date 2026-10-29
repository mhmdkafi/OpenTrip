import { cache } from "react";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DomainError } from "./commands";
import { emptyWorkspace, type Workspace } from "./types";
import { inlineThumbnail, photoVersion } from "./photos";
import { NextResponse } from "next/server";
import { z } from "zod";
import { GoogleApiError } from "@/lib/google";
import { requireMembership } from "@/lib/auth/membership";
import { readIdentity } from "@/lib/auth/forwarded";

// Cached per request: layouts, pages, and handlers share one verification.
export const requireWorkspace = cache(async () => {
  const [requestHeaders, cookieStore] = await Promise.all([headers(), cookies()]);
  const tenantId = cookieStore.get("tenant-id")?.value;
  // Reuse the identity the proxy already verified for this request.
  const forwarded = readIdentity(requestHeaders);
  if (forwarded && forwarded.tenantId === tenantId) return { tenantId, workspace_id: tenantId, userId: forwarded.userId, role: forwarded.role };
  const client = await createClient();
  const { data, error } = await client.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) throw new DomainError("Please sign in first.", 401);
  if (!tenantId) throw new DomainError("No workspace selected. Please sign in again.", 403);
  const role = await requireMembership(client, userId, tenantId);
  return { tenantId, workspace_id: tenantId, userId, role };
});

export async function requireOwner() {
  const auth = await requireWorkspace();
  if (auth.role !== "owner") throw new DomainError("Only the owner can manage admins.", 403);
  return auth;
}

// One read per page render, shared by the dashboard layout and page metadata.
export const loadWorkspaceForRender = cache((tenantId: string) => loadWorkspace(tenantId));

// The workspace is one large JSON record (several MB). Each server process keeps the latest copy it
// has seen and, when the stored revision still matches, skips downloading it again.
const cached = new Map<string, { revision: number; state: Workspace }>();
const remember = (tenantId: string, revision: number, state: Workspace) => cached.set(tenantId, { revision, state: structuredClone(state) });

export async function loadWorkspace(tenantId: string) {
  const admin = createAdminClient();
  const hit = cached.get(tenantId);
  if (hit) {
    const { data, error } = await admin.from("tripdash_workspaces").select("revision").eq("tenant_id", tenantId).maybeSingle();
    // Callers mutate the state they get, so each one receives its own copy.
    if (!error && data?.revision === hit.revision) return { revision: hit.revision, state: structuredClone(hit.state), exists: true };
  }
  const { data, error } = await admin.from("tripdash_workspaces").select("revision,data").eq("tenant_id", tenantId).maybeSingle();
  if (error) throw new DomainError("TripDash storage is not ready. Run migration 0002_tripdash_workspace.sql in Supabase.", 503);
  const state = { ...emptyWorkspace(), ...(data?.data ?? {}) } as Workspace;
  if (data) remember(tenantId, data.revision, state);
  return { revision: data?.revision ?? 0, state, exists: Boolean(data) };
}

// Idempotency only needs recent request ids; audit keeps a long but bounded history.
const KEEP_REQUESTS = 1000, KEEP_AUDIT = 5000;
export const photoPath = (itemId: string, data: string) => `/api/inventory/${itemId}/photo?v=${photoVersion(data)}`;

// What the browser receives: no server-only history, and photos as cacheable URLs instead of base64.
// Each photo also ships a small inline thumbnail so inventory rows show images without extra requests.
export async function clientWorkspace(state: Workspace): Promise<Workspace> {
  const inventory = await Promise.all(state.inventory.map(async item => {
    if (!item.imageUrl?.startsWith("data:")) return item;
    const thumbnailUrl = await inlineThumbnail(item.imageUrl).catch(() => undefined);
    return { ...item, imageUrl: photoPath(item.id, item.imageUrl), ...(thumbnailUrl ? { thumbnailUrl } : {}) };
  }));
  return { ...state, audit: [], requests: [], inventory };
}

export async function saveWorkspace(tenantId: string, revision: number, state: Workspace, exists: boolean) {
  const admin = createAdminClient();
  const trimmed = { ...state, requests: state.requests.slice(-KEEP_REQUESTS), audit: state.audit.slice(-KEEP_AUDIT) };
  const row = { data: trimmed, revision: revision + 1, updated_at: new Date().toISOString() };
  const result = exists
    ? await admin.from("tripdash_workspaces").update(row).eq("tenant_id", tenantId).eq("revision", revision).select("revision").maybeSingle()
    : await admin.from("tripdash_workspaces").insert({ tenant_id: tenantId, ...row }).select("revision").single();
  if (result.error?.code === "23505" || (!result.error && !result.data)) throw new DomainError("Another user changed the data. Reload and review again.", 409);
  if (result.error) throw new DomainError("Could not save changes. Please try again.", 503);
  remember(tenantId, revision + 1, trimmed);
  return revision + 1;
}
export function apiError(error: unknown) {
  if (error instanceof GoogleApiError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ") }, { status: 400 });
  if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.status });
  return NextResponse.json({ error: "Something went wrong. Check the service configuration and try again." }, { status: 500 });
}
