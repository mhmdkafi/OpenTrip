import { db } from "@/db";
import { cashEntries, auditEvents, payments, expenses, refunds } from "@/db/schema";
import { eq, and, gte, lt, sql } from "drizzle-orm";
import type { CashEntry } from "@/types";

export type CashEntrySource = "payment" | "expense" | "refund";
export type CashDirection = "in" | "out";

export interface CreateCashEntryParams {
  tripId: string;
  tenantId: string;
  sourceType: CashEntrySource;
  sourceId: string;
  direction: CashDirection;
  amount: number;
  occurredAt: Date;
  createdBy: string;
  reversalOfId?: string;
}

export interface ReconciliationSummary {
  verified_income: number;
  paid_expenses: number;
  refunds: number;
  net_cash_flow: number;
  opening_balance: number;
  closing_balance: number;
}

export interface ReconciliationDetail extends CashEntry {
  source_type: string;
  category_name?: string;
  payment_method?: string;
}

export interface BalanceResult {
  opening_balance: number;
  net_cash_flow: number;
  closing_balance: number;
}

export async function createCashEntry(params: CreateCashEntryParams): Promise<string> {
  const { tripId, tenantId, sourceType, sourceId, direction, amount, occurredAt, createdBy, reversalOfId } = params;

  const existingEntry = await db
    .select({ id: cashEntries.id })
    .from(cashEntries)
    .where(
      and(
        eq(cashEntries.source_type, sourceType),
        eq(cashEntries.source_id, sourceId),
        sql`${cashEntries.reversal_of_id} IS NULL`
      )
    )
    .limit(1);

  if (existingEntry.length > 0 && !reversalOfId) {
    throw new Error("Cash entry already exists for this source");
  }

  const [entry] = await db
    .insert(cashEntries)
    .values({
      trip_id: tripId,
      tenant_id: tenantId,
      source_type: sourceType,
      source_id: sourceId,
      direction,
      amount: amount.toString(),
      occurred_at: occurredAt,
      reversal_of_id: reversalOfId,
      created_by: createdBy,
    })
    .returning({ id: cashEntries.id });

  await db.insert(auditEvents).values({
    tenant_id: tenantId,
    entity_type: "cash_entry",
    entity_id: entry.id,
    action: reversalOfId ? "reversal" : "create",
    new_values: JSON.stringify(params),
    created_by: createdBy,
  });

  return entry.id;
}

export async function createCashEntryFromPayment(
  paymentId: string,
  tripId: string,
  tenantId: string,
  amount: number,
  occurredAt: Date,
  createdBy: string
): Promise<string> {
  return createCashEntry({
    tripId,
    tenantId,
    sourceType: "payment",
    sourceId: paymentId,
    direction: "in",
    amount,
    occurredAt,
    createdBy,
  });
}

export async function createCashEntryFromExpense(
  expenseId: string,
  tripId: string,
  tenantId: string,
  amount: number,
  occurredAt: Date,
  createdBy: string
): Promise<string> {
  return createCashEntry({
    tripId,
    tenantId,
    sourceType: "expense",
    sourceId: expenseId,
    direction: "out",
    amount,
    occurredAt,
    createdBy,
  });
}

export async function createCashEntryFromRefund(
  refundId: string,
  tripId: string,
  tenantId: string,
  amount: number,
  occurredAt: Date,
  createdBy: string
): Promise<string> {
  return createCashEntry({
    tripId,
    tenantId,
    sourceType: "refund",
    sourceId: refundId,
    direction: "out",
    amount,
    occurredAt,
    createdBy,
  });
}

export interface ReconcilePeriod {
  startDate: Date;
  endDate: Date;
}

export async function reconcileLedger(
  tripId: string | null,
  period: ReconcilePeriod
): Promise<{ summary: ReconciliationSummary; details: ReconciliationDetail[] }> {
  const conditions = [gte(cashEntries.occurred_at, period.startDate), lt(cashEntries.occurred_at, period.endDate)];

  if (tripId && tripId !== "all") {
    conditions.push(eq(cashEntries.trip_id, tripId));
  }

  const entries = await db
    .select({
      id: cashEntries.id,
      trip_id: cashEntries.trip_id,
      tenant_id: cashEntries.tenant_id,
      source_type: cashEntries.source_type,
      source_id: cashEntries.source_id,
      direction: cashEntries.direction,
      amount: cashEntries.amount,
      occurred_at: cashEntries.occurred_at,
      reversal_of_id: cashEntries.reversal_of_id,
      created_by: cashEntries.created_by,
      created_at: cashEntries.created_at,
    })
    .from(cashEntries)
    .where(and(...conditions))
    .orderBy(cashEntries.occurred_at);

  const details: ReconciliationDetail[] = entries.map((e: typeof entries[0]) => ({
    id: e.id,
    trip_id: e.trip_id,
    tenant_id: e.tenant_id,
    source_type: e.source_type,
    source_id: e.source_id || undefined,
    direction: e.direction as "in" | "out",
    amount: Number(e.amount),
    occurred_at: e.occurred_at,
    reversal_of_id: e.reversal_of_id || undefined,
    created_by: e.created_by,
    created_at: e.created_at,
  }));

  let verified_income = 0;
  let paid_expenses = 0;
  let refunds = 0;

  for (const entry of details) {
    const amount = Number(entry.amount);
    if (entry.source_type === "payment" && entry.direction === "in") {
      verified_income += amount;
    } else if (entry.source_type === "expense" && entry.direction === "out") {
      paid_expenses += amount;
    } else if (entry.source_type === "refund" && entry.direction === "out") {
      refunds += amount;
    }
  }

  const net_cash_flow = verified_income - paid_expenses - refunds;

  const opening_balance = await getOpeningBalance(tripId, period.startDate);

  const summary: ReconciliationSummary = {
    verified_income,
    paid_expenses,
    refunds,
    net_cash_flow,
    opening_balance,
    closing_balance: opening_balance + net_cash_flow,
  };

  return { summary, details };
}

async function getOpeningBalance(tripId: string | null, beforeDate: Date): Promise<number> {
  const conditions = [lt(cashEntries.occurred_at, beforeDate)];

  if (tripId && tripId !== "all") {
    conditions.push(eq(cashEntries.trip_id, tripId));
  }

  const result = await db
    .select({
      total_in: sql<string>`COALESCE(SUM(CASE WHEN ${cashEntries.direction} = 'in' THEN ${cashEntries.amount}::numeric ELSE 0 END), 0)`,
      total_out: sql<string>`COALESCE(SUM(CASE WHEN ${cashEntries.direction} = 'out' THEN ${cashEntries.amount}::numeric ELSE 0 END), 0)`,
    })
    .from(cashEntries)
    .where(and(...conditions));

  if (!result[0]) return 0;

  const totalIn = Number(result[0].total_in);
  const totalOut = Number(result[0].total_out);

  return totalIn - totalOut;
}

export async function getBalance(tripId: string | null, period: ReconcilePeriod): Promise<BalanceResult> {
  const { summary } = await reconcileLedger(tripId, period);

  return {
    opening_balance: summary.opening_balance,
    net_cash_flow: summary.net_cash_flow,
    closing_balance: summary.closing_balance,
  };
}
