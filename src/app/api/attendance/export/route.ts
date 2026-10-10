import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { renderAttendancePdf } from "@/lib/pdf/attendance-pdf";
import { apiError, loadWorkspace, requireWorkspace } from "@/lib/workspace/server";
import { DomainError } from "@/lib/workspace/commands";
export const runtime = "nodejs";

// Read once per server instance; fall back to the public URL where the file system has no public/ folder.
let logo: Promise<Uint8Array | null> | null = null;
const loadLogo = (origin: string) => logo ??= readFile(path.join(process.cwd(), "public/brand/rimbaloka-logo-print.png"))
  .then(bytes => new Uint8Array(bytes))
  .catch(() => fetch(`${origin}/brand/rimbaloka-logo-print.png`).then(r => r.ok ? r.arrayBuffer().then(b => new Uint8Array(b)) : null).catch(() => null));

export async function POST(request: NextRequest) {
  try {
    const auth = await requireWorkspace();
    const { tripId } = z.object({ tripId: z.string().uuid() }).parse(await request.json());
    const { state } = await loadWorkspace(auth.tenantId);
    const trip = state.trips.find(t => t.id === tripId);
    if (!trip) throw new DomainError("Trip not found.", 404);
    const people = state.participants.filter(p => p.tripId === tripId && p.status === "active");
    if (!people.length) throw new DomainError("No active participants yet.");
    if (people.some(p => !p.name.trim() || !p.meetingPoint.trim())) throw new DomainError("Fill in every participant's name and meeting point before exporting.");
    // Registration order, like the sheet organisers already use.
    const registered = new Map(state.bookings.map(b => [b.id, b.registeredAt]));
    people.sort((a, b) => (registered.get(a.bookingId) ?? "").localeCompare(registered.get(b.bookingId) ?? ""));
    const title = `${trip.title}${trip.volume ? ` ${trip.volume}` : ""}`;
    const pdf = await renderAttendancePdf(title, people.map(p => ({ name: p.name, meetingPoint: p.meetingPoint })), await loadLogo(request.nextUrl.origin));
    const filename = `Absensi ${title}.pdf`;
    return new NextResponse(new Uint8Array(pdf), { headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^\w .-]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store",
    } });
  } catch (e) { return apiError(e); }
}
