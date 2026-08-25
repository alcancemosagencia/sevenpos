import { BaseUnitCode, getBaseUnitDefinition } from '../unit/BaseUnit';

/**
 * Fixed quantity scale factor (3 decimal places).
 * 1 UNIT = 1000 scaled units
 * 0.750 KG = 750 scaled units
 */
export const QUANTITY_SCALE = 1000;

export function toScaledQuantity(majorAmount: number): number {
  if (typeof majorAmount !== 'number' || isNaN(majorAmount)) {
    throw new Error(`Cantidad inválida para escalar: ${majorAmount}`);
  }
  const scaled = Math.round(majorAmount * QUANTITY_SCALE);
  if (!Number.isSafeInteger(scaled)) {
    throw new Error(`Cantidad excede el rango seguro de cálculo: ${majorAmount}`);
  }
  return scaled;
}

export function toMajorQuantity(scaledAmount: number): number {
  if (typeof scaledAmount !== 'number' || !Number.isSafeInteger(scaledAmount)) {
    throw new Error(`Cantidad escalada inválida: ${scaledAmount}`);
  }
  return scaledAmount / QUANTITY_SCALE;
}

export function formatQuantity(
  scaledAmount: number,
  unitCode: BaseUnitCode = 'UNIT',
  includeSymbol: boolean = true
): string {
  if (typeof scaledAmount !== 'number' || !Number.isSafeInteger(scaledAmount)) {
    return '0';
  }

  const def = getBaseUnitDefinition(unitCode);
  const major = toMajorQuantity(scaledAmount);

  let formattedNumber: string;
  if (!def.allowDecimals || scaledAmount % QUANTITY_SCALE === 0) {
    formattedNumber = Math.round(major).toLocaleString('es-ES', {
      maximumFractionDigits: 0,
    });
  } else {
    // Up to 3 fractional digits, omitting trailing zeros
    formattedNumber = major.toLocaleString('es-ES', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 3,
    });
  }

  if (includeSymbol) {
    return `${formattedNumber} ${def.shortLabel}`;
  }
  return formattedNumber;
}

export function parseQuantityInput(
  input: string,
  unitCode: BaseUnitCode = 'UNIT'
): number | null {
  if (!input || typeof input !== 'string') return null;

  // Clean currency/unit symbols and spaces
  const cleaned = input.trim().replace(/[^\d.,]/g, '');
  if (!cleaned) return null;

  // Normalize comma and dot decimal separators
  let normalized = cleaned;
  if (normalized.includes(',') && normalized.includes('.')) {
    // Example: 1.250,50 -> remove thousands separator
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(',', '.');
  }

  const major = parseFloat(normalized);
  if (isNaN(major) || major < 0) return null;

  const def = getBaseUnitDefinition(unitCode);
  if (!def.allowDecimals && !Number.isInteger(major)) {
    // Disallow fractional input for discrete units like UNIT
    return null;
  }

  try {
    return toScaledQuantity(major);
  } catch {
    return null;
  }
}

export function validateQuantityForUnit(
  scaledAmount: number,
  unitCode: BaseUnitCode
): { valid: boolean; error?: string } {
  if (!Number.isSafeInteger(scaledAmount)) {
    return { valid: false, error: 'La cantidad excede el límite seguro numérico.' };
  }

  if (scaledAmount <= 0) {
    return { valid: false, error: 'La cantidad debe ser mayor a cero.' };
  }

  const def = getBaseUnitDefinition(unitCode);
  if (!def.allowDecimals && scaledAmount % QUANTITY_SCALE !== 0) {
    return {
      valid: false,
      error: `Los productos medidos en ${def.label} no permiten cantidades fraccionarias.`,
    };
  }

  return { valid: true };
}
