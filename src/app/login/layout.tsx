import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentTenant } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Login" };

export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  // Signed-in users go straight to the dashboard without a client-side session check.
  if (await getCurrentTenant()) redirect("/dashboard");
  return children;
}
