import "@/styles/globals.css";
import "@/styles/workspace.css";
import "@/styles/cashflow.css";
import "@/styles/inventory.css";
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import TenantProvider from "@/lib/auth/tenant-provider";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins" });

export const metadata: Metadata = {
  title: "TripDash",
  description: "Operations and finance dashboard for open trips",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className="bg-gray-50">
        <TenantProvider>{children}</TenantProvider>
      </body>
    </html>
  );
}
