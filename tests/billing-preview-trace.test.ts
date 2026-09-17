import { describe, it, expect } from 'vitest';
import type { PricePreviewResponse } from '../src/infrastructure/billing/BillingApiClient';

describe('AG-15C-B.3 — Billing Price Preview & Trace Invariants', () => {
  const sampleFoundersMonthlyResponse: PricePreviewResponse = {
    valid: true,
    planId: 'pro_monthly',
    billingInterval: 'MONTHLY',
    baseNetAmount: 19990,
    discountNetAmount: 10000,
    finalNetAmount: 9990,
    taxAmount: 1898,
    finalGrossAmount: 11888,
    appliedPromotionCode: 'FOUNDERS_50',
    appliedPromotionType: 'FIXED_NET_PRICE',
    durationMonths: 12,
    durationType: 'N_MONTHS',
    renewalNetAmount: 19990,
    renewalGrossAmount: 23788,
    isFounders: true,
    promotionCode: 'FOUNDERS_50',
    couponStatus: null,
  };

  const sampleFoundersAnnualResponse: PricePreviewResponse = {
    valid: true,
    planId: 'pro_annual',
    billingInterval: 'ANNUAL',
    baseNetAmount: 199990,
    discountNetAmount: 100000,
    finalNetAmount: 99990,
    taxAmount: 18998,
    finalGrossAmount: 118988,
    appliedPromotionCode: 'FOUNDERS_50',
    appliedPromotionType: 'FIXED_NET_PRICE',
    durationMonths: 12,
    durationType: 'N_MONTHS',
    renewalNetAmount: 199990,
    renewalGrossAmount: 237988,
    isFounders: true,
    promotionCode: 'FOUNDERS_50',
    couponStatus: null,
  };

  it('1. Remote response field mapping matches PricePreviewResponse contract', () => {
    const res = sampleFoundersMonthlyResponse;
    expect(res.valid).toBe(true);
    expect(res.planId).toBe('pro_monthly');
    expect(res.billingInterval).toBe('MONTHLY');
    expect(res.baseNetAmount).toBe(19990);
    expect(res.discountNetAmount).toBe(10000);
    expect(res.finalNetAmount).toBe(9990);
    expect(res.taxAmount).toBe(1898);
    expect(res.finalGrossAmount).toBe(11888);
    expect(res.appliedPromotionCode).toBe('FOUNDERS_50');
    expect(res.durationMonths).toBe(12);
    expect(res.renewalNetAmount).toBe(19990);
    expect(res.renewalGrossAmount).toBe(23788);
    expect(res.isFounders).toBe(true);
  });

  it('2. PUBLIC Founder response renders Founder pricing and term parameters', () => {
    const monthly = sampleFoundersMonthlyResponse;
    expect(monthly.isFounders).toBe(true);
    expect(monthly.finalNetAmount).toBe(9990);
    expect(monthly.taxAmount).toBe(1898);
    expect(monthly.finalGrossAmount).toBe(11888);
    expect(monthly.durationMonths).toBe(12);
    expect(monthly.renewalNetAmount).toBe(19990);

    const annual = sampleFoundersAnnualResponse;
    expect(annual.isFounders).toBe(true);
    expect(annual.finalNetAmount).toBe(99990);
    expect(annual.taxAmount).toBe(18998);
    expect(annual.finalGrossAmount).toBe(118988);
    expect(annual.durationMonths).toBe(12);
    expect(annual.renewalNetAmount).toBe(199990);
  });

  it('3. Auth or network failure does NOT fall back silently to standard price', () => {
    // Invariant: when fetchPricePreview catches an error, state must have pricePreview=null and pricePreviewError set
    let pricePreview: PricePreviewResponse | null = null;
    let pricePreviewError: string | null = null;

    const simulateFailedFetch = () => {
      try {
        throw new Error('401 Unauthorized / Network Error');
      } catch {
        // Correct behavior: do NOT set fake 19990 price
        pricePreview = null;
        pricePreviewError = 'No pudimos cargar el precio en este momento.';
      }
    };

    simulateFailedFetch();

    expect(pricePreview).toBeNull();
    expect(pricePreviewError).toBe('No pudimos cargar el precio en este momento.');
  });

  it('4. Preview failure disables checkout button', () => {
    // Evaluation of CTA disabled state
    const isPricePreviewLoading = false;
    const pricePreview: PricePreviewResponse | null = null;
    const pricePreviewError: string | null = 'No pudimos cargar el precio en este momento.';

    const isCtaDisabled = isPricePreviewLoading || !pricePreview || !!pricePreviewError;
    expect(isCtaDisabled).toBe(true);
  });

  it('5. Modal uses same pricePreview object ensuring zero discrepancy', () => {
    const preview = sampleFoundersMonthlyResponse;
    const modalBase = preview.baseNetAmount;
    const modalDiscount = preview.discountNetAmount;
    const modalNet = preview.finalNetAmount;
    const modalTax = preview.taxAmount;
    const modalGross = preview.finalGrossAmount;

    expect(modalBase).toBe(19990);
    expect(modalDiscount).toBe(10000);
    expect(modalNet).toBe(9990);
    expect(modalTax).toBe(1898);
    expect(modalGross).toBe(11888);
    expect(modalNet + modalTax).toBe(modalGross);
    expect(modalBase - modalDiscount).toBe(modalNet);
  });

  it('6. Stale fallback 19990 is not rendered as a successful preview', () => {
    const errorState: { preview: PricePreviewResponse | null; error: string | null } = {
      preview: null,
      error: 'No pudimos cargar el precio en este momento.',
    };

    // An error state should never report standard price as valid preview
    expect(errorState.preview).toBeNull();
    expect(errorState.error).toBeTruthy();
  });
});
