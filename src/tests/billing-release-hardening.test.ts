import { describe, it, expect } from 'vitest';
import {
  getBillingCapability,
  buildSalesWhatsAppUrl,
} from '../domain/billing/CountryBillingConfig';

describe('Billing Final Hardening - Country Capabilities & Sales Assistance', () => {
  it('configures Chile with Mercado Pago primary and Sales Assisted secondary', () => {
    const cap = getBillingCapability('CL');
    expect(cap.countryCode).toBe('CL');
    expect(cap.primaryMode).toBe('MERCADO_PAGO');
    expect(cap.supportedModes).toContain('MERCADO_PAGO');
    expect(cap.supportedModes).toContain('SALES_ASSISTED');
  });

  it('configures Venezuela with Sales Assisted only and 0 Mercado Pago CTAs', () => {
    const cap = getBillingCapability('VE');
    expect(cap.countryCode).toBe('VE');
    expect(cap.primaryMode).toBe('SALES_ASSISTED');
    expect(cap.supportedModes).toEqual(['SALES_ASSISTED']);
    expect(cap.supportedModes).not.toContain('MERCADO_PAGO');
  });

  it('configures Colombia with Sales Assisted mode', () => {
    const cap = getBillingCapability('CO');
    expect(cap.countryCode).toBe('CO');
    expect(cap.primaryMode).toBe('SALES_ASSISTED');
    expect(cap.supportedModes).toEqual(['SALES_ASSISTED']);
  });

  it('generates safe WhatsApp Sales CTA message without exposing internal UUIDs', () => {
    const url = buildSalesWhatsAppUrl({
      businessName: 'Minimarket Don Pepe',
      countryName: 'Venezuela',
      interval: 'MONTHLY',
    });

    expect(url).toContain('https://wa.me/');
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain('Minimarket Don Pepe');
    expect(decoded).toContain('Venezuela');
    expect(decoded).toContain('Mensual');
    // Verify no UUID patterns in message
    expect(decoded).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  });
});
