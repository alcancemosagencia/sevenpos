import { QUANTITY_SCALE } from '../quantity/Quantity';

/**
 * Shared Money & Financial Math Engine for SevenPOS (AG-06 Core).
 *
 * Invariants:
 * 1. ZERO floating-point arithmetic in authoritative monetary or financial calculations.
 * 2. Strict integer domain: Quantities are scaled by QUANTITY_SCALE (1000). Prices/Totals are minor integers.
 * 3. HALF_UP rounding for line item totals.
 * 4. Largest Remainder Method (Hare-Niemeyer) for 100% exact proportional discount distribution.
 */

/**
 * Calculates gross line total with HALF_UP integer rounding.
 * Formula: floor((quantityScaled * unitPriceMinor + 500) / 1000)
 *
 * Example:
 * 750 scaled grams at 2000 minor currency -> floor((750 * 2000 + 500) / 1000) = 1500
 * 2000 scaled units at 650 minor currency -> floor((2000 * 650 + 500) / 1000) = 1300
 */
export function calculateGrossLineTotal(quantityScaled: number, unitPriceMinor: number): number {
  if (!Number.isSafeInteger(quantityScaled) || !Number.isSafeInteger(unitPriceMinor)) {
    throw new Error(`Valores no seguros para cálculo monetario: quantityScaled=${quantityScaled}, unitPrice=${unitPriceMinor}`);
  }
  if (quantityScaled <= 0 || unitPriceMinor < 0) {
    return 0;
  }

  const product = quantityScaled * unitPriceMinor;
  if (!Number.isSafeInteger(product)) {
    throw new Error(`El producto excede el rango numérico seguro: ${product}`);
  }

  const halfScale = QUANTITY_SCALE / 2; // 500
  return Math.floor((product + halfScale) / QUANTITY_SCALE);
}

export interface DiscountableItem {
  id: string;
  grossTotal: number;
}

/**
 * Distributes a global discount across line items using the Largest Remainder Method (Hare-Niemeyer).
 *
 * Guarantees that:
 * SUM(item_discounts) === globalDiscountTotal exactly (down to 0 minor currency difference).
 */
export function distributeDiscountHareNiemeyer(
  items: DiscountableItem[],
  globalDiscountTotal: number
): Map<string, number> {
  const result = new Map<string, number>();

  if (items.length === 0 || globalDiscountTotal <= 0) {
    for (const item of items) {
      result.set(item.id, 0);
    }
    return result;
  }

  const subtotal = items.reduce((sum, item) => sum + item.grossTotal, 0);
  if (subtotal <= 0) {
    for (const item of items) {
      result.set(item.id, 0);
    }
    return result;
  }

  // Cap discount to subtotal
  const effectiveDiscount = Math.min(globalDiscountTotal, subtotal);

  // Step 1: Calculate unrounded exact share and base floor discount
  const entries = items.map((item) => {
    const unroundedShare = (item.grossTotal / subtotal) * effectiveDiscount;
    const baseDiscount = Math.floor(unroundedShare);
    const remainder = unroundedShare - baseDiscount;
    return {
      id: item.id,
      grossTotal: item.grossTotal,
      baseDiscount,
      remainder,
    };
  });

  const sumBase = entries.reduce((acc, e) => acc + e.baseDiscount, 0);
  let leftover = effectiveDiscount - sumBase;

  // Step 2: Sort descending by remainder, tie-breaking deterministically by item ID
  entries.sort((a, b) => {
    if (b.remainder !== a.remainder) {
      return b.remainder - a.remainder;
    }
    return a.id.localeCompare(b.id);
  });

  // Step 3: Distribute 1 minor unit to top items with highest remainder
  for (const entry of entries) {
    let finalDiscount = entry.baseDiscount;
    if (leftover > 0) {
      finalDiscount += 1;
      leftover -= 1;
    }
    // Individual item discount can never exceed its gross total
    finalDiscount = Math.min(finalDiscount, entry.grossTotal);
    result.set(entry.id, finalDiscount);
  }

  return result;
}

export type GlobalDiscountType = 'PERCENTAGE' | 'FIXED';

export interface GlobalDiscountInput {
  type: GlobalDiscountType;
  value: number; // For PERCENTAGE: integer percent (e.g. 5 for 5%, 10 for 10%); For FIXED: minor integer (e.g. 160)
}

/**
 * Calculates authoritative global discount total in minor currency integer.
 *
 * Invariants:
 * 1. For FIXED: min(discount.value, subtotalMinor)
 * 2. For PERCENTAGE: floor((subtotalMinor * discount.value + 50) / 100) with HALF_UP rounding, capped at subtotalMinor.
 * 3. Never returns negative numbers or non-integers.
 */
export function calculateGlobalDiscountTotal(
  subtotalMinor: number,
  discount?: GlobalDiscountInput | null
): number {
  if (!discount || subtotalMinor <= 0 || discount.value <= 0 || !Number.isSafeInteger(subtotalMinor)) {
    return 0;
  }

  if (discount.type === 'FIXED') {
    if (!Number.isSafeInteger(discount.value)) return 0;
    return Math.min(Math.max(0, discount.value), subtotalMinor);
  }

  if (discount.type === 'PERCENTAGE') {
    if (!Number.isSafeInteger(discount.value)) return 0;
    const clampedPercent = Math.min(Math.max(0, discount.value), 100);
    // HALF_UP integer rounding: floor((subtotal * percent + 50) / 100)
    const product = subtotalMinor * clampedPercent;
    const discountMinor = Math.floor((product + 50) / 100);
    return Math.min(discountMinor, subtotalMinor);
  }

  return 0;
}
