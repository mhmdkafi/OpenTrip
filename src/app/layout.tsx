import "@/styles/globals.css";
import type { Metadata } from "next";
import TenantProvider from "@/lib/auth/tenant-provider";

export const metadata: Metadata = {
  title: "OpenTrip Dash",
  description: "Dashboard manajemen operasional dan keuangan open trip",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-gray-50">
        <TenantProvider>{children}</TenantProvider>
      </body>
    </html>
  );
}
