export type AttendanceParticipant = {
  id: string;
  bookingId: string;
  name: string;
  meetingPoint: string | null;
  status: "active" | "cancelled";
  bookerName?: string | null;
  contact?: string | null;
  charge?: number;
  paid?: number;
  sharedBilling?: boolean;
};

export type AttendanceDocument = {
  tripId: string;
  title: string;
  organizer: string;
  version: number;
  snapshotAt: Date;
};

export function activeParticipants(participants: AttendanceParticipant[]) {
  return participants.filter((participant) => participant.status === "active");
}

export function unpaidParticipants(participants: AttendanceParticipant[]) {
  return activeParticipants(participants).filter(
    (participant) => Math.max(0, (participant.charge ?? 0) - (participant.paid ?? 0)) > 0,
  );
}
