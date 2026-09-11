import { db } from "@/db";
import { expenses, expenseCategories, auditEvents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createCashEntryFromExpense } from "./ledger";

export interface CreateExpenseParams {
  tripId: string | null;
  tenantId: string;
  categoryId: string;
  amount: number;
  occurredAt: Date;
  description?: string;
  createdBy: string;
}

export interface CreateCategoryParams {
  tenantId: string;
  name: string;
  active?: boolean;
  createdBy: string;
}

export interface UpdateCategoryParams {
  categoryId: string;
  tenantId: string;
  name?: string;
  active?: boolean;
  updatedBy: string;
}

export async function createExpense(params: CreateExpenseParams): Promise<string> {
  const { tripId, tenantId, categoryId, amount, occurredAt, description, createdBy } = params;

  if (amount <= 0) {
    throw new Error("Amount must be positive");
  }

  const category = await db
    .select({ id: expenseCategories.id, name: expenseCategories.name })
    .from(expenseCategories)
    .where(and(eq(expenseCategories.id, categoryId), eq(expenseCategories.tenant_id, tenantId)))
    .limit(1);

  if (category.length === 0) {
    throw new Error("Category not found");
  }

  const [expense] = await db
    .insert(expenses)
    .values({
      trip_id: tripId,
      tenant_id: tenantId,
      category_id: categoryId,
      amount: amount.toString(),
      occurred_at: occurredAt,
      description,
      created_by: createdBy,
    })
    .returning({ id: expenses.id });

  await db.insert(auditEvents).values({
    tenant_id: tenantId,
    entity_type: "expense",
    entity_id: expense.id,
    action: "create",
    new_values: JSON.stringify(params),
    created_by: createdBy,
  });

  if (tripId) {
    await createCashEntryFromExpense(expense.id, tripId, tenantId, amount, occurredAt, createdBy);
  }

  return expense.id;
}

export async function createCategory(params: CreateCategoryParams): Promise<string> {
  const { tenantId, name, active = true, createdBy } = params;

  if (!name || name.trim().length === 0) {
    throw new Error("Category name is required");
  }

  const existing = await db
    .select({ id: expenseCategories.id })
    .from(expenseCategories)
    .where(and(eq(expenseCategories.tenant_id, tenantId), eq(expenseCategories.name, name.trim())))
    .limit(1);

  if (existing.length > 0) {
    throw new Error("Category with this name already exists");
  }

  const [category] = await db
    .insert(expenseCategories)
    .values({
      tenant_id: tenantId,
      name: name.trim(),
      active,
    })
    .returning({ id: expenseCategories.id });

  await db.insert(auditEvents).values({
    tenant_id: tenantId,
    entity_type: "expense_category",
    entity_id: category.id,
    action: "create",
    new_values: JSON.stringify(params),
    created_by: createdBy,
  });

  return category.id;
}

export async function updateCategory(params: UpdateCategoryParams): Promise<void> {
  const { categoryId, tenantId, name, active, updatedBy } = params;

  const existing = await db
    .select({ id: expenseCategories.id, name: expenseCategories.name, active: expenseCategories.active })
    .from(expenseCategories)
    .where(and(eq(expenseCategories.id, categoryId), eq(expenseCategories.tenant_id, tenantId)))
    .limit(1);

  if (existing.length === 0) {
    throw new Error("Category not found");
  }

  const updates: Partial<{ name: string; active: boolean }> = {};
  if (name !== undefined) updates.name = name.trim();
  if (active !== undefined) updates.active = active;

  if (Object.keys(updates).length === 0) {
    return;
  }

  await db.update(expenseCategories).set(updates).where(eq(expenseCategories.id, categoryId));

  await db.insert(auditEvents).values({
    tenant_id: tenantId,
    entity_type: "expense_category",
    entity_id: categoryId,
    action: "update",
    old_values: JSON.stringify(existing[0]),
    new_values: JSON.stringify(updates),
    created_by: updatedBy,
  });
}

export async function getCategories(tenantId: string, includeInactive = false) {
  const conditions = [eq(expenseCategories.tenant_id, tenantId)];

  if (!includeInactive) {
    conditions.push(eq(expenseCategories.active, true));
  }

  return db
    .select({
      id: expenseCategories.id,
      name: expenseCategories.name,
      active: expenseCategories.active,
      created_at: expenseCategories.created_at,
    })
    .from(expenseCategories)
    .where(and(...conditions))
    .orderBy(expenseCategories.name);
}
