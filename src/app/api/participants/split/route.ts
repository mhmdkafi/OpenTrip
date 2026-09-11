import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const splitRequestSchema = z.object({
  bookingId: z.string().uuid(),
  participants: z.array(
    z.object({
      name: z.string().min(1),
      facility: z.string().min(1),
      meetingPoint: z.string().min(1),
      addOns: z.array(
        z.object({
          name: z.string(),
          pricePerUnit: z.number(),
          quantity: z.number().int().positive(),
        })
      ),
      adjustment: z.number(),
    })
  ),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, participants } = splitRequestSchema.parse(body);

    if (participants.length === 0) {
      return NextResponse.json(
        { error: "Minimal 1 peserta diperlukan" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      bookingId,
      participantCount: participants.length,
      message: "Split berhasil dikonfirmasi",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validasi gagal", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
