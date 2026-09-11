import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const verifyPaymentSchema = z.object({
  idempotencyKey: z.string().uuid(),
  participantId: z.string().uuid(),
  amount: z.number().positive().max(100000000),
  paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paymentMethod: z.enum(["transfer", "cash", "other"]),
  notes: z.string().max(500).optional(),
  markAsFullyPaid: z.boolean().default(false),
  timestamp: z.string().datetime(),
});

const groupApproveSchema = z.object({
  idempotencyKey: z.string().uuid(),
  groupId: z.string(),
  participants: z.array(z.object({
    participantId: z.string().uuid(),
    allocation: z.number().nonnegative(),
  })),
  totalPaymentAmount: z.number().positive(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paymentMethod: z.enum(["transfer", "cash", "other"]),
  notes: z.string().max(500).optional(),
  dataVersion: z.number().positive(),
  timestamp: z.string().datetime(),
});

const allocatePaymentSchema = z.object({
  idempotencyKey: z.string().uuid(),
  paymentId: z.string().uuid(),
  allocations: z.array(z.object({
    participantId: z.string().uuid(),
    amount: z.number().nonnegative(),
  })),
  timestamp: z.string().datetime(),
});

const processedKeys = new Set<string>();

async function processTransaction<T>(idempotencyKey: string, fn: () => Promise<T>): Promise<T> {
  if (processedKeys.has(idempotencyKey)) {
    throw new Error("DUPLICATE_REQUEST");
  }

  processedKeys.add(idempotencyKey);

  try {
    const result = await fn();
    return result;
  } catch (error) {
    processedKeys.delete(idempotencyKey);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idempotencyKey } = body;

    const result = await processTransaction(idempotencyKey, async () => {
      const data = verifyPaymentSchema.parse(body);
      
      const transaction = {
        idempotencyKey: data.idempotencyKey,
        participantId: data.participantId,
        amount: data.amount,
        paidDate: data.paidDate,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
        markAsFullyPaid: data.markAsFullyPaid,
        verifiedAt: new Date().toISOString(),
        status: "verified",
        paymentId: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };

      return {
        success: true,
        paymentId: transaction.paymentId,
        message: data.markAsFullyPaid ? "Pembayaran lunas diverifikasi" : "DP/Belum Lunas diverifikasi",
        data: transaction,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validasi gagal", details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "DUPLICATE_REQUEST") {
      return NextResponse.json(
        { error: "Permintaan duplikat terdeteksi" },
        { status: 409 }
      );
    }

    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}