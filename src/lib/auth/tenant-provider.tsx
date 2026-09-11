import { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth/context";

export default function TenantProvider({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}