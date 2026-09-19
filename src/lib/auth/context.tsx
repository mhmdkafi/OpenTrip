"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AuthSession } from "@/types/auth";
import { login as loginAction, logout as logoutAction } from "@/actions/auth";

interface AuthContextType {
  session: AuthSession | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<{ success: boolean; error?: string }>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = React.useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const router = useRouter();
  const [supabase] = React.useState(() => createClient());

  const loadSession = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { session: authSession } } = await supabase.auth.getSession();

      if (!authSession) {
        setSession(null);
        return;
      }

      const response = await fetch("/api/auth/session");
      if (response.ok) {
        const data = await response.json();
        setSession(data.tenant?.id ? data : null);
      } else {
        setSession(null);
      }
    } catch (error) {
      console.error("Failed to load session:", error);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, [supabase.auth]);

  React.useEffect(() => {
    let active = true;

    const init = async () => {
      await loadSession();
    };

    if (active) init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        setTimeout(() => void loadSession(), 0);
      } else if (event === "SIGNED_OUT") {
        setSession(null);
      } else if (event === "USER_UPDATED") {
        setTimeout(() => void loadSession(), 0);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadSession, supabase.auth]);

  const login = async (email: string, password: string) => {
    try {
      const result = await loginAction({ email, password });
      if (!result.success) return result;

      await loadSession();
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "Login gagal" };
    }
  };

  const logout = async () => {
    try {
      const result = await logoutAction();
      if (!result.success) throw new Error(result.error);

      setSession(null);
      router.replace("/login");
      router.refresh();
    } catch (error) {
      throw error;
    }
  };

  const switchTenant = async (tenantId: string) => {
    try {
      const response = await fetch("/api/auth/switch-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });

      if (!response.ok) {
        throw new Error("Gagal pindah tenant");
      }

      await loadSession();
      router.refresh();

      return { success: true };
    } catch (error) {
      console.error("Switch tenant error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Gagal pindah tenant" };
    }
  };

  const refresh = async () => {
    await loadSession();
  };

  const value = {
    session,
    isLoading,
    login,
    logout,
    switchTenant,
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
