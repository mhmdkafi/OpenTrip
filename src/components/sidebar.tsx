"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Users,
  FileText,
  CreditCard,
  Settings,
  Home,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Ringkasan", icon: Home },
  { href: "/trips", label: "Trip", icon: BarChart3 },
  { href: "/participants", label: "Peserta & Pembayaran", icon: Users },
  { href: "/attendance", label: "Absensi", icon: FileText },
  { href: "/finance", label: "Keuangan", icon: CreditCard },
  { href: "/settings", label: "Pengaturan", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-40 p-2 rounded-lg bg-white border border-gray-200 lg:hidden"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 transition-transform duration-300 z-30 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">OpenTrip Dash</h1>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
