import { CountryProfile, SupportedCountryCode } from '../types/country';

export const COUNTRY_PROFILES: Record<SupportedCountryCode, CountryProfile> = {
  CL: {
    countryCode: 'CL',
    countryName: 'Chile',
    flag: '🇨🇱',
    phonePrefix: '+56',
    primaryCurrency: {
      code: 'CLP',
      symbol: '$',
      name: 'Peso Chileno',
      decimals: 0,
      decimalSeparator: ',',
      thousandsSeparator: '.',
      symbolPlacement: 'before',
    },
    taxName: 'IVA',
    defaultTaxRate: 19,
  },
  CO: {
    countryCode: 'CO',
    countryName: 'Colombia',
    flag: '🇨🇴',
    phonePrefix: '+57',
    primaryCurrency: {
      code: 'COP',
      symbol: '$',
      name: 'Peso Colombiano',
      decimals: 0,
      decimalSeparator: ',',
      thousandsSeparator: '.',
      symbolPlacement: 'before',
    },
    taxName: 'IVA',
    defaultTaxRate: 19,
  },
  VE: {
    countryCode: 'VE',
    countryName: 'Venezuela',
    flag: '🇻🇪',
    phonePrefix: '+58',
    primaryCurrency: {
      code: 'VES',
      symbol: 'Bs.',
      name: 'Bolívar Digital',
      decimals: 2,
      decimalSeparator: ',',
      thousandsSeparator: '.',
      symbolPlacement: 'before',
    },
    secondaryCurrency: {
      code: 'USD',
      symbol: '$',
      name: 'Dólar Estadounidense',
      decimals: 2,
      decimalSeparator: '.',
      thousandsSeparator: ',',
      symbolPlacement: 'before',
    },
    exchangeRateProvider: 'BCV',
    taxName: 'IVA',
    defaultTaxRate: 16,
  },
};

export const DEFAULT_COUNTRY: SupportedCountryCode = 'CL';

export function formatCurrency(
  amount: number,
  currency: CountryProfile['primaryCurrency']
): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const fixed = absAmount.toFixed(currency.decimals);
  const [intPart, decPart] = fixed.split('.');

  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, currency.thousandsSeparator);
  const formattedAmount = decPart
    ? `${formattedInt}${currency.decimalSeparator}${decPart}`
    : formattedInt;

  const sign = isNegative ? '-' : '';

  return currency.symbolPlacement === 'before'
    ? `${sign}${currency.symbol} ${formattedAmount}`
    : `${sign}${formattedAmount} ${currency.symbol}`;
}
