import { NextRequest, NextResponse } from "next/server";
import { apiError, requireWorkspace } from "@/lib/workspace/server";
import { DomainError } from "@/lib/workspace/commands";
import { inventoryPhoto } from "@/lib/workspace/photos";
export const runtime = "nodejs";

// Thumbnail sizes the list asks for; anything else gets the full photo.
const WIDTHS = new Set([96, 160]);

// Serves an inventory photo. The URL carries a content hash (?v=), so the browser can cache it
// until the photo changes; ?w=160 returns a small square thumbnail for list rows.
export async function GET(request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const auth = await requireWorkspace();
    const { itemId } = await params;
    const version = request.nextUrl.searchParams.get("v") ?? "";
    const width = Number(request.nextUrl.searchParams.get("w"));
    const photo = /^[0-9a-f]{12}$/.test(version) ? await inventoryPhoto(auth.tenantId, itemId, version, WIDTHS.has(width) ? width : undefined) : null;
    if (!photo) throw new DomainError("Photo not found.", 404);
    return new NextResponse(new Uint8Array(photo.bytes), { headers: { "Content-Type": photo.type, "Cache-Control": "private, max-age=31536000, immutable" } });
  } catch (error) { return apiError(error); }
}
