export type SupportedCountryCode = 'CL' | 'CO' | 'VE';
export type CurrencyCode = 'CLP' | 'COP' | 'VES' | 'USD';

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
  decimalSeparator: string;
  thousandsSeparator: string;
  symbolPlacement: 'before' | 'after';
}

export interface CountryProfile {
  countryCode: SupportedCountryCode;
  countryName: string;
  flag: string;
  phonePrefix: string;
  primaryCurrency: CurrencyConfig;
  secondaryCurrency?: CurrencyConfig;
  exchangeRateProvider?: 'BCV' | 'MANUAL' | 'NONE';
  taxName: string;
  defaultTaxRate: number; // percentage, e.g. 19 for Chile/Colombia, 16 for Venezuela
}
