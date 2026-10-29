import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { scanProofAmount } from "@/lib/ocr/scan-proof";
import { unscannedProofs } from "@/lib/workspace/payment-queue";
import { apiError, clientWorkspace, loadWorkspace, requireWorkspace, saveWorkspace } from "@/lib/workspace/server";
import { DomainError } from "@/lib/workspace/commands";
export const runtime = "nodejs";
export const maxDuration = 60;

// Reads transfer amounts from a few proofs per call so each request stays short; the client calls again while `remaining` > 0.
const PER_CALL = 6;

export async function POST(request: NextRequest) {
  try {
    const auth = await requireWorkspace();
    const { tripId } = z.object({ tripId: z.string().uuid().optional() }).parse(await request.json().catch(() => ({})));
    const { state } = await loadWorkspace(auth.tenantId);
    const proofs = unscannedProofs(state, tripId).slice(0, PER_CALL);
    const amounts = new Map<string, number | null>();
    for (const proof of proofs) amounts.set(proof, await scanProofAmount(proof).catch(() => null));
    // Save onto the latest revision; retry once if someone saved in between.
    for (let attempt = 0; ; attempt++) {
      const current = await loadWorkspace(auth.tenantId);
      for (const booking of current.state.bookings) if (amounts.has(booking.proof) && booking.proofAmount === undefined) booking.proofAmount = amounts.get(booking.proof);
      try {
        const revision = amounts.size ? await saveWorkspace(auth.tenantId, current.revision, current.state, current.exists) : current.revision;
        return NextResponse.json({ state: clientWorkspace(current.state), revision, remaining: unscannedProofs(current.state, tripId).length });
      } catch (error) { if (!(error instanceof DomainError && error.status === 409) || attempt) throw error; }
    }
  } catch (error) { return apiError(error); }
}
