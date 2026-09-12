import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/workspace/server";
export async function requireAuth() {
  try { return (await requireWorkspace()).tenantId; } catch { redirect("/login"); }
}
export async function getCurrentTenant() {
  try { return (await requireWorkspace()).tenantId; } catch { return null; }
}
