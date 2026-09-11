import { describe, it } from "node:test";
import assert from "node:assert";
import {
  calculateCharge,
  validateCharge,
  ChargeValidation,
  FacilityCharge,
  AddOnCharge,
} from "./charge";

describe("Charge Calculation and Validation", () => {
  const facility: FacilityCharge = {
    facility: "Full Transport",
    basePrice: 175000,
  };

  const addOns: AddOnCharge[] = [
    { name: "Jas Hujan", pricePerUnit: 15000, quantity: 1 },
    { name: "Asuransi", pricePerUnit: 5000, quantity: 2 },
  ];

  describe("calculateCharge", () => {
    it("calculates total charge correctly", () => {
      const result = calculateCharge(facility, addOns, 10000);

      assert.strictEqual(result.total, 210000);
      assert.strictEqual(result.breakdown.basePrice, 175000);
      assert.strictEqual(result.breakdown.addOns, 25000);
      assert.strictEqual(result.breakdown.adjustment, 10000);
    });

    it("handles zero add-ons and adjustment", () => {
      const result = calculateCharge(facility, [], 0);
      assert.strictEqual(result.total, 175000);
      assert.strictEqual(result.breakdown.addOns, 0);
      assert.strictEqual(result.breakdown.adjustment, 0);
    });

    it("handles negative adjustment", () => {
      const result = calculateCharge(facility, [], -10000);
      assert.strictEqual(result.total, 165000);
      assert.strictEqual(result.breakdown.adjustment, -10000);
    });

    it("handles multiple add-ons with quantities", () => {
      const customAddOns: AddOnCharge[] = [
        { name: "Item A", pricePerUnit: 10000, quantity: 3 },
        { name: "Item B", pricePerUnit: 25000, quantity: 2 },
      ];
      const result = calculateCharge(facility, customAddOns, 0);

      const expectedAddOnsTotal = 10000 * 3 + 25000 * 2;
      assert.strictEqual(result.breakdown.addOns, expectedAddOnsTotal);
      assert.strictEqual(result.total, 175000 + expectedAddOnsTotal);
    });
  });

  describe("validateCharge", () => {
    it("validates correct charge", () => {
      const result = validateCharge({ facility, addOns, adjustment: 5000 });
      assert.strictEqual(result.valid, true);
      assert.deepStrictEqual(result.issues, []);
    });

    it("rejects unknown facility", () => {
      const invalidFacility: FacilityCharge = { facility: "", basePrice: 100000 };
      const result = validateCharge({ facility: invalidFacility, addOns: [], adjustment: 0 });
      assert.strictEqual(result.valid, false);
      assert(result.issues.some(issue => issue.includes("Fasilitas tidak dikenal")));
    });

    it("rejects negative base price", () => {
      const invalidFacility: FacilityCharge = { facility: "Full", basePrice: -10000 };
      const result = validateCharge({ facility: invalidFacility, addOns: [], adjustment: 0 });
      assert.strictEqual(result.valid, false);
      assert(result.issues.some(issue => issue.includes("Harga dasar tidak boleh negatif")));
    });

    it("rejects add-ons with empty name", () => {
      const invalidAddOns: AddOnCharge[] = [
        { name: "", pricePerUnit: 10000, quantity: 1 },
        { name: "Valid Item", pricePerUnit: 5000, quantity: 2 },
      ];
      const result = validateCharge({ facility, addOns: invalidAddOns, adjustment: 0 });
      assert.strictEqual(result.valid, false);
      assert(result.issues.some(issue => issue.includes("Nama add-on tidak boleh kosong")));
    });

    it("rejects add-ons with negative price", () => {
      const invalidAddOns: AddOnCharge[] = [
        { name: "Invalid Item", pricePerUnit: -5000, quantity: 1 },
      ];
      const result = validateCharge({ facility, addOns: invalidAddOns, adjustment: 0 });
      assert.strictEqual(result.valid, false);
      assert(result.issues.some(issue => issue.includes('Harga add-on "Invalid Item" tidak boleh negatif')));
    });

    it("rejects add-ons with zero or negative quantity", () => {
      const invalidAddOns: AddOnCharge[] = [
        { name: "Invalid Item", pricePerUnit: 10000, quantity: 0 },
        { name: "Another Item", pricePerUnit: 5000, quantity: -1 },
      ];
      const result = validateCharge({ facility, addOns: invalidAddOns, adjustment: 0 });
      assert.strictEqual(result.valid, false);
      assert(result.issues.some(issue => issue.includes('Kuantitas add-on "Invalid Item" harus lebih dari 0')));
    });

    it("rejects adjustment that creates negative total", () => {
      const result = validateCharge({ 
        facility: { facility: "Full", basePrice: 10000 }, 
        addOns: [], 
        adjustment: -20000 
      });
      assert.strictEqual(result.valid, false);
      assert(result.issues.some(issue => issue.includes("Adjustment menghasilkan tagihan negatif")));
    });

    it("handles multiple validation issues", () => {
      const invalidFacility: FacilityCharge = { facility: "", basePrice: -10000 };
      const invalidAddOns: AddOnCharge[] = [
        { name: "Item", pricePerUnit: -5000, quantity: 0 },
      ];
      const result = validateCharge({ facility: invalidFacility, addOns: invalidAddOns, adjustment: -20000 });
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.issues.length, 5);
    });
  });
});