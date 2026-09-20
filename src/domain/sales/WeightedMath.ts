/**
 * SevenPOS — Weighted Product Math & Formatting Helpers
 *
 * Deterministic financial and inventory rules for products sold by weight.
 * All financial math uses integer minor units. Inventory is always stored in integer grams.
 */

export const MAX_SAFE_WEIGHT_GRAMS = 1_000_000; // 1,000 kg safety cap for single line item
export const MAX_SAFE_PRICE_PER_KG = 1_000_000_000; // 1 billion minor units safety cap

/**
 * Calculates the gross line total for a weighted item in integer minor currency units.
 *
 * Formula: round((pricePerKgMinor * grams) / 1000)
 * Uses BigInt arithmetic to avoid any potential 32-bit or floating-point integer overflow.
 */
export function calculateWeightedLineTotal(pricePerKgMinor: number, grams: number): number {
  if (!Number.isSafeInteger(pricePerKgMinor) || !Number.isSafeInteger(grams)) {
    return 0;
  }
  if (pricePerKgMinor <= 0 || grams <= 0) {
    return 0;
  }
  if (grams > MAX_SAFE_WEIGHT_GRAMS || pricePerKgMinor > MAX_SAFE_PRICE_PER_KG) {
    return 0;
  }

  // Deterministic integer division with standard round-half-up
  const priceBig = BigInt(pricePerKgMinor);
  const gramsBig = BigInt(grams);
  const thousandBig = 1000n;

  // (priceBig * gramsBig + 500n) / 1000n performs round-half-up on integers
  const roundedMinor = (priceBig * gramsBig + 500n) / thousandBig;
  return Number(roundedMinor);
}

/**
 * Formats integer grams for display in Spanish locale:
 * - < 1000 g: displays in grams (e.g. "260 g", "950 g")
 * - >= 1000 g: displays in kilograms with trimmed trailing zeros (e.g. "1 kg", "1,25 kg", "1,5 kg", "12,5 kg")
 */
export function formatWeightDisplay(grams: number, _locale = 'es-CL'): string {
  if (!Number.isFinite(grams) || grams <= 0) {
    return '0 g';
  }

  const integerGrams = Math.round(grams);
  if (integerGrams < 1000) {
    return `${integerGrams} g`;
  }

  const kg = integerGrams / 1000;
  // Format with Spanish decimal separator and no trailing zeros
  const formattedKg = kg.toLocaleString('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });

  return `${formattedKg} kg`;
}

/**
 * Parses a user input string (either in 'G' or 'KG') into integer grams.
 * Normalizes commas and dots. Returns integer grams (rounded, non-negative).
 */
export function parseWeightInputToGrams(input: string, unit: 'G' | 'KG'): number {
  if (!input || !input.trim()) return 0;

  const normalized = input.trim().replace(',', '.');
  const parsed = parseFloat(normalized);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  const grams = unit === 'G' ? Math.round(parsed) : Math.round(parsed * 1000);

  if (grams > MAX_SAFE_WEIGHT_GRAMS) {
    return MAX_SAFE_WEIGHT_GRAMS;
  }

  return grams;
}
