import type { Metadata } from "next";
import { Dashboard } from "@/components/tripdash/dashboard";
export const metadata: Metadata = { title: "Inventory" };
export default function Page() { return <Dashboard section="inventory" />; }
