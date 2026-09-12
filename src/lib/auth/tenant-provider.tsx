"use client";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AuthProvider } from "@/lib/auth/context";
export default function TenantProvider({ children }: { children: ReactNode }) {
 const path=usePathname();
 return path.startsWith("/prototype") ? children : <AuthProvider>{children}</AuthProvider>;
}
