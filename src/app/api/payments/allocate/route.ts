import { NextResponse } from "next/server";
import { apiError, requireWorkspace } from "@/lib/workspace/server";
export async function POST() {
  try { await requireWorkspace(); return NextResponse.json({error:"Gunakan alur TripDash terbaru. Endpoint prototipe ini sudah dihentikan."},{status:410}); } catch(e) { return apiError(e); }
}
