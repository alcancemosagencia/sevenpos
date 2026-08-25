import { SupportedCountryCode } from '../../types/country';

export interface Business {
  id: string;
  name: string;
  countryCode: SupportedCountryCode;
  fiscalId?: string | null;
  phone?: string | null;
  phonePrefix?: string | null;
  address?: string | null;
  createdAt: string;
  updatedAt: string;
}

export function validateBusiness(business: Partial<Business>): { isValid: boolean; error?: string } {
  if (!business.name || !business.name.trim()) {
    return { isValid: false, error: 'El nombre del negocio es obligatorio.' };
  }
  if (!business.countryCode || !['CL', 'CO', 'VE'].includes(business.countryCode)) {
    return { isValid: false, error: 'El país del negocio debe ser CL, CO o VE.' };
  }
  return { isValid: true };
}
