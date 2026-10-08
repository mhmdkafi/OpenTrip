import { redirect } from "next/navigation";
import { getCurrentTenant } from "@/lib/auth/server";

export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  // Signed-in users go straight to the dashboard without a client-side session check.
  if (await getCurrentTenant()) redirect("/dashboard");
  return children;
}
