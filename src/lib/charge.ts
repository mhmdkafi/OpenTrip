export interface FacilityCharge {
  facility: string;
  basePrice: number;
}

export interface AddOnCharge {
  name: string;
  pricePerUnit: number;
  quantity: number;
}

export interface ChargeBreakdown {
  basePrice: number;
  addOns: number;
  adjustment: number;
}

export interface ChargeResult {
  total: number;
  breakdown: ChargeBreakdown;
}

export interface ChargeValidation {
  valid: boolean;
  issues: string[];
}

export function calculateCharge(
  facility: FacilityCharge,
  addOns: AddOnCharge[],
  adjustment: number
): ChargeResult {
  const basePrice = facility.basePrice;
  const addOnsTotal = addOns.reduce(
    (sum, addon) => sum + addon.pricePerUnit * addon.quantity,
    0
  );
  const total = basePrice + addOnsTotal + adjustment;

  return {
    total,
    breakdown: {
      basePrice,
      addOns: addOnsTotal,
      adjustment,
    },
  };
}

export function calculateRemaining(charge: number, paid: number): number {
  return Math.max(charge - paid, 0);
}

export function validateCharge(params: {
  facility: FacilityCharge;
  addOns: AddOnCharge[];
  adjustment: number;
}): ChargeValidation {
  const issues: string[] = [];

  if (!params.facility.facility || params.facility.facility.trim().length === 0) {
    issues.push("Fasilitas tidak dikenal");
  }

  if (params.facility.basePrice < 0) {
    issues.push("Harga dasar tidak boleh negatif");
  }

  for (const addon of params.addOns) {
    if (!addon.name || addon.name.trim().length === 0) {
      issues.push("Nama add-on tidak boleh kosong");
      continue;
    }
    if (addon.pricePerUnit < 0) {
      issues.push(`Harga add-on "${addon.name}" tidak boleh negatif`);
    }
    if (addon.quantity <= 0) {
      issues.push(`Kuantitas add-on "${addon.name}" harus lebih dari 0`);
    }
  }

  const result = calculateCharge(params.facility, params.addOns, params.adjustment);
  if (result.total < 0) {
    issues.push("Adjustment menghasilkan tagihan negatif");
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
