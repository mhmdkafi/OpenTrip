import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { renderAttendanceTemplate } from "@/lib/pdf/attendance-template";
import { generatePdf } from "@/lib/pdf/generator";
import { apiError, loadWorkspace, requireWorkspace } from "@/lib/workspace/server";
import { DomainError } from "@/lib/workspace/commands";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const auth = await requireWorkspace();
    const { tripId } = z.object({ tripId: z.string().uuid() }).parse(await request.json());
    const { state, revision } = await loadWorkspace(auth.tenantId);
    const trip = state.trips.find(t=>t.id===tripId);
    if (!trip) throw new DomainError("Trip tidak ditemukan.",404);
    const people = state.participants.filter(p=>p.tripId===tripId&&p.status==="active");
    if (!people.length) throw new DomainError("Belum ada peserta aktif.");
    if (people.some(p=>!p.name.trim()||!p.meetingPoint.trim())) throw new DomainError("Lengkapi nama dan MEPO seluruh peserta sebelum ekspor.");
    const document = { tripId, title: `Absensi ${trip.title}`, organizer: "TripDash", version: revision, snapshotAt: new Date() };
    const html = renderAttendanceTemplate(document,people.map(p=>({id:p.id,bookingId:p.bookingId,name:p.name,meetingPoint:p.meetingPoint,status:p.status})));
    const pdf = await generatePdf(html);
    return new NextResponse(new Uint8Array(pdf),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="absensi-${tripId}.pdf"`,"Cache-Control":"private, no-store"}});
  } catch(e) { return apiError(e); }
}
