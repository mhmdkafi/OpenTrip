import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { applyCommand, commandSchema, DomainError } from "@/lib/workspace/commands";
import { apiError, clientWorkspace, loadWorkspace, requireWorkspace, saveWorkspace } from "@/lib/workspace/server";

export async function GET() {
  try { const auth = await requireWorkspace(); const { state, revision } = await loadWorkspace(auth.tenantId); return NextResponse.json({ state: clientWorkspace(state), revision }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return apiError(error); }
}
export async function POST(request: NextRequest) {
  try {
    const auth = await requireWorkspace();
    const body = z.object({ requestId: z.string().uuid(), revision: z.number().int().min(0), command: commandSchema }).parse(await request.json());
    const current = await loadWorkspace(auth.tenantId);
    if (current.state.requests.includes(body.requestId)) return NextResponse.json({ state: clientWorkspace(current.state), revision: current.revision });
    if (body.revision !== current.revision) throw new DomainError("Data has changed. Reload before saving.", 409);
    const state = applyCommand(current.state, body.command, auth.userId, body.requestId);
    const revision = await saveWorkspace(auth.tenantId, current.revision, state, current.exists);
    return NextResponse.json({ state: clientWorkspace(state), revision });
  } catch (error) { return apiError(error); }
}
