import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, clientWorkspace, loadWorkspace, requireWorkspace, saveWorkspace } from "@/lib/workspace/server";
import { DomainError } from "@/lib/workspace/commands";
import { importSpreadsheet } from "@/lib/workspace/auto-import";
import { readPublicSheet } from "@/lib/workspace/public-sheet";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireWorkspace();
    const body = z.object({ spreadsheetUrl: z.url().max(1000), revision: z.number().int().nonnegative(), tripId: z.uuid().optional(), departureDate: z.iso.date().optional() }).parse(await request.json());
    const current = await loadWorkspace(auth.tenantId);
    if (current.revision !== body.revision) throw new DomainError("Data changed. Reload before importing.", 409);
    const { metadata, sheet, values } = await readPublicSheet(body.spreadsheetUrl);
    const result = importSpreadsheet(current.state, metadata, sheet, values, auth.userId, body.tripId, body.departureDate);
    const revision = await saveWorkspace(auth.tenantId, current.revision, result.state, current.exists);
    return NextResponse.json({ ...result, state: clientWorkspace(result.state), revision });
  } catch (error) { return apiError(error); }
}
