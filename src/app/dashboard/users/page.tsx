import { UsersPage } from "@/components/tripdash/users";
import { requireWorkspace } from "@/lib/workspace/server";
import { listUsers } from "@/lib/workspace/users";

export default async function Page() {
  const auth = await requireWorkspace();
  const initial = await listUsers(auth.tenantId, auth.role).catch(() => null);
  return <UsersPage initial={initial}/>;
}
