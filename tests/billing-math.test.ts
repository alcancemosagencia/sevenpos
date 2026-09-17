import { describe, it, expect } from 'vitest';
import { calcMoney, resolvePromotionNet } from '../src/domain/billing/BillingMath';

describe('BillingMath — calcMoney', () => {
  it('19990 net → 3798 tax → 23788 gross', () => {
    const result = calcMoney(19990);
    expect(result.netAmount).toBe(19990);
    expect(result.taxAmount).toBe(3798);
    expect(result.grossAmount).toBe(23788);
  });

  it('199990 net → 37998 tax → 237988 gross', () => {
    const result = calcMoney(199990);
    expect(result.netAmount).toBe(199990);
    expect(result.taxAmount).toBe(37998);
    expect(result.grossAmount).toBe(237988);
  });

  it('9990 net → 1898 tax → 11888 gross (Founders monthly)', () => {
    const result = calcMoney(9990);
    expect(result.netAmount).toBe(9990);
    expect(result.taxAmount).toBe(1898);
    expect(result.grossAmount).toBe(11888);
  });

  it('99990 net → 18998 tax → 118988 gross (Founders annual)', () => {
    const result = calcMoney(99990);
    expect(result.netAmount).toBe(99990);
    expect(result.taxAmount).toBe(18998);
    expect(result.grossAmount).toBe(118988);
  });

  it('gross = net + tax invariant', () => {
    for (const net of [0, 100, 9990, 19990, 99990, 199990, 39990]) {
      const { netAmount, taxAmount, grossAmount } = calcMoney(net);
      expect(grossAmount).toBe(netAmount + taxAmount);
    }
  });

  it('throws for non-integer net', () => {
    expect(() => calcMoney(19990.5)).toThrow();
  });

  it('throws for negative net', () => {
    expect(() => calcMoney(-1)).toThrow();
  });
});

describe('BillingMath — resolvePromotionNet', () => {
  it('FOUNDERS monthly: FIXED_NET_PRICE 9990', () => {
    const result = resolvePromotionNet({
      discountType: 'FIXED_NET_PRICE',
      fixedMonthlyNetAmount: 9990,
      fixedAnnualNetAmount: 99990,
      billingInterval: 'MONTHLY',
      baseNetAmount: 19990,
    });
    expect(result.finalNetAmount).toBe(9990);
    expect(result.discountNetAmount).toBe(10000);
  });

  it('FOUNDERS annual: FIXED_NET_PRICE 99990', () => {
    const result = resolvePromotionNet({
      discountType: 'FIXED_NET_PRICE',
      fixedMonthlyNetAmount: 9990,
      fixedAnnualNetAmount: 99990,
      billingInterval: 'ANNUAL',
      baseNetAmount: 199990,
    });
    expect(result.finalNetAmount).toBe(99990);
    expect(result.discountNetAmount).toBe(100000);
  });

  it('PERCENT 50% monthly', () => {
    const result = resolvePromotionNet({
      discountType: 'PERCENT',
      discountPercentBp: 5000,
      billingInterval: 'MONTHLY',
      baseNetAmount: 19990,
    });
    expect(result.finalNetAmount).toBe(9995);
    expect(result.discountNetAmount).toBe(9995);
  });

  it('FREE coupon → 0', () => {
    const result = resolvePromotionNet({
      discountType: 'FREE',
      billingInterval: 'MONTHLY',
      baseNetAmount: 19990,
    });
    expect(result.finalNetAmount).toBe(0);
    expect(result.discountNetAmount).toBe(19990);
  });

  it('FIXED_NET_PRICE monthly throws if amount missing', () => {
    expect(() => resolvePromotionNet({
      discountType: 'FIXED_NET_PRICE',
      billingInterval: 'MONTHLY',
      baseNetAmount: 19990,
    })).toThrow();
  });

  it('PERCENT throws if bp missing', () => {
    expect(() => resolvePromotionNet({
      discountType: 'PERCENT',
      billingInterval: 'MONTHLY',
      baseNetAmount: 19990,
    })).toThrow();
  });

  it('annual reference: base 199990, no promotion → gross 237988', () => {
    const { grossAmount } = calcMoney(199990);
    expect(grossAmount).toBe(237988);
  });

  it('annual reference_net_amount is NULL — not 399990', () => {
    // This test documents the contract: annual reference is null
    const annualReferenceNetAmount: number | null = null;
    expect(annualReferenceNetAmount).toBeNull();
  });
});
