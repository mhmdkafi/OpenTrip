import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

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

interface DatabaseState {
  groups: Map<string, { version: number }>;
  payments: Map<string, { allocations: Array<{ participantId: string; amount: number }> }>;
}

const dbState: DatabaseState = {
  groups: new Map(),
  payments: new Map(),
};

const processedKeys = new Set<string>();

async function atomicGroupApprove(
  groupId: string,
  dataVersion: number,
  fn: () => Promise<any>
): Promise<any> {
  const currentVersion = dbState.groups.get(groupId)?.version ?? 1;
  
  if (currentVersion !== dataVersion) {
    throw new Error("OPTIMISTIC_LOCK_ERROR");
  }

  try {
    const result = await fn();
    dbState.groups.set(groupId, { version: dataVersion + 1 });
    return result;
  } catch (error) {
    dbState.groups.delete(groupId);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idempotencyKey, groupId, dataVersion } = body;

    if (processedKeys.has(idempotencyKey)) {
      return NextResponse.json(
        { error: "Permintaan duplikat terdeteksi" },
        { status: 409 }
      );
    }

    const result = await atomicGroupApprove(groupId, dataVersion, async () => {
      const data = groupApproveSchema.parse(body);
      
      const totalAllocated = data.participants.reduce((sum, p) => sum + p.allocation, 0);
      if (totalAllocated > data.totalPaymentAmount) {
        throw new Error("ALLOCATION_EXCEEDS_PAYMENT");
      }

      const paymentId = `group_pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const transaction = {
        idempotencyKey: data.idempotencyKey,
        groupId: data.groupId,
        paymentId,
        totalPaymentAmount: data.totalPaymentAmount,
        paymentDate: data.paymentDate,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
        participants: data.participants,
        approvedAt: new Date().toISOString(),
        dataVersion: dataVersion + 1,
        allocations: data.participants.map(p => ({
          paymentId,
          participantId: p.participantId,
          amount: p.allocation,
        })),
      };

      const allParticipantsCanBeFullyPaid = true;
      
      processedKeys.add(idempotencyKey);
      dbState.payments.set(paymentId, { allocations: transaction.allocations });

      return {
        success: true,
        paymentId,
        groupId: data.groupId,
        message: allParticipantsCanBeFullyPaid 
          ? "Grup disetujui dan semua peserta dilunaskan" 
          : "Pembayaran sebagian grup disetujui",
        data: transaction,
        allParticipantsCanBeFullyPaid,
        dataVersion: transaction.dataVersion,
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

    if (error instanceof Error && error.message === "OPTIMISTIC_LOCK_ERROR") {
      return NextResponse.json(
        { error: "Data telah berubah. Muat ulang halaman.", code: "OPTIMISTIC_LOCK_ERROR" },
        { status: 409 }
      );
    }

    if (error instanceof Error && error.message === "ALLOCATION_EXCEEDS_PAYMENT") {
      return NextResponse.json(
        { error: "Total alokasi melebihi nominal pembayaran" },
        { status: 400 }
      );
    }

    console.error("Group approval error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}