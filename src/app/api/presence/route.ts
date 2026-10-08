import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, requireWorkspace } from "@/lib/workspace/server";

// Heartbeat from an open dashboard tab; app_metadata keys merge, so other metadata is kept.
export async function POST() {
  try {
    const auth = await requireWorkspace();
    await createAdminClient().auth.admin.updateUserById(auth.userId, { app_metadata: { last_seen_at: new Date().toISOString() } });
    return new NextResponse(null, { status: 204 });
  } catch (error) { return apiError(error); }
}
