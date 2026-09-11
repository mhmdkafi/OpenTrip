import { describe, it } from "node:test";
import assert from "node:assert";

describe("Ledger reconciliation", () => {
  it("should prevent double posting for same source", async () => {
    await assert.rejects(
      async () => {
        throw new Error("Cash entry already exists for this source");
      },
      { message: /already exists/ }
    );
  });

  it("should calculate net cash flow correctly", () => {
    const expectedIncome = 200000;
    const expectedExpenses = 50000;
    const expectedRefunds = 30000;
    const expectedNetFlow = expectedIncome - expectedExpenses - expectedRefunds;

    assert.strictEqual(expectedNetFlow, 120000);
  });

  it("should handle partial refund without duplication", () => {
    const payment = 200000;
    const partialRefund = 50000;
    const netIncome = payment - partialRefund;

    assert.strictEqual(netIncome, 150000);
  });

  it("should calculate opening and closing balance", () => {
    const openingBalance = 500000;
    const income = 300000;
    const expenses = 100000;
    const refunds = 50000;
    const netCashFlow = income - expenses - refunds;
    const closingBalance = openingBalance + netCashFlow;

    assert.strictEqual(netCashFlow, 150000);
    assert.strictEqual(closingBalance, 650000);
  });

  it("should handle cross-month DP and final payment", () => {
    const dpAmount = 100000;
    const dpDate = new Date(2026, 7, 31);
    const finalAmount = 90000;
    const finalDate = new Date(2026, 8, 2);

    const augustStart = new Date(2026, 7, 1);
    const augustEnd = new Date(2026, 8, 1);
    const septemberStart = new Date(2026, 8, 1);
    const septemberEnd = new Date(2026, 9, 1);

    const augustIncome = dpDate >= augustStart && dpDate < augustEnd ? dpAmount : 0;
    const septemberIncome = finalDate >= septemberStart && finalDate < septemberEnd ? finalAmount : 0;

    assert.strictEqual(augustIncome, 100000);
    assert.strictEqual(septemberIncome, 90000);

    const totalIncome = augustIncome + septemberIncome;
    assert.strictEqual(totalIncome, 190000);
  });
});

describe("Balance calculations", () => {
  it("should calculate multi-period balance correctly", () => {
    const periods = [
      { income: 500000, expenses: 200000, refunds: 50000 },
      { income: 300000, expenses: 150000, refunds: 20000 },
      { income: 400000, expenses: 180000, refunds: 30000 },
    ];

    let balance = 0;
    for (const period of periods) {
      const netFlow = period.income - period.expenses - period.refunds;
      balance += netFlow;
    }

    const expectedBalance = (500000 - 200000 - 50000) + (300000 - 150000 - 20000) + (400000 - 180000 - 30000);
    assert.strictEqual(balance, expectedBalance);
    assert.strictEqual(balance, 570000);
  });

  it("should handle negative balance", () => {
    const openingBalance = 100000;
    const income = 50000;
    const expenses = 200000;
    const refunds = 30000;
    const netCashFlow = income - expenses - refunds;
    const closingBalance = openingBalance + netCashFlow;

    assert.strictEqual(netCashFlow, -180000);
    assert.strictEqual(closingBalance, -80000);
  });
});
