import { reconcileLedger, getBalance } from "./ledger";
import type { ReconciliationSummary, ReconciliationDetail, BalanceResult } from "./ledger";

export type FilterType = "week" | "month" | "year" | "custom";

export interface PeriodFilter {
  filterType: FilterType;
  startDate: Date;
  endDate: Date;
}

export interface CashFlowReport {
  summary: ReconciliationSummary;
  details: ReconciliationDetail[];
  period: PeriodFilter;
  tripId: string | null;
}

export function calculatePeriodBoundaries(filterType: FilterType, referenceDate: Date): PeriodFilter {
  const tz = "Asia/Jakarta";
  const ref = new Date(referenceDate.toLocaleString("en-US", { timeZone: tz }));

  let startDate: Date;
  let endDate: Date;

  switch (filterType) {
    case "week": {
      const dayOfWeek = ref.getDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startDate = new Date(ref);
      startDate.setDate(ref.getDate() - daysFromMonday);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);
      break;
    }

    case "month": {
      startDate = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(ref.getFullYear(), ref.getMonth() + 1, 1, 0, 0, 0, 0);
      break;
    }

    case "year": {
      startDate = new Date(ref.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDate = new Date(ref.getFullYear() + 1, 0, 1, 0, 0, 0, 0);
      break;
    }

    case "custom": {
      startDate = new Date(ref);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(ref);
      endDate.setDate(ref.getDate() + 1);
      endDate.setHours(0, 0, 0, 0);
      break;
    }
  }

  return {
    filterType,
    startDate,
    endDate,
  };
}

export function createCustomPeriod(startDate: Date, endDate: Date): PeriodFilter {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  if (start >= end) {
    throw new Error("End date must be after start date");
  }

  return {
    filterType: "custom",
    startDate: start,
    endDate: end,
  };
}

export async function generateCashFlowReport(
  tripId: string | null,
  period: PeriodFilter
): Promise<CashFlowReport> {
  const { summary, details } = await reconcileLedger(tripId, {
    startDate: period.startDate,
    endDate: period.endDate,
  });

  return {
    summary,
    details,
    period,
    tripId,
  };
}

export async function getBalanceForPeriod(tripId: string | null, period: PeriodFilter): Promise<BalanceResult> {
  return getBalance(tripId, {
    startDate: period.startDate,
    endDate: period.endDate,
  });
}

export function filterByTrip(tripId: string | null): string | null {
  if (!tripId || tripId === "all") {
    return null;
  }
  return tripId;
}

export function filterByPeriod(
  startDate: Date,
  endDate: Date,
  filterType: FilterType = "custom"
): PeriodFilter {
  if (filterType === "custom") {
    return createCustomPeriod(startDate, endDate);
  }

  return calculatePeriodBoundaries(filterType, startDate);
}
