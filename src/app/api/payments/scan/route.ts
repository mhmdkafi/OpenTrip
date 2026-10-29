import { NextRequest } from "next/server";
import { z } from "zod";
import { scanProofAmounts } from "@/lib/ocr/scan-proof";
import { unscannedProofs } from "@/lib/workspace/payment-queue";
import { apiError, clientWorkspace, loadWorkspace, requireWorkspace, saveWorkspace } from "@/lib/workspace/server";
import { DomainError } from "@/lib/workspace/commands";
export const runtime = "nodejs";
export const maxDuration = 60;

// Proofs read per request; the client asks again while `remaining` > 0.
const PER_CALL = 30;

// Streams newline-delimited JSON: one {proof, amount} line per proof as soon as it is read,
// then a final {done, state, revision, remaining} line after the amounts are saved.
// no-transform keeps compression from buffering the stream.
export async function POST(request: NextRequest) {
  try {
    const auth = await requireWorkspace();
    const { tripId } = z.object({ tripId: z.string().uuid().optional() }).parse(await request.json().catch(() => ({})));
    const { state } = await loadWorkspace(auth.tenantId);
    const proofs = unscannedProofs(state, tripId).slice(0, PER_CALL);
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        let open = true;
        const send = (line: unknown) => { if (open) try { controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`)); } catch { open = false; } };
        try {
          const amounts = await scanProofAmounts(proofs, (proof, amount) => send({ proof, amount }));
          // Save onto the latest revision; retry once if someone saved in between.
          for (let attempt = 0; ; attempt++) {
            const current = await loadWorkspace(auth.tenantId);
            for (const booking of current.state.bookings) if (amounts.has(booking.proof) && booking.proofAmount === undefined) booking.proofAmount = amounts.get(booking.proof);
            try {
              const revision = amounts.size ? await saveWorkspace(auth.tenantId, current.revision, current.state, current.exists) : current.revision;
              send({ done: true, state: clientWorkspace(current.state), revision, remaining: unscannedProofs(current.state, tripId).length });
              break;
            } catch (error) { if (!(error instanceof DomainError && error.status === 409) || attempt) throw error; }
          }
        } catch (error) { send({ error: error instanceof DomainError ? error.message : "Could not read the transfer proofs." }); }
        if (open) controller.close();
      },
    });
    return new Response(body, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" } });
  } catch (error) { return apiError(error); }
}
