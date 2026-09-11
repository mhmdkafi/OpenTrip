import { describe, it } from "node:test";
import assert from "node:assert";
import {
  formatRupiah,
  parseRupiah,
  calculateBillStatus,
  calculateRemaining,
  calculateTotalBill,
  splitNames,
  validateSplitNames,
  BILL_STATUSES,
  PAYMENT_STATUSES,
  PARTICIPANT_STATUSES,
} from "@/lib/money";

describe("Money Utilities Validation", () => {
  describe("Payment Statuses", () => {
    it("has correct payment status constants", () => {
      assert.strictEqual(PAYMENT_STATUSES.PENDING, "pending");
      assert.strictEqual(PAYMENT_STATUSES.VERIFIED, "verified");
      assert.strictEqual(PAYMENT_STATUSES.REJECTED, "rejected");
    });

    it("validates payment status transitions", () => {
      const pending = PAYMENT_STATUSES.PENDING as string;
      const verified = PAYMENT_STATUSES.VERIFIED as string;
      const rejected = PAYMENT_STATUSES.REJECTED as string;

      assert.ok(pending !== verified);
      assert.ok(pending !== rejected);
      assert.ok(verified !== rejected);
    });
  });

  describe("Participant Statuses", () => {
    it("has correct participant status constants", () => {
      assert.strictEqual(PARTICIPANT_STATUSES.ACTIVE, "active");
      assert.strictEqual(PARTICIPANT_STATUSES.CANCELLED, "cancelled");
    });

    it("validates participant status transitions", () => {
      assert.ok((PARTICIPANT_STATUSES.ACTIVE as string) !== (PARTICIPANT_STATUSES.CANCELLED as string));
    });
  });

  describe("Bill Status Calculation Edge Cases", () => {
    it("handles zero total bill", () => {
      assert.strictEqual(calculateBillStatus(0, 0), BILL_STATUSES.PAID);
      assert.strictEqual(calculateBillStatus(0, 10000), BILL_STATUSES.PAID);
    });

    it("handles negative total bill", () => {
      assert.strictEqual(calculateBillStatus(-10000, 0), BILL_STATUSES.PAID);
      assert.strictEqual(calculateBillStatus(-10000, 10000), BILL_STATUSES.PAID);
      assert.strictEqual(calculateBillStatus(-10000, -10000), BILL_STATUSES.PAID);
    });

    it("handles partial payment exceeding bill", () => {
      assert.strictEqual(calculateBillStatus(100000, 150000), BILL_STATUSES.PAID);
    });

    it("handles negative payment", () => {
      assert.strictEqual(calculateBillStatus(100000, -50000), BILL_STATUSES.DP);
      assert.strictEqual(calculateBillStatus(100000, -100000), BILL_STATUSES.DP);
      assert.strictEqual(calculateBillStatus(100000, -150000), BILL_STATUSES.DP);
    });
  });

  describe("Remaining Calculation Edge Cases", () => {
    it("handles zero total bill", () => {
      assert.strictEqual(calculateRemaining(0, 0), 0);
      assert.strictEqual(calculateRemaining(0, 10000), 0);
    });

    it("handles negative total bill", () => {
      assert.strictEqual(calculateRemaining(-10000, 0), 0);
      assert.strictEqual(calculateRemaining(-10000, 5000), 0);
      assert.strictEqual(calculateRemaining(-10000, -5000), 0);
    });

    it("handles negative payment", () => {
      assert.strictEqual(calculateRemaining(100000, -50000), 150000);
      assert.strictEqual(calculateRemaining(100000, -100000), 200000);
      assert.strictEqual(calculateBillStatus(100000, -100000), BILL_STATUSES.DP);
    });

    it("ensures non-negative remaining", () => {
      assert.strictEqual(calculateRemaining(100000, 150000), 0);
      assert.strictEqual(calculateRemaining(100000, 200000), 0);
      assert.strictEqual(calculateRemaining(100000, 0), 100000);
    });
  });

  describe("Total Bill Calculation Edge Cases", () => {
    it("handles negative base amount", () => {
      assert.strictEqual(calculateTotalBill(-50000, 10000), -40000);
      assert.strictEqual(calculateTotalBill(-100000, 50000), -50000);
    });

    it("handles negative adjustment", () => {
      assert.strictEqual(calculateTotalBill(150000, -50000), 100000);
      assert.strictEqual(calculateTotalBill(100000, -150000), -50000);
    });

    it("handles both negative values", () => {
      assert.strictEqual(calculateTotalBill(-50000, -25000), -75000);
      assert.strictEqual(calculateTotalBill(-100000, 25000), -75000);
    });

    it("handles floating point numbers", () => {
      assert.strictEqual(calculateTotalBill(175000.50, 15000.25), 190000.75);
      assert.strictEqual(calculateTotalBill(110000.33, -10000.66), 99999.67);
    });
  });

  describe("Rupiah Parsing Edge Cases", () => {
    it("parses complex rupiah formats", () => {
      assert.strictEqual(parseRupiah("Rp 190.000,00"), 190000);
      assert.strictEqual(parseRupiah("IDR 190.000"), 190000);
      assert.strictEqual(parseRupiah("190.000"), 190000);
      assert.strictEqual(parseRupiah("190,000"), 190000);
      assert.strictEqual(parseRupiah("190000"), 190000);
    });

    it("handles negative amounts", () => {
      assert.strictEqual(parseRupiah("-Rp190.000"), -190000);
      assert.strictEqual(parseRupiah("Rp-190.000"), -190000);
      assert.strictEqual(parseRupiah("-190000"), -190000);
    });

    it("handles decimal amounts", () => {
      assert.strictEqual(parseRupiah("Rp190.000,50"), 190000);
      assert.strictEqual(parseRupiah("190.000,50"), 190000);
      assert.strictEqual(parseRupiah("190000.50"), 190000);
    });

    it("handles extreme values", () => {
      assert.strictEqual(parseRupiah("Rp 1.000.000.000"), 1000000000);
      assert.strictEqual(parseRupiah("Rp 999.999.999"), 999999999);
      assert.strictEqual(parseRupiah("Rp0"), 0);
    });

    it("handles invalid input gracefully", () => {
      assert.strictEqual(parseRupiah("not a number"), 0);
      assert.strictEqual(parseRupiah(""), 0);
      assert.strictEqual(parseRupiah("   "), 0);
      assert.strictEqual(parseRupiah("abc123def"), 123);
      assert.strictEqual(parseRupiah("Rp abc"), 0);
    });
  });

  describe("Name Splitting Edge Cases", () => {
    it("handles multiple separators", () => {
      assert.deepStrictEqual(splitNames("A + B, C\nD"), ["A", "B", "C", "D"]);
      assert.deepStrictEqual(splitNames("X, Y + Z"), ["X", "Y", "Z"]);
      assert.deepStrictEqual(splitNames("M\nN + O, P"), ["M", "N", "O", "P"]);
    });

    it("handles mixed whitespace", () => {
      assert.deepStrictEqual(splitNames("  A  +  B  "), ["A", "B"]);
      assert.deepStrictEqual(splitNames("\nA\n+\nB\n"), ["A", "B"]);
      assert.deepStrictEqual(splitNames("A,\nB"), ["A", "B"]);
    });

    it("handles empty strings", () => {
      assert.deepStrictEqual(splitNames(""), []);
      assert.deepStrictEqual(splitNames("   "), []);
      assert.deepStrictEqual(splitNames("\n\n"), []);
    });

    it("handles only separators", () => {
      assert.deepStrictEqual(splitNames("+"), []);
      assert.deepStrictEqual(splitNames(","), []);
      assert.deepStrictEqual(splitNames("\n"), []);
      assert.deepStrictEqual(splitNames("+++"), []);
      assert.deepStrictEqual(splitNames(", ,"), []);
    });

    it("handles names with special characters", () => {
      assert.deepStrictEqual(splitNames("O'Connor + D'Angelo"), ["O'Connor", "D'Angelo"]);
      assert.deepStrictEqual(splitNames("Budi-Wijaya + Tio-Ang"), ["Budi-Wijaya", "Tio-Ang"]);
      assert.deepStrictEqual(splitNames("Raka, S.T."), ["Raka", "S.T."]);
    });

    it("maintains name integrity", () => {
      const names = splitNames("Muhammad Ali + Budi Rahman");
      assert.strictEqual(names[0], "Muhammad Ali");
      assert.strictEqual(names[1], "Budi Rahman");
      
      const complexNames = splitNames("Dr. John Smith, Ph.D. + Prof. Jane Doe");
      assert.strictEqual(complexNames[0], "Dr. John Smith");
      assert.strictEqual(complexNames[1], "Ph.D.");
      assert.strictEqual(complexNames[2], "Prof. Jane Doe");
    });
  });

  describe("Name Validation Edge Cases", () => {
    it("validates names with special characters", () => {
      const result = validateSplitNames(["O'Connor", "D'Angelo"]);
      assert.strictEqual(result.valid, true);
      assert.deepStrictEqual(result.issues, []);
    });

    it("detects whitespace-only names", () => {
      const result = validateSplitNames(["Valid Name", "   ", "Another Name"]);
      assert.strictEqual(result.valid, false);
      assert(result.issues.some(issue => issue.includes("kosong")));
    });

    it("detects names with only punctuation", () => {
      const result = validateSplitNames(["Valid Name", "..."]);
      assert.strictEqual(result.valid, true);
      assert.deepStrictEqual(result.issues, []);
    });

    it("validates very long names", () => {
      const longName = "A".repeat(100);
      const result = validateSplitNames([longName]);
      assert.strictEqual(result.valid, true);
      assert.deepStrictEqual(result.issues, []);
    });

    it("handles unicode names", () => {
      const result = validateSplitNames(["Joko Widodo", "佐藤太郎", "김영수"]);
      assert.strictEqual(result.valid, true);
      assert.deepStrictEqual(result.issues, []);
    });

    it("validates empty array", () => {
      const result = validateSplitNames([]);
      assert.strictEqual(result.valid, false);
      assert(result.issues.some(issue => issue.includes("Tidak ada nama yang valid")));
    });

    it("detects null or undefined in array", () => {
      const result = validateSplitNames(["Valid", null as any, "Another"]);
      assert.strictEqual(result.valid, false);
      assert(result.issues.some(issue => issue.includes("kosong")));
    });
  });

  describe("Integration Scenarios", () => {
    it("complete payment flow", () => {
      const totalBill = 190000;
      const payment1 = 100000;
      const payment2 = 90000;

      const status1 = calculateBillStatus(totalBill, payment1);
      const remaining1 = calculateRemaining(totalBill, payment1);
      assert.strictEqual(status1, BILL_STATUSES.DP);
      assert.strictEqual(remaining1, 90000);

      const status2 = calculateBillStatus(totalBill, payment1 + payment2);
      const remaining2 = calculateRemaining(totalBill, payment1 + payment2);
      assert.strictEqual(status2, BILL_STATUSES.PAID);
      assert.strictEqual(remaining2, 0);
    });

    it("group payment scenario", () => {
      const participants = ["A + B + C", "D", "E + F"];
      const splitResults = participants.flatMap(splitNames);
      
      assert.strictEqual(splitResults.length, 6);
      
      const validation = validateSplitNames(splitResults);
      assert.strictEqual(validation.valid, true);
    });

    it("refund scenario", () => {
      const totalBill = 190000;
      const paid = 190000;
      const refund = 50000;
      
      const newPaid = paid - refund;
      const status = calculateBillStatus(totalBill, newPaid);
      const remaining = calculateRemaining(totalBill, newPaid);
      
      assert.strictEqual(status, BILL_STATUSES.DP);
      assert.strictEqual(remaining, 50000);
    });

    it("price adjustment scenario", () => {
      const basePrice = 175000;
      const addOns = 15000;
      const adjustment = -5000;
      
      const totalBill = calculateTotalBill(basePrice + addOns, adjustment);
      assert.strictEqual(totalBill, 185000);
      
      const paid = 100000;
      const status = calculateBillStatus(totalBill, paid);
      const remaining = calculateRemaining(totalBill, paid);
      
      assert.strictEqual(status, BILL_STATUSES.DP);
      assert.strictEqual(remaining, 85000);
    });
  });
});