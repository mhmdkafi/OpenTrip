"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { LogOut, Settings, User, ChevronDown } from "lucide-react";
import { useState } from "react";

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { session, logout } = useAuth();
  const router = useRouter();

  if (!session) return null;

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-blue-600" />
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-gray-900">
            {session.user.email}
          </p>
          <p className="text-xs text-gray-500">{session.tenant.name}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">
                {session.user.email}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {session.tenant.name}
              </p>
            </div>
            
            <button
              onClick={() => {
                setIsOpen(false);
                router.push("/dashboard/settings");
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm">Pengaturan</span>
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}