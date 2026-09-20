import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { requireMembership } from "@/lib/auth/membership";
import { apiError } from "@/lib/workspace/server";

const switchTenantSchema = z.object({
  tenantId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = switchTenantSchema.parse(body);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        success: false,
        error: "User tidak login"
      }, { status: 401 });
    }

    await requireMembership(supabase, user.id, validated.tenantId);

    const response = NextResponse.json({
      success: true,
      message: "Berhasil pindah tenant"
    });

    response.cookies.set("tenant-id", validated.tenantId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: error.issues[0].message
      }, { status: 400 });
    }

    return apiError(error);
  }
}
