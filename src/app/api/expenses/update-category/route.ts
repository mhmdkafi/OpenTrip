import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCategory, updateCategory } from "@/lib/expense";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(1),
  active: z.boolean().optional(),
  categoryId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = categorySchema.parse(body);

    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    if (validated.categoryId) {
      await updateCategory({
        categoryId: validated.categoryId,
        tenantId,
        name: validated.name,
        active: validated.active,
        updatedBy: user.id,
      });

      return NextResponse.json({ id: validated.categoryId }, { status: 200 });
    } else {
      const categoryId = await createCategory({
        tenantId,
        name: validated.name,
        active: validated.active ?? true,
        createdBy: user.id,
      });

      return NextResponse.json({ id: categoryId }, { status: 201 });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.flatten().fieldErrors }, { status: 400 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
