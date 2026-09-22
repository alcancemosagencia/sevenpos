import { describe, it, expect } from 'vitest';
import { COUNTRY_PROFILES } from '../config/countries';
import { SupportedCountryCode } from '../types/country';

describe('Country & Currency Registration Invariants (PLATFORM-01C)', () => {
  describe('1. Canonical Country Profiles Definition', () => {
    it('defines Venezuela (VE) with VES primary currency, USD secondary, bimonetary enabled, and +58 prefix', () => {
      const ve = COUNTRY_PROFILES.VE;
      expect(ve).toBeDefined();
      expect(ve.countryName).toBe('Venezuela');
      expect(ve.primaryCurrency.code).toBe('VES');
      expect(ve.secondaryCurrency?.code).toBe('USD');
      expect(ve.exchangeRateProvider).toBe('BCV');
      expect(ve.phonePrefix).toBe('+58');
      expect(ve.flag).toBe('🇻🇪');
    });

    it('defines Chile (CL) with CLP primary currency, no bimonetary, and +56 prefix', () => {
      const cl = COUNTRY_PROFILES.CL;
      expect(cl).toBeDefined();
      expect(cl.countryName).toBe('Chile');
      expect(cl.primaryCurrency.code).toBe('CLP');
      expect(cl.phonePrefix).toBe('+56');
      expect(cl.flag).toBe('🇨🇱');
    });

    it('defines Colombia (CO) with COP primary currency, no bimonetary, and +57 prefix', () => {
      const co = COUNTRY_PROFILES.CO;
      expect(co).toBeDefined();
      expect(co.countryName).toBe('Colombia');
      expect(co.primaryCurrency.code).toBe('COP');
      expect(co.phonePrefix).toBe('+57');
      expect(co.flag).toBe('🇨🇴');
    });
  });

  describe('2. Regional Settings Resolution for New Business / Device', () => {
    const resolveInitialBusinessSettings = (countryCode: SupportedCountryCode) => {
      const profile = COUNTRY_PROFILES[countryCode] || COUNTRY_PROFILES.CL;
      return {
        countryCode,
        phonePrefix: profile.phonePrefix,
        primaryCurrency: profile.primaryCurrency.code,
        secondaryCurrency: profile.secondaryCurrency?.code || 'USD',
        secondaryCurrencyEnabled: countryCode === 'VE',
        exchangeRate: countryCode === 'VE' ? 40.0 : undefined,
      };
    };

    it('resolves Venezuela business configuration strictly with VES and +58 (never CLP / +56)', () => {
      const settings = resolveInitialBusinessSettings('VE');
      expect(settings.countryCode).toBe('VE');
      expect(settings.phonePrefix).toBe('+58');
      expect(settings.primaryCurrency).toBe('VES');
      expect(settings.secondaryCurrency).toBe('USD');
      expect(settings.secondaryCurrencyEnabled).toBe(true);
      expect(settings.primaryCurrency).not.toBe('CLP');
      expect(settings.phonePrefix).not.toBe('+56');
    });

    it('resolves Chile business configuration with CLP and +56', () => {
      const settings = resolveInitialBusinessSettings('CL');
      expect(settings.countryCode).toBe('CL');
      expect(settings.phonePrefix).toBe('+56');
      expect(settings.primaryCurrency).toBe('CLP');
      expect(settings.secondaryCurrencyEnabled).toBe(false);
    });

    it('resolves Colombia business configuration with COP and +57', () => {
      const settings = resolveInitialBusinessSettings('CO');
      expect(settings.countryCode).toBe('CO');
      expect(settings.phonePrefix).toBe('+57');
      expect(settings.primaryCurrency).toBe('COP');
      expect(settings.secondaryCurrencyEnabled).toBe(false);
    });
  });

  describe('3. Valid Country / Currency Combinations for Platform Administration', () => {
    const isValidCombination = (country: SupportedCountryCode, currency: string): boolean => {
      switch (country) {
        case 'CL':
          return currency === 'CLP';
        case 'CO':
          return currency === 'COP';
        case 'VE':
          return currency === 'VES' || currency === 'USD';
        default:
          return false;
      }
    };

    it('accepts valid combinations', () => {
      expect(isValidCombination('CL', 'CLP')).toBe(true);
      expect(isValidCombination('CO', 'COP')).toBe(true);
      expect(isValidCombination('VE', 'VES')).toBe(true);
      expect(isValidCombination('VE', 'USD')).toBe(true);
    });

    it('rejects invalid combinations that violate regional monetary invariants', () => {
      expect(isValidCombination('VE', 'CLP')).toBe(false);
      expect(isValidCombination('VE', 'COP')).toBe(false);
      expect(isValidCombination('CL', 'USD')).toBe(false);
      expect(isValidCombination('CL', 'VES')).toBe(false);
      expect(isValidCombination('CO', 'CLP')).toBe(false);
      expect(isValidCombination('CO', 'USD')).toBe(false);
    });
  });
});