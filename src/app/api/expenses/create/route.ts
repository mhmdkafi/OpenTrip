import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createExpense } from "@/lib/expense";
import { z } from "zod";

const createExpenseSchema = z.object({
  tripId: z.string().uuid().nullable(),
  categoryId: z.string().uuid(),
  amount: z.number().positive(),
  occurredAt: z.string().datetime(),
  description: z.string().optional(),
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
    const validated = createExpenseSchema.parse(body);

    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    const expenseId = await createExpense({
      tripId: validated.tripId,
      tenantId,
      categoryId: validated.categoryId,
      amount: validated.amount,
      occurredAt: new Date(validated.occurredAt),
      description: validated.description,
      createdBy: user.id,
    });

    return NextResponse.json({ id: expenseId }, { status: 201 });
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
