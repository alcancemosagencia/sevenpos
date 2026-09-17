/**
 * BillingMath — Canonical CLP billing calculations
 *
 * All amounts are CLP integers (no decimals).
 * Tax: ROUND(net * rate) using standard 0.5 rounding.
 * These functions are the single source of truth for billing arithmetic.
 */

export const CLP_TAX_RATE = 0.19;

export interface MoneyBreakdown {
  netAmount: number;    // CLP integer
  taxAmount: number;    // ROUND(netAmount * taxRate)
  grossAmount: number;  // netAmount + taxAmount
  taxRate: number;      // 0.19
}

/**
 * Calculate tax and gross from a CLP net amount.
 * Uses Math.round (standard half-up rounding).
 *
 * Examples:
 *   calcMoney(19990) → { netAmount: 19990, taxAmount: 3798, grossAmount: 23788 }
 *   calcMoney(9990)  → { netAmount: 9990,  taxAmount: 1898, grossAmount: 11888 }
 *   calcMoney(199990) → { netAmount: 199990, taxAmount: 37998, grossAmount: 237988 }
 *   calcMoney(99990) → { netAmount: 99990,  taxAmount: 18998, grossAmount: 118988 }
 */
export function calcMoney(netAmount: number, taxRate = CLP_TAX_RATE): MoneyBreakdown {
  if (!Number.isInteger(netAmount) || netAmount < 0) {
    throw new Error(`BillingMath: netAmount must be a non-negative integer, got ${netAmount}`);
  }
  const taxAmount = Math.round(netAmount * taxRate);
  const grossAmount = netAmount + taxAmount;
  return { netAmount, taxAmount, grossAmount, taxRate };
}

/**
 * Resolve the net amount from a promotion for a given billing interval.
 *
 * PERCENT: final_net = Math.round(baseNet * (10000 - basisPoints) / 10000)
 * FIXED_NET_PRICE: final_net = interval-specific fixed amount
 * FREE: final_net = 0
 */
export type BillingInterval = 'MONTHLY' | 'ANNUAL';
export type DiscountType = 'PERCENT' | 'FIXED_NET_PRICE' | 'FREE';

export interface PromotionPriceInput {
  discountType: DiscountType;
  discountPercentBp?: number;       // for PERCENT: basis points
  fixedMonthlyNetAmount?: number;   // for FIXED_NET_PRICE + MONTHLY
  fixedAnnualNetAmount?: number;    // for FIXED_NET_PRICE + ANNUAL
  billingInterval: BillingInterval;
  baseNetAmount: number;            // from billing_plans
}

export interface PromotionPriceResult {
  finalNetAmount: number;
  discountNetAmount: number;        // baseNet - finalNet
}

export function resolvePromotionNet(input: PromotionPriceInput): PromotionPriceResult {
  const { discountType, billingInterval, baseNetAmount } = input;

  let finalNetAmount: number;

  switch (discountType) {
    case 'PERCENT': {
      const bp = input.discountPercentBp;
      if (bp === undefined || bp === null) {
        throw new Error('BillingMath: discountPercentBp required for PERCENT discount');
      }
      if (bp <= 0 || bp > 10000) {
        throw new Error(`BillingMath: discountPercentBp must be 1-10000, got ${bp}`);
      }
      finalNetAmount = Math.round(baseNetAmount * (10000 - bp) / 10000);
      break;
    }
    case 'FIXED_NET_PRICE': {
      if (billingInterval === 'MONTHLY') {
        if (input.fixedMonthlyNetAmount === undefined || input.fixedMonthlyNetAmount === null) {
          throw new Error('BillingMath: fixedMonthlyNetAmount required for FIXED_NET_PRICE + MONTHLY');
        }
        finalNetAmount = input.fixedMonthlyNetAmount;
      } else {
        if (input.fixedAnnualNetAmount === undefined || input.fixedAnnualNetAmount === null) {
          throw new Error('BillingMath: fixedAnnualNetAmount required for FIXED_NET_PRICE + ANNUAL');
        }
        finalNetAmount = input.fixedAnnualNetAmount;
      }
      break;
    }
    case 'FREE': {
      finalNetAmount = 0;
      break;
    }
    default: {
      throw new Error(`BillingMath: unknown discountType ${discountType}`);
    }
  }

  return {
    finalNetAmount,
    discountNetAmount: Math.max(0, baseNetAmount - finalNetAmount),
  };
}
