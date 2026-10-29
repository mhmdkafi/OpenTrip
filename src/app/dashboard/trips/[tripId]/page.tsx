import type { Metadata } from "next";
import { Dashboard } from "@/components/tripdash/dashboard";
import { requireWorkspace, loadWorkspaceForRender } from "@/lib/workspace/server";

// Tab shows the trip name; the workspace read is shared with the dashboard layout.
export async function generateMetadata({ params }: { params: Promise<{ tripId: string }> }): Promise<Metadata> {
  const { tripId } = await params;
  // Without a session the layout redirects to login; fall back to the section name here.
  const trip = await requireWorkspace().then(auth => loadWorkspaceForRender(auth.tenantId)).then(({ state }) => state.trips.find(t => t.id === tripId)).catch(() => undefined);
  return { title: trip ? `${trip.title}${trip.volume ? ` ${trip.volume}` : ""}` : "Trip Schedule" };
}

export default async function TripPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  return <Dashboard section="trips" tripId={tripId}/>;
}
