/**
 * CountryBillingConfig — Centralized commercial billing capabilities and sales assistance.
 *
 * Supported Modes:
 * - MERCADO_PAGO: Self-service hosted checkout (Chile)
 * - SALES_ASSISTED: Assisted activation via WhatsApp sales (Venezuela, Colombia, Chile secondary)
 */

export type BillingMode = 'MERCADO_PAGO' | 'SALES_ASSISTED';

export interface CountryBillingCapability {
  countryCode: string;
  countryName: string;
  primaryMode: BillingMode;
  supportedModes: BillingMode[];
  currencyCode: string;
}

export const COUNTRY_BILLING_CAPABILITIES: Record<string, CountryBillingCapability> = {
  CL: {
    countryCode: 'CL',
    countryName: 'Chile',
    primaryMode: 'MERCADO_PAGO',
    supportedModes: ['MERCADO_PAGO', 'SALES_ASSISTED'],
    currencyCode: 'CLP',
  },
  VE: {
    countryCode: 'VE',
    countryName: 'Venezuela',
    primaryMode: 'SALES_ASSISTED',
    supportedModes: ['SALES_ASSISTED'],
    currencyCode: 'VES',
  },
  CO: {
    countryCode: 'CO',
    countryName: 'Colombia',
    primaryMode: 'SALES_ASSISTED',
    supportedModes: ['SALES_ASSISTED'],
    currencyCode: 'COP',
  },
};

export const DEFAULT_BILLING_CAPABILITY: CountryBillingCapability = COUNTRY_BILLING_CAPABILITIES.CL;

export function getBillingCapability(countryCode?: string): CountryBillingCapability {
  if (!countryCode) return DEFAULT_BILLING_CAPABILITY;
  const upper = countryCode.toUpperCase();
  return COUNTRY_BILLING_CAPABILITIES[upper] || DEFAULT_BILLING_CAPABILITY;
}

export const SEVENPOS_SALES_WHATSAPP_NUMBER = '56930000000';

export interface SalesWhatsAppParams {
  businessName?: string;
  countryName: string;
  interval?: 'MONTHLY' | 'ANNUAL';
  phoneNumber?: string;
}

/**
 * Builds a safe WhatsApp link for sales assistance.
 * Never includes raw database UUIDs, auth tokens, or private secrets.
 */
export function buildSalesWhatsAppUrl(params: SalesWhatsAppParams): string {
  const phone = params.phoneNumber || SEVENPOS_SALES_WHATSAPP_NUMBER;
  const planLabel = params.interval === 'ANNUAL' ? 'Anual' : 'Mensual';
  const businessDisplayName = params.businessName?.trim() || 'Mi Negocio';

  const text = `Hola, quiero contratar SevenPOS Pro.\n\nNegocio: ${businessDisplayName}\nPaís: ${params.countryName}\nPlan: ${planLabel}`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
