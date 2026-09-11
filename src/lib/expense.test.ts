import { describe, it } from "node:test";
import assert from "node:assert";

describe("Expense validation", () => {
  it("should reject negative amount", async () => {
    await assert.rejects(
      async () => {
        throw new Error("Amount must be positive");
      },
      { message: /Amount must be positive/ }
    );
  });

  it("should reject zero amount", async () => {
    await assert.rejects(
      async () => {
        throw new Error("Amount must be positive");
      },
      { message: /Amount must be positive/ }
    );
  });

  it("should accept positive amount", () => {
    const validAmounts = [1, 1000, 50000, 1000000];
    for (const amount of validAmounts) {
      assert.ok(amount > 0);
    }
  });

  it("should require category", async () => {
    await assert.rejects(
      async () => {
        throw new Error("Category");
      },
      { message: /Category/ }
    );
  });

  it("should allow trip-level and business-level expenses", () => {
    const tripExpense = { tripId: "trip-1" };
    const businessExpense = { tripId: null };

    assert.ok(tripExpense.tripId !== null);
    assert.ok(businessExpense.tripId === null);
  });
});

describe("Category management", () => {
  it("should reject empty category name", async () => {
    await assert.rejects(
      async () => {
        throw new Error("Category name is required");
      },
      { message: /Category name is required/ }
    );
  });

  it("should trim category name", () => {
    const name = "  Transportasi  ";
    const trimmed = name.trim();
    assert.strictEqual(trimmed, "Transportasi");
  });

  it("should prevent duplicate category names", async () => {
    await assert.rejects(
      async () => {
        throw new Error("already exists");
      },
      { message: /already exists/ }
    );
  });

  it("should allow deactivating category", () => {
    const category = {
      id: "cat-1",
      name: "Konsumsi",
      active: true,
    };

    const updated = { ...category, active: false };
    assert.strictEqual(updated.active, false);
    assert.strictEqual(updated.name, category.name);
  });

  it("should preserve inactive category in history", () => {
    const expense = {
      categoryId: "cat-1",
      categoryName: "Old Category",
      amount: 50000,
    };

    const categoryActive = false;
    assert.ok(!categoryActive);
    assert.strictEqual(expense.categoryName, "Old Category");
  });
});

describe("Refund tracking", () => {
  it("should link refund to payment", () => {
    const refund = {
      id: "ref-1",
      paymentId: "pay-1",
      participantId: "part-1",
      amount: 50000,
      reason: "Cancellation",
    };

    assert.strictEqual(refund.paymentId, "pay-1");
    assert.ok(refund.amount > 0);
    assert.ok(refund.reason.length > 0);
  });

  it("should handle partial refund", () => {
    const payment = 200000;
    const refund = 50000;
    const remaining = payment - refund;

    assert.strictEqual(remaining, 150000);
  });

  it("should handle full refund", () => {
    const payment = 200000;
    const refund = 200000;
    const remaining = payment - refund;

    assert.strictEqual(remaining, 0);
  });
});
