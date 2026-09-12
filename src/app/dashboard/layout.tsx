import { WorkspaceProvider } from "@/components/tripdash/context";
import { AppShell } from "@/components/tripdash/shell";
import { requireAuth } from "@/lib/auth/server";
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
 const tenantId=await requireAuth();
 return <WorkspaceProvider key={tenantId}><AppShell>{children}</AppShell></WorkspaceProvider>;
}
