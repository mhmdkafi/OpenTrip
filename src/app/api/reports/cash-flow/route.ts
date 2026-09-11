import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCashFlowReport, filterByTrip, calculatePeriodBoundaries, createCustomPeriod } from "@/lib/report";
import { z } from "zod";
import type { FilterType } from "@/lib/report";

const reportQuerySchema = z.object({
  tripId: z.string().optional(),
  filterType: z.enum(["week", "month", "year", "custom"]),
  referenceDate: z.string().datetime().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      tripId: searchParams.get("tripId") || undefined,
      filterType: searchParams.get("filterType") || "month",
      referenceDate: searchParams.get("referenceDate") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
    };

    const validated = reportQuerySchema.parse(queryParams);

    const tripId = filterByTrip(validated.tripId || "all");

    let period;
    if (validated.filterType === "custom") {
      if (!validated.startDate || !validated.endDate) {
        return NextResponse.json(
          { error: "startDate and endDate required for custom period" },
          { status: 400 }
        );
      }
      period = createCustomPeriod(new Date(validated.startDate), new Date(validated.endDate));
    } else {
      const refDate = validated.referenceDate ? new Date(validated.referenceDate) : new Date();
      period = calculatePeriodBoundaries(validated.filterType as FilterType, refDate);
    }

    const report = await generateCashFlowReport(tripId, period);

    return NextResponse.json(report, { status: 200 });
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
