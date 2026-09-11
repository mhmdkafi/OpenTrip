import { NextRequest, NextResponse } from "next/server";
import { renderAttendanceTemplate } from "@/lib/pdf/attendance-template";
import { generatePdf } from "@/lib/pdf/generator";
import { renderUnpaidAttachment } from "@/lib/pdf/unpaid-attachment";
import { activeParticipants, AttendanceDocument, AttendanceParticipant } from "@/lib/pdf/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { tripId?: string; includeUnpaidAttachment?: boolean; document?: AttendanceDocument; participants?: AttendanceParticipant[] };
    const document = body.document ?? {
      tripId: body.tripId ?? "export",
      title: "Absensi OpenTrip",
      organizer: "OpenTrip Dash",
      version: 1,
      snapshotAt: new Date(),
    };
    const participants = activeParticipants(body.participants ?? []);
    const attendanceHtml = renderAttendanceTemplate({ ...document, snapshotAt: new Date(document.snapshotAt) }, participants);
    const html = body.includeUnpaidAttachment ? `${attendanceHtml}<div style="break-before:page"></div>${renderUnpaidAttachment(document, participants)}` : attendanceHtml;
    const pdfBuffer = await generatePdf(html);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": pdfBuffer.subarray(0, 4).toString() === "%PDF" ? "application/pdf" : "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="attendance-${document.tripId}.pdf"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to export PDF" }, { status: 500 });
  }
}
