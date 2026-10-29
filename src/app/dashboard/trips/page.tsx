import type { Metadata } from "next";
import { Dashboard } from "@/components/tripdash/dashboard";
export const metadata: Metadata = { title: "Trip Schedule" };
export default function Page() { return <Dashboard section="trips" />; }
