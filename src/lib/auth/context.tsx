"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { login as loginAction, logout as logoutAction } from "@/actions/auth";

interface AuthContextType {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session checks happen on the server (proxy and layouts); the client only signs in and out.
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const login = async (email: string, password: string) => {
    try {
      const result = await loginAction({ email, password });
      return result.success ? { success: true } : result;
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "Sign-in failed" };
    }
  };

  const logout = async () => {
    const result = await logoutAction();
    if (!result.success) throw new Error(result.error);
    router.replace("/login");
    router.refresh();
  };

  return <AuthContext.Provider value={{ login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
