import { NextResponse } from "next/server";
import { apiError, requireWorkspace } from "@/lib/workspace/server";

// Retire the old endpoint explicitly; all imports use workspace Google OAuth.
export async function POST() {
  try {
    await requireWorkspace();
    return NextResponse.json({ error: "Impor publik dinonaktifkan. Hubungkan Google di Pengaturan lalu gunakan impor Trip Schedule." }, { status: 410 });
  } catch (error) { return apiError(error); }
}
