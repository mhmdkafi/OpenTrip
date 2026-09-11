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
} from "./money";

describe("Money utilities", () => {
  describe("formatRupiah", () => {
    it("formats number as IDR currency", () => {
      assert.ok(formatRupiah(190000).includes("190.000"));
      assert.ok(formatRupiah(110000).includes("110.000"));
    });

    it("handles zero", () => {
      assert.ok(formatRupiah(0).includes("0"));
    });

    it("handles large numbers", () => {
      assert.ok(formatRupiah(5000000).includes("5.000.000"));
    });
  });

  describe("parseRupiah", () => {
    it("parses formatted rupiah", () => {
      assert.strictEqual(parseRupiah("Rp190.000"), 190000);
      assert.strictEqual(parseRupiah("Rp110.000"), 110000);
    });

    it("handles invalid input", () => {
      assert.strictEqual(parseRupiah("invalid"), 0);
      assert.strictEqual(parseRupiah(""), 0);
    });
  });

  describe("calculateBillStatus", () => {
    it("returns UNPAID when nothing paid", () => {
      assert.strictEqual(calculateBillStatus(190000, 0), BILL_STATUSES.UNPAID);
    });

    it("returns DP when partially paid", () => {
      assert.strictEqual(calculateBillStatus(190000, 100000), BILL_STATUSES.DP);
    });

    it("returns PAID when fully paid", () => {
      assert.strictEqual(calculateBillStatus(190000, 190000), BILL_STATUSES.PAID);
    });
  });

  describe("calculateRemaining", () => {
    it("calculates correct remaining amount", () => {
      assert.strictEqual(calculateRemaining(190000, 100000), 90000);
      assert.strictEqual(calculateRemaining(110000, 110000), 0);
    });

    it("returns zero when overpaid", () => {
      assert.strictEqual(calculateRemaining(100000, 150000), 0);
    });
  });

  describe("calculateTotalBill", () => {
    it("sums base and adjustment", () => {
      assert.strictEqual(calculateTotalBill(175000, 15000), 190000);
      assert.strictEqual(calculateTotalBill(110000, 0), 110000);
    });
  });

  describe("splitNames", () => {
    it("splits on plus sign", () => {
      const result = splitNames("Adi Nugroho + Antares + Zanki");
      assert.deepStrictEqual(result, ["Adi Nugroho", "Antares", "Zanki"]);
    });

    it("splits on comma", () => {
      const result = splitNames("Nama A, Nama B");
      assert.deepStrictEqual(result, ["Nama A", "Nama B"]);
    });

    it("splits on newline", () => {
      const result = splitNames("Nama A\nNama B");
      assert.deepStrictEqual(result, ["Nama A", "Nama B"]);
    });

    it("trims whitespace", () => {
      const result = splitNames("Adi  +  Antares");
      assert.deepStrictEqual(result, ["Adi", "Antares"]);
    });

    it("filters empty tokens", () => {
      const result = splitNames("Adi + + Antares");
      assert.deepStrictEqual(result, ["Adi", "Antares"]);
    });

    it("handles single name", () => {
      const result = splitNames("Adi Nugroho");
      assert.deepStrictEqual(result, ["Adi Nugroho"]);
    });
  });

  describe("validateSplitNames", () => {
    it("validates correct names", () => {
      const result = validateSplitNames(["Adi", "Antares", "Zanki"]);
      assert.strictEqual(result.valid, true);
      assert.deepStrictEqual(result.issues, []);
    });

    it("detects empty list", () => {
      const result = validateSplitNames([]);
      assert.strictEqual(result.valid, false);
      assert(result.issues.length > 0);
    });

    it("detects empty names", () => {
      const result = validateSplitNames(["Adi", "", "Zanki"]);
      assert.strictEqual(result.valid, false);
      assert(result.issues.some((issue) => issue.includes("kosong")));
    });
  });
});
