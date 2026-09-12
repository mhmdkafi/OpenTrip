import { notFound } from "next/navigation";
import { Dashboard } from "@/components/tripdash/dashboard";
import { WorkspaceProvider } from "@/components/tripdash/context";
import { AppShell } from "@/components/tripdash/shell";
export default async function PrototypePage({params}:{params:Promise<{section?:string[]}>}) {
  const {section}=await params;
  const current=section?.[0] ?? "overview";
  if ((section?.length ?? 0)>1 || !["overview","trips","participants","attendance","finance","inventory","settings"].includes(current)) notFound();
  return <WorkspaceProvider prototype><AppShell><Dashboard section={current}/></AppShell></WorkspaceProvider>;
}
