import { describe, it, expect } from 'vitest';
import { calculateGrossLineTotal, distributeDiscountHareNiemeyer } from '../../../src/domain/common/money/MoneyMath';

describe('MoneyMath — Shared Financial Engine (AG-06)', () => {
  describe('calculateGrossLineTotal (HALF_UP Rounding)', () => {
    it('calculates exact whole units correctly', () => {
      // 1 unit (1000 scaled) at $650
      expect(calculateGrossLineTotal(1000, 650)).toBe(650);
      // 2 units (2000 scaled) at $1200
      expect(calculateGrossLineTotal(2000, 1200)).toBe(2400);
      // 5 units (5000 scaled) at $1990
      expect(calculateGrossLineTotal(5000, 1990)).toBe(9950);
    });

    it('calculates fractional quantities correctly without floating point drift', () => {
      // 750 g (750 scaled) at $2000/kg -> 1500
      expect(calculateGrossLineTotal(750, 2000)).toBe(1500);

      // 333 g (333 scaled) at $1000/kg -> floor((333 * 1000 + 500) / 1000) = 333
      expect(calculateGrossLineTotal(333, 1000)).toBe(333);

      // 1.250 L (1250 scaled) at $800/L -> 1000
      expect(calculateGrossLineTotal(1250, 800)).toBe(1000);

      // 0.500 KG (500 scaled) at $1990/kg -> floor((500 * 1990 + 500) / 1000) = floor(995500 / 1000) = 995
      expect(calculateGrossLineTotal(500, 1990)).toBe(995);
    });

    it('handles zero or invalid quantities safely', () => {
      expect(calculateGrossLineTotal(0, 1000)).toBe(0);
      expect(calculateGrossLineTotal(-100, 1000)).toBe(0);
      expect(calculateGrossLineTotal(1000, 0)).toBe(0);
    });

    it('throws error on unsafe integer input', () => {
      expect(() => calculateGrossLineTotal(1e18, 1e18)).toThrow();
    });
  });

  describe('distributeDiscountHareNiemeyer (Largest Remainder Method)', () => {
    it('distributes discount proportionally across items matching global total exactly', () => {
      const items = [
        { id: 'item_1', grossTotal: 10000 },
        { id: 'item_2', grossTotal: 10000 },
        { id: 'item_3', grossTotal: 10000 },
      ];

      // $1000 discount over $30000 total (33.33% each -> $333 base + 1 remainder assigned to item_1)
      const distributed = distributeDiscountHareNiemeyer(items, 1000);

      const d1 = distributed.get('item_1') || 0;
      const d2 = distributed.get('item_2') || 0;
      const d3 = distributed.get('item_3') || 0;

      expect(d1 + d2 + d3).toBe(1000);
      expect(d1).toBe(334);
      expect(d2).toBe(333);
      expect(d3).toBe(333);
    });

    it('handles uneven item values with exact zero loss', () => {
      const items = [
        { id: 'a', grossTotal: 7350 },
        { id: 'b', grossTotal: 2650 },
      ];

      // Discount of $500
      const distributed = distributeDiscountHareNiemeyer(items, 500);
      const da = distributed.get('a') || 0;
      const db = distributed.get('b') || 0;

      expect(da + db).toBe(500);
      expect(da).toBe(368);
      expect(db).toBe(132);
    });

    it('caps discount to subtotal if discount exceeds subtotal', () => {
      const items = [{ id: 'a', grossTotal: 1500 }];
      const distributed = distributeDiscountHareNiemeyer(items, 3000);
      expect(distributed.get('a')).toBe(1500);
    });
  });
});
