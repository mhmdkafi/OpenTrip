import { NextRequest, NextResponse } from "next/server";
import { apiError, loadWorkspace, requireWorkspace } from "@/lib/workspace/server";
import { DomainError } from "@/lib/workspace/commands";

// Serves an inventory photo stored as a data URI. The URL carries a content hash,
// so the browser can cache it until the photo changes.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const auth = await requireWorkspace();
    const { itemId } = await params;
    const { state } = await loadWorkspace(auth.tenantId);
    const match = state.inventory.find(item => item.id === itemId)?.imageUrl?.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
    if (!match) throw new DomainError("Photo not found.", 404);
    return new NextResponse(Buffer.from(match[2], "base64"), { headers: { "Content-Type": match[1], "Cache-Control": "private, max-age=31536000, immutable" } });
  } catch (error) { return apiError(error); }
}
