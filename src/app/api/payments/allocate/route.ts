import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

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

const mockPayments = new Map<string, {
  totalAmount: number;
  allocations: Array<{ participantId: string; amount: number }>;
}>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idempotencyKey, paymentId } = body;

    if (processedKeys.has(idempotencyKey)) {
      return NextResponse.json(
        { error: "Permintaan duplikat terdeteksi" },
        { status: 409 }
      );
    }

    const data = allocatePaymentSchema.parse(body);

    const payment = mockPayments.get(paymentId);
    if (!payment) {
      return NextResponse.json(
        { error: "Pembayaran tidak ditemukan" },
        { status: 404 }
      );
    }

    const totalAllocated = data.allocations.reduce((sum, a) => sum + a.amount, 0);
    const remainingUnallocated = payment.totalAmount - 
      payment.allocations.reduce((sum, a) => sum + a.amount, 0);

    if (totalAllocated > remainingUnallocated) {
      return NextResponse.json(
        { error: "Total alokasi melebihi dana tersisa pada pembayaran" },
        { status: 400 }
      );
    }

    for (const allocation of data.allocations) {
      const existingAllocation = payment.allocations.find(a => a.participantId === allocation.participantId);
      if (existingAllocation) {
        existingAllocation.amount += allocation.amount;
      } else {
        payment.allocations.push(allocation);
      }
    }

    const newUnallocated = payment.totalAmount - 
      payment.allocations.reduce((sum, a) => sum + a.amount, 0);

    processedKeys.add(idempotencyKey);
    mockPayments.set(paymentId, payment);

    return NextResponse.json({
      success: true,
      paymentId,
      allocations: data.allocations,
      totalAllocated,
      remainingUnallocated: newUnallocated,
      message: "Alokasi berhasil disimpan",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validasi gagal", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Payment allocation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export function initializeMockPayment(paymentId: string, totalAmount: number) {
  mockPayments.set(paymentId, {
    totalAmount,
    allocations: [],
  });
  return paymentId;
}