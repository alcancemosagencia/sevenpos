import { describe, it, expect } from 'vitest';
import {
  calculateWeightedLineTotal,
  formatWeightDisplay,
  parseWeightInputToGrams,
  MAX_SAFE_WEIGHT_GRAMS,
} from '../WeightedMath';

describe('WeightedMath — Unit & Financial Contracts', () => {
  describe('calculateWeightedLineTotal', () => {
    it('calculates exact line total with round-half-up for spec test cases', () => {
      // 8.990 CLP/kg * 260 g = 2.337,4 -> 2.337 CLP
      expect(calculateWeightedLineTotal(8990, 260)).toBe(2337);

      // 12.490 CLP/kg * 430 g = 5.370,7 -> 5.371 CLP
      expect(calculateWeightedLineTotal(12490, 430)).toBe(5371);

      // 10.000 CLP/kg * 500 g = 5.000 -> 5.000 CLP
      expect(calculateWeightedLineTotal(10000, 500)).toBe(5000);

      // 19.990 CLP/kg * 1 g = 19,99 -> 20 CLP
      expect(calculateWeightedLineTotal(19990, 1)).toBe(20);

      // 19.990 CLP/kg * 999 g = 19.970,01 -> 19.970 CLP
      expect(calculateWeightedLineTotal(19990, 999)).toBe(19970);

      // 19.990 CLP/kg * 1000 g = 19.990 -> 19.990 CLP
      expect(calculateWeightedLineTotal(19990, 1000)).toBe(19990);
    });

    it('calculates exact line totals across multi-currency models (CLP, COP, USD, VES)', () => {
      // ZERO-DECIMAL CURRENCIES (CLP, COP):
      // CLP: 8990 minor/kg * 260 g -> 2337 minor
      expect(calculateWeightedLineTotal(8990, 260)).toBe(2337);

      // COP: 15000 minor/kg * 350 g -> 5250 minor
      expect(calculateWeightedLineTotal(15000, 350)).toBe(5250);

      // TWO-DECIMAL CURRENCIES (USD, VES):
      // USD: $8.99/kg (899 minor units) * 260 g -> round(899 * 260 / 1000) = round(233.74) = 234 minor units ($2.34)
      expect(calculateWeightedLineTotal(899, 260)).toBe(234);

      // USD: $12.49/kg (1249 minor units) * 430 g -> round(1249 * 430 / 1000) = round(537.07) = 537 minor units ($5.37)
      expect(calculateWeightedLineTotal(1249, 430)).toBe(537);

      // VES: Bs. 45.50/kg (4550 minor units) * 150 g -> round(4550 * 150 / 1000) = round(682.5) = 683 minor units (Bs. 6.83)
      expect(calculateWeightedLineTotal(4550, 150)).toBe(683);
    });

    it('guards against non-safe integers, negatives, zeros, and overflows', () => {
      expect(calculateWeightedLineTotal(0, 500)).toBe(0);
      expect(calculateWeightedLineTotal(8990, 0)).toBe(0);
      expect(calculateWeightedLineTotal(-8990, 500)).toBe(0);
      expect(calculateWeightedLineTotal(8990, -500)).toBe(0);
      expect(calculateWeightedLineTotal(8990.5, 500)).toBe(0);
      expect(calculateWeightedLineTotal(8990, 500.5)).toBe(0);
      expect(calculateWeightedLineTotal(Number.MAX_SAFE_INTEGER + 1, 500)).toBe(0);
      expect(calculateWeightedLineTotal(8990, Number.MAX_SAFE_INTEGER + 1)).toBe(0);
    });

    it('enforces safety caps without integer overflow via BigInt math', () => {
      expect(calculateWeightedLineTotal(8990, MAX_SAFE_WEIGHT_GRAMS + 1)).toBe(0);
      expect(calculateWeightedLineTotal(2_000_000_000, 500)).toBe(0);
      // Valid maximum boundary safely handled
      expect(calculateWeightedLineTotal(1_000_000_000, 1_000_000)).toBe(1_000_000_000_000);
    });
  });

  describe('formatWeightDisplay', () => {
    it('formats grams below 1000 g', () => {
      expect(formatWeightDisplay(260)).toBe('260 g');
      expect(formatWeightDisplay(950)).toBe('950 g');
      expect(formatWeightDisplay(1)).toBe('1 g');
    });

    it('formats kilograms above 1000 g trimming trailing zeros', () => {
      expect(formatWeightDisplay(1000)).toBe('1 kg');
      expect(formatWeightDisplay(1250)).toBe('1,25 kg');
      expect(formatWeightDisplay(1500)).toBe('1,5 kg');
      expect(formatWeightDisplay(12500)).toBe('12,5 kg');
    });

    it('handles zero or invalid weights gracefully', () => {
      expect(formatWeightDisplay(0)).toBe('0 g');
      expect(formatWeightDisplay(-100)).toBe('0 g');
      expect(formatWeightDisplay(NaN)).toBe('0 g');
    });
  });

  describe('parseWeightInputToGrams', () => {
    it('parses input in grams (G)', () => {
      expect(parseWeightInputToGrams('260', 'G')).toBe(260);
      expect(parseWeightInputToGrams(' 500 ', 'G')).toBe(500);
      expect(parseWeightInputToGrams('1000', 'G')).toBe(1000);
    });

    it('parses input in kilograms (KG) with commas or dots', () => {
      expect(parseWeightInputToGrams('0,26', 'KG')).toBe(260);
      expect(parseWeightInputToGrams('0.26', 'KG')).toBe(260);
      expect(parseWeightInputToGrams('1,25', 'KG')).toBe(1250);
      expect(parseWeightInputToGrams('1.5', 'KG')).toBe(1500);
      expect(parseWeightInputToGrams('12,5', 'KG')).toBe(12500);
    });

    it('clamps to MAX_SAFE_WEIGHT_GRAMS if excessive', () => {
      expect(parseWeightInputToGrams('2000', 'KG')).toBe(MAX_SAFE_WEIGHT_GRAMS);
    });

    it('returns 0 for empty or invalid input', () => {
      expect(parseWeightInputToGrams('', 'G')).toBe(0);
      expect(parseWeightInputToGrams('abc', 'KG')).toBe(0);
      expect(parseWeightInputToGrams('-5', 'G')).toBe(0);
    });
  });
});
