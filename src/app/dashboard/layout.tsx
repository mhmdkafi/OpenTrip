import { WorkspaceProvider } from "@/components/tripdash/context";
import { AppShell } from "@/components/tripdash/shell";
import { requireAuth } from "@/lib/auth/server";
import { loadWorkspace } from "@/lib/workspace/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const tenantId = await requireAuth();
  // Ship the workspace with the first render so pages never show a loading state.
  const initial = await loadWorkspace(tenantId).then(({ state, revision }) => ({ state, revision })).catch(() => null);
  return <WorkspaceProvider key={tenantId} initial={initial}><AppShell>{children}</AppShell></WorkspaceProvider>;
}
