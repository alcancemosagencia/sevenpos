export type BaseUnitCode = 'UNIT' | 'KG' | 'G' | 'L' | 'ML' | 'M';

export interface BaseUnitDefinition {
  code: BaseUnitCode;
  label: string;
  shortLabel: string;
  allowDecimals: boolean;
}

export const BASE_UNITS: BaseUnitDefinition[] = [
  { code: 'UNIT', label: 'Unidad (u)', shortLabel: 'u', allowDecimals: false },
  { code: 'KG', label: 'Kilogramo (kg)', shortLabel: 'kg', allowDecimals: true },
  { code: 'G', label: 'Gramo (g)', shortLabel: 'g', allowDecimals: true },
  { code: 'L', label: 'Litro (L)', shortLabel: 'L', allowDecimals: true },
  { code: 'ML', label: 'Mililitro (ml)', shortLabel: 'ml', allowDecimals: true },
  { code: 'M', label: 'Metro (m)', shortLabel: 'm', allowDecimals: true },
];

export function getBaseUnitDefinition(code: string): BaseUnitDefinition {
  const found = BASE_UNITS.find((u) => u.code === code);
  return found || BASE_UNITS[0];
}
