import { Suspense } from "react";
import { WorkspaceProvider } from "@/components/tripdash/context";
import { AppShell } from "@/components/tripdash/shell";
import { DashboardSkeleton } from "@/components/tripdash/dashboard-skeleton";
import { requireAuth } from "@/lib/auth/server";
import { clientWorkspace, loadWorkspaceForRender } from "@/lib/workspace/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const tenantId = await requireAuth();
  // The skeleton streams at once; the workspace replaces it as soon as it has loaded.
  return <Suspense fallback={<DashboardSkeleton/>}><Workspace tenantId={tenantId}>{children}</Workspace></Suspense>;
}

async function Workspace({ tenantId, children }: { tenantId: string; children: React.ReactNode }) {
  // Ship the workspace with the first render so pages never show a loading state of their own.
  const initial = await loadWorkspaceForRender(tenantId).then(async ({ state, revision }) => ({ state: await clientWorkspace(state), revision })).catch(() => null);
  return <WorkspaceProvider key={tenantId} initial={initial}><AppShell>{children}</AppShell></WorkspaceProvider>;
}
