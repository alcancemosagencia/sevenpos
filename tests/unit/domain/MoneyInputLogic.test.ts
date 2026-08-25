import { describe, it, expect } from 'vitest';
import {
  parseMoneyInput,
  formatMoney,
  toMajorUnits,
  toMinorUnits,
  getCurrencyDefinition,
} from '../../../src/domain/common/money/Money';

describe('Money Input & Exponent Invariants (AG-06.2)', () => {
  describe('CLP (Chilean Peso - 0 Decimals)', () => {
    it('correctly maps 500 CLP to 500 minor units', () => {
      const def = getCurrencyDefinition('CLP');
      expect(def.minorUnitExponent).toBe(0);

      const minor = parseMoneyInput('500', 'CLP');
      expect(minor).toBe(500);
      expect(toMajorUnits(500, 'CLP')).toBe(500);
      expect(toMinorUnits(500, 'CLP')).toBe(500);
    });

    it('formats CLP without decimal places', () => {
      const formatted = formatMoney(500, 'CLP');
      expect(formatted).toBe('$ 500');
    });

    it('prevents accidental x100 scale on CLP cost', () => {
      // Cost entered as "500" should remain 500 minor units, NEVER 50000
      const userEnteredCost = '500';
      const parsed = parseMoneyInput(userEnteredCost, 'CLP');
      expect(parsed).toBe(500);
      expect(parsed).not.toBe(50000);
    });
  });

  describe('COP (Colombian Peso - 0 Decimals)', () => {
    it('correctly maps 15000 COP to 15000 minor units', () => {
      const def = getCurrencyDefinition('COP');
      expect(def.minorUnitExponent).toBe(0);

      const minor = parseMoneyInput('15000', 'COP');
      expect(minor).toBe(15000);
      expect(toMajorUnits(15000, 'COP')).toBe(15000);
    });
  });

  describe('USD (US Dollar - 2 Decimals)', () => {
    it('correctly maps 12.50 USD to 1250 minor units', () => {
      const def = getCurrencyDefinition('USD');
      expect(def.minorUnitExponent).toBe(2);

      const minor = parseMoneyInput('12.50', 'USD');
      expect(minor).toBe(1250);
      expect(toMajorUnits(1250, 'USD')).toBe(12.5);
    });

    it('formats USD with 2 decimal places', () => {
      const formatted = formatMoney(1250, 'USD');
      expect(formatted).toBe('$ 12.50');
    });
  });

  describe('VES (Venezuelan Bolivar - 2 Decimals)', () => {
    it('correctly maps 100.00 VES to 10000 minor units', () => {
      const def = getCurrencyDefinition('VES');
      expect(def.minorUnitExponent).toBe(2);

      const minor = parseMoneyInput('100.00', 'VES');
      expect(minor).toBe(10000);
      expect(toMajorUnits(10000, 'VES')).toBe(100);
    });
  });
});
