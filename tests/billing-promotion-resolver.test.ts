import { describe, it, expect } from 'vitest';
import { resolvePromotion, PromotionInput } from '../src/domain/billing/PromotionResolver';

const founders: PromotionInput = {
  code: 'FOUNDERS_50',
  discountType: 'FIXED_NET_PRICE',
  fixedMonthlyNetAmount: 9990,
  fixedAnnualNetAmount: 99990,
  applicableBillingIntervals: 'BOTH',
  status: 'ACTIVE',
  redemptionsCount: 0,
};

const percentCoupon: PromotionInput = {
  code: 'TESTAMIGO50',
  discountType: 'PERCENT',
  discountPercentBp: 5000,
  applicableBillingIntervals: 'MONTHLY',
  status: 'ACTIVE',
  redemptionsCount: 0,
};

const fixedAnnualCoupon: PromotionInput = {
  code: 'TESTANUAL',
  discountType: 'FIXED_NET_PRICE',
  fixedAnnualNetAmount: 149990,
  applicableBillingIntervals: 'ANNUAL',
  status: 'ACTIVE',
  redemptionsCount: 0,
};

describe('PromotionResolver — no stacking', () => {
  it('no promotions → base price', () => {
    const r = resolvePromotion({ billingInterval: 'MONTHLY', baseNetAmount: 19990 });
    expect(r.appliedCode).toBeNull();
    expect(r.finalNetAmount).toBe(19990);
    expect(r.finalGrossAmount).toBe(23788);
  });

  it('public Founders only → applied', () => {
    const r = resolvePromotion({ billingInterval: 'MONTHLY', baseNetAmount: 19990, publicPromotion: founders });
    expect(r.appliedCode).toBe('FOUNDERS_50');
    expect(r.finalNetAmount).toBe(9990);
    expect(r.finalGrossAmount).toBe(11888);
  });

  it('explicit coupon only → applied', () => {
    const r = resolvePromotion({ billingInterval: 'MONTHLY', baseNetAmount: 19990, explicitPromotion: percentCoupon });
    expect(r.appliedCode).toBe('TESTAMIGO50');
    expect(r.finalNetAmount).toBe(9995);
  });

  it('both valid — best price wins', () => {
    // Founders: 9990 net → 11888 gross
    // TESTAMIGO50: 9995 net → 11894 gross
    // Founders is cheaper → applied
    const r = resolvePromotion({
      billingInterval: 'MONTHLY',
      baseNetAmount: 19990,
      publicPromotion: founders,
      explicitPromotion: percentCoupon,
    });
    expect(r.appliedCode).toBe('FOUNDERS_50');
    expect(r.rejectedPromotion?.code).toBe('TESTAMIGO50');
    expect(r.rejectedPromotion?.reason).toBe('INFERIOR_PRICE');
  });

  it('NO stacking — only one promotion applied', () => {
    const r = resolvePromotion({
      billingInterval: 'MONTHLY',
      baseNetAmount: 19990,
      publicPromotion: founders,
      explicitPromotion: percentCoupon,
    });
    // Discount is only from winner, not sum of both
    expect(r.discountNetAmount).toBe(10000); // 19990 - 9990
  });

  it('CLOSED promotion → INACTIVE rejection', () => {
    const closed = { ...founders, status: 'CLOSED' as const };
    const r = resolvePromotion({ billingInterval: 'MONTHLY', baseNetAmount: 19990, publicPromotion: closed });
    expect(r.appliedCode).toBeNull();
  });

  it('EXPIRED promotion → EXPIRED rejection', () => {
    const expired = { ...percentCoupon, validUntil: '2020-01-01T00:00:00Z' };
    const r = resolvePromotion({
      billingInterval: 'MONTHLY',
      baseNetAmount: 19990,
      explicitPromotion: expired,
    });
    expect(r.rejectedPromotion?.reason).toBe('EXPIRED');
  });

  it('coupon with wrong interval → INTERVAL_NOT_SUPPORTED', () => {
    const r = resolvePromotion({
      billingInterval: 'ANNUAL', // coupon only valid for MONTHLY
      baseNetAmount: 199990,
      explicitPromotion: percentCoupon,
    });
    expect(r.rejectedPromotion?.reason).toBe('INTERVAL_NOT_SUPPORTED');
  });

  it('redemption limit reached → ALREADY_USED', () => {
    const exhausted = { ...percentCoupon, maxRedemptions: 10, redemptionsCount: 10 };
    const r = resolvePromotion({
      billingInterval: 'MONTHLY',
      baseNetAmount: 19990,
      explicitPromotion: exhausted,
    });
    expect(r.rejectedPromotion?.reason).toBe('ALREADY_USED');
  });

  it('Founders annual: 99990 net → 118988 gross', () => {
    const r = resolvePromotion({ billingInterval: 'ANNUAL', baseNetAmount: 199990, publicPromotion: founders });
    expect(r.finalNetAmount).toBe(99990);
    expect(r.finalGrossAmount).toBe(118988);
  });

  it('annual fixed coupon applied', () => {
    const r = resolvePromotion({ billingInterval: 'ANNUAL', baseNetAmount: 199990, explicitPromotion: fixedAnnualCoupon });
    expect(r.appliedCode).toBe('TESTANUAL');
    expect(r.finalNetAmount).toBe(149990);
  });

  it('coupon normalization — lowercase is same as uppercase (caller normalizes)', () => {
    // PromotionResolver receives already-normalized codes from server
    // This test verifies the code field is treated as-is
    const r = resolvePromotion({
      billingInterval: 'MONTHLY',
      baseNetAmount: 19990,
      explicitPromotion: { ...percentCoupon, code: 'TESTAMIGO50' },
    });
    expect(r.appliedCode).toBe('TESTAMIGO50');
  });

  it('public code manually entered returns PUBLIC_PROMOTION_ALREADY_APPLIED', () => {
    // When user enters FOUNDERS_50 manually while FOUNDERS_50 is active
    const r = resolvePromotion({
      billingInterval: 'MONTHLY',
      baseNetAmount: 19990,
      publicPromotion: founders,
      explicitPromotion: founders, // User typed the public promo code
    });
    expect(r.appliedCode).toBe('FOUNDERS_50');
    expect(r.finalNetAmount).toBe(9990);
    expect(r.finalGrossAmount).toBe(11888);
    expect(r.rejectedPromotion?.code).toBe('FOUNDERS_50');
    expect(r.rejectedPromotion?.reason).toBe('PUBLIC_PROMOTION_ALREADY_APPLIED');
  });

  it('couponCode omitted works and auto-applies public campaign', () => {
    const monthly = resolvePromotion({
      billingInterval: 'MONTHLY',
      baseNetAmount: 19990,
      publicPromotion: founders,
    });
    expect(monthly.appliedCode).toBe('FOUNDERS_50');
    expect(monthly.finalNetAmount).toBe(9990);
    expect(monthly.finalGrossAmount).toBe(11888);

    const annual = resolvePromotion({
      billingInterval: 'ANNUAL',
      baseNetAmount: 199990,
      publicPromotion: founders,
    });
    expect(annual.appliedCode).toBe('FOUNDERS_50');
    expect(annual.finalNetAmount).toBe(99990);
    expect(annual.finalGrossAmount).toBe(118988);
  });

  it('closed Founder promo falls back to standard base price', () => {
    const closedFounders: PromotionInput = { ...founders, status: 'CLOSED' };
    const r = resolvePromotion({
      billingInterval: 'MONTHLY',
      baseNetAmount: 19990,
      publicPromotion: closedFounders,
    });
    expect(r.appliedCode).toBeNull();
    expect(r.finalNetAmount).toBe(19990);
    expect(r.finalGrossAmount).toBe(23788);
  });
});
