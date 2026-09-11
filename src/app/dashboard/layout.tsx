"use client";

import { Sidebar } from "@/components/sidebar";
import { UserMenu } from "@/components/user-menu";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>
          </div>
          <UserMenu />
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
