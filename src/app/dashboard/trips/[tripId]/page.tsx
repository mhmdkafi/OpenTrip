import { Dashboard } from "@/components/tripdash/dashboard";
export default async function TripPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  return <Dashboard section="trips" tripId={tripId}/>;
}
