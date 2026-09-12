import { describe, it, expect } from 'vitest';
import { COUNTRY_PROFILES, formatCountryName } from '../config/countries';
import { SupportedCountryCode } from '../types/country';

describe('AG-13 — Country Labels & Currency Formatter Truth', () => {
  it('correctly maps CL, CO, VE to canonical country names without code prefix corruption', () => {
    expect(formatCountryName('CL')).toBe('Chile');
    expect(formatCountryName('CO')).toBe('Colombia');
    expect(formatCountryName('VE')).toBe('Venezuela');

    // Reject corrupted strings
    const codes: SupportedCountryCode[] = ['CL', 'CO', 'VE'];
    for (const code of codes) {
      const name = formatCountryName(code);
      expect(name).not.toMatch(/^clChile$/i);
      expect(name).not.toMatch(/^coColombia$/i);
      expect(name).not.toMatch(/^veVenezuela$/i);
    }
  });

  it('verifies Venezuela currency profile name is Bolívar and not Bolívar Digital', () => {
    const veProfile = COUNTRY_PROFILES.VE;
    expect(veProfile.primaryCurrency.code).toBe('VES');
    expect(veProfile.primaryCurrency.name).toBe('Bolívar');
    expect(veProfile.primaryCurrency.name).not.toContain('Digital');
    expect(veProfile.primaryCurrency.symbol).toBe('Bs.');
  });

  it('verifies Chile and Colombia currency profiles', () => {
    expect(COUNTRY_PROFILES.CL.primaryCurrency.code).toBe('CLP');
    expect(COUNTRY_PROFILES.CL.primaryCurrency.name).toBe('Peso Chileno');
    expect(COUNTRY_PROFILES.CO.primaryCurrency.code).toBe('COP');
    expect(COUNTRY_PROFILES.CO.primaryCurrency.name).toBe('Peso Colombiano');
  });
});
