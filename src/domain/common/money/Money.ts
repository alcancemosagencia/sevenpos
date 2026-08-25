import { CurrencyCode } from '../../../types/country';

export interface CurrencyDefinition {
  code: CurrencyCode;
  name: string;
  symbol: string;
  minorUnitExponent: number; // 0 for CLP/COP, 2 for USD/VES/EUR
  decimalSeparator: string;
  thousandsSeparator: string;
  symbolPosition: 'prefix' | 'suffix';
}

export const CURRENCY_DEFINITIONS: Record<CurrencyCode, CurrencyDefinition> = {
  CLP: {
    code: 'CLP',
    name: 'Peso Chileno',
    symbol: '$',
    minorUnitExponent: 0,
    decimalSeparator: ',',
    thousandsSeparator: '.',
    symbolPosition: 'prefix',
  },
  COP: {
    code: 'COP',
    name: 'Peso Colombiano',
    symbol: '$',
    minorUnitExponent: 0,
    decimalSeparator: ',',
    thousandsSeparator: '.',
    symbolPosition: 'prefix',
  },
  USD: {
    code: 'USD',
    name: 'Dólar Estadounidense',
    symbol: '$',
    minorUnitExponent: 2,
    decimalSeparator: '.',
    thousandsSeparator: ',',
    symbolPosition: 'prefix',
  },
  VES: {
    code: 'VES',
    name: 'Bolívar Digital',
    symbol: 'Bs.',
    minorUnitExponent: 2,
    decimalSeparator: ',',
    thousandsSeparator: '.',
    symbolPosition: 'prefix',
  },
};

/**
 * Returns the formal definition of a currency. Defaults to CLP if unmapped.
 */
export function getCurrencyDefinition(currency: CurrencyCode): CurrencyDefinition {
  return CURRENCY_DEFINITIONS[currency] || CURRENCY_DEFINITIONS.CLP;
}

/**
 * Converts a major decimal/display amount (e.g. 12.50 USD or 12500 CLP) to integer minor units (e.g. 1250 or 12500).
 */
export function toMinorUnits(majorAmount: number | string, currency: CurrencyCode): number {
  const def = getCurrencyDefinition(currency);
  const numeric = typeof majorAmount === 'string' ? parseFloat(majorAmount.replace(/,/g, '.')) : majorAmount;

  if (isNaN(numeric) || !isFinite(numeric)) {
    return 0;
  }

  const factor = Math.pow(10, def.minorUnitExponent);
  return Math.round(numeric * factor);
}

/**
 * Converts stored integer minor units (e.g. 1250 USD cents or 12500 CLP) back to major floating value (12.5 or 12500).
 */
export function toMajorUnits(minorUnits: number, currency: CurrencyCode): number {
  const def = getCurrencyDefinition(currency);
  const factor = Math.pow(10, def.minorUnitExponent);
  return minorUnits / factor;
}

/**
 * Formats integer minor units into standard display text according to regional currency rules.
 */
export function formatMoney(
  minorUnits: number,
  currency: CurrencyCode,
  options?: { showCode?: boolean; includeSymbol?: boolean }
): string {
  const def = getCurrencyDefinition(currency);
  const major = toMajorUnits(minorUnits, currency);
  const includeSymbol = options?.includeSymbol ?? true;

  // Format with Intl.NumberFormat based on exponent
  const formattedNumber = new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'es-CL', {
    minimumFractionDigits: def.minorUnitExponent,
    maximumFractionDigits: def.minorUnitExponent,
  }).format(major);

  let result = formattedNumber;
  if (includeSymbol) {
    result = def.symbolPosition === 'prefix' ? `${def.symbol} ${formattedNumber}` : `${formattedNumber} ${def.symbol}`;
  }

  if (options?.showCode) {
    result = `${result} ${def.code}`;
  }

  return result;
}

/**
 * Safely parses user keyboard input string into integer minor units.
 * Supports "$ 12.500", "12,50", "12.50", etc.
 */
export function parseMoneyInput(input: string, currency: CurrencyCode): number | null {
  if (!input || !input.trim()) return null;

  const def = getCurrencyDefinition(currency);
  // Remove currency symbols, currency code letters and whitespace, preserving digits, commas and dots
  let clean = input.replace(/[$€£]/g, '').replace(/Bs\.?/gi, '').replace(/[a-zA-Z]/g, '').trim();

  if (!clean) return null;

  if (def.minorUnitExponent === 0) {
    // Currencies without decimals (CLP, COP): strip dots and commas used as thousands separators
    clean = clean.replace(/[.,]/g, '');
    const intVal = parseInt(clean, 10);
    return isNaN(intVal) ? null : Math.max(0, intVal);
  } else {
    // Currencies with decimals (USD, VES): standard decimal point
    // If input has comma as decimal separator, replace it
    if (clean.includes(',') && !clean.includes('.')) {
      clean = clean.replace(',', '.');
    } else if (clean.includes('.') && clean.includes(',')) {
      // e.g. 1.250,50 -> remove dots, replace comma with dot
      clean = clean.replace(/\./g, '').replace(',', '.');
    }
    const floatVal = parseFloat(clean);
    if (isNaN(floatVal) || floatVal < 0) return null;
    return toMinorUnits(floatVal, currency);
  }
}
