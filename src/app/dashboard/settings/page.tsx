import { Dashboard } from "@/components/tripdash/dashboard";
import { SyncSchedule } from "@/components/tripdash/sync-schedule";
import { TenantSwitcher } from "@/components/tripdash/tenant-switcher";
export default function Page() { return <><TenantSwitcher/><Dashboard section="settings" /><SyncSchedule/></>; }
