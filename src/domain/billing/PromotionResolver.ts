import { BillingInterval, DiscountType, resolvePromotionNet, calcMoney } from './BillingMath';

export type PromotionRejectReason =
  | 'PUBLIC_PROMOTION_ALREADY_APPLIED'
  | 'INFERIOR_PRICE'
  | 'INVALID'
  | 'EXPIRED'
  | 'INACTIVE'
  | 'INTERVAL_NOT_SUPPORTED'
  | 'ALREADY_USED';

export interface PromotionInput {
  code: string;
  discountType: DiscountType;
  discountPercentBp?: number;
  fixedMonthlyNetAmount?: number;
  fixedAnnualNetAmount?: number;
  applicableBillingIntervals: 'MONTHLY' | 'ANNUAL' | 'BOTH';
  status: 'ACTIVE' | 'CLOSED';
  validFrom?: string | null;
  validUntil?: string | null;
  maxRedemptions?: number | null;
  redemptionsCount: number;
}

export interface ResolutionInput {
  billingInterval: BillingInterval;
  baseNetAmount: number;
  publicPromotion?: PromotionInput | null;
  explicitPromotion?: PromotionInput | null;
  now?: Date;
}

export interface ResolutionResult {
  appliedCode: string | null;
  appliedDiscountType: DiscountType | null;
  finalNetAmount: number;
  discountNetAmount: number;
  finalGrossAmount: number;
  taxAmount: number;
  rejectedPromotion?: { code: string; reason: PromotionRejectReason } | null;
}

function isPromotionValid(
  p: PromotionInput,
  interval: BillingInterval,
  now: Date
): { valid: boolean; reason?: PromotionRejectReason } {
  if (p.status !== 'ACTIVE') return { valid: false, reason: 'INACTIVE' };
  if (p.validFrom && new Date(p.validFrom) > now) return { valid: false, reason: 'INACTIVE' };
  if (p.validUntil && new Date(p.validUntil) < now) return { valid: false, reason: 'EXPIRED' };
  if (p.maxRedemptions !== null && p.maxRedemptions !== undefined && p.redemptionsCount >= p.maxRedemptions) {
    return { valid: false, reason: 'ALREADY_USED' };
  }
  const supportsInterval =
    p.applicableBillingIntervals === 'BOTH' || p.applicableBillingIntervals === interval;
  if (!supportsInterval) return { valid: false, reason: 'INTERVAL_NOT_SUPPORTED' };
  return { valid: true };
}

function calculateGross(p: PromotionInput, interval: BillingInterval, baseNet: number): number {
  const { finalNetAmount } = resolvePromotionNet({
    discountType: p.discountType,
    discountPercentBp: p.discountPercentBp,
    fixedMonthlyNetAmount: p.fixedMonthlyNetAmount,
    fixedAnnualNetAmount: p.fixedAnnualNetAmount,
    billingInterval: interval,
    baseNetAmount: baseNet,
  });
  return calcMoney(finalNetAmount).grossAmount;
}

/**
 * Deterministic promotion resolution — NO stacking.
 * Rules:
 * 1. No explicit code → apply PUBLIC if valid.
 * 2. Explicit code only → apply explicit.
 * 3. Both valid → apply whichever gives LOWER gross (customer wins).
 */
export function resolvePromotion(input: ResolutionInput): ResolutionResult {
  const now = input.now ?? new Date();
  const { billingInterval, baseNetAmount, publicPromotion, explicitPromotion } = input;


  let publicValid = false;
  if (publicPromotion) {
    const check = isPromotionValid(publicPromotion, billingInterval, now);
    publicValid = check.valid;
  }

  let explicitValid = false;
  let explicitReason: PromotionRejectReason | undefined;
  if (explicitPromotion) {
    const check = isPromotionValid(explicitPromotion, billingInterval, now);
    explicitValid = check.valid;
    explicitReason = check.reason;
  }

  // No promotion available
  if (!publicValid && !explicitValid) {
    const breakdown = calcMoney(baseNetAmount);
    return {
      appliedCode: null,
      appliedDiscountType: null,
      finalNetAmount: baseNetAmount,
      discountNetAmount: 0,
      finalGrossAmount: breakdown.grossAmount,
      taxAmount: breakdown.taxAmount,
      rejectedPromotion: explicitPromotion && explicitReason
        ? { code: explicitPromotion.code, reason: explicitReason }
        : null,
    };
  }

  // Only public available
  if (publicValid && !explicitValid) {
    const { finalNetAmount, discountNetAmount } = resolvePromotionNet({
      discountType: publicPromotion!.discountType,
      discountPercentBp: publicPromotion!.discountPercentBp,
      fixedMonthlyNetAmount: publicPromotion!.fixedMonthlyNetAmount,
      fixedAnnualNetAmount: publicPromotion!.fixedAnnualNetAmount,
      billingInterval,
      baseNetAmount,
    });
    const { taxAmount, grossAmount } = calcMoney(finalNetAmount);
    return {
      appliedCode: publicPromotion!.code,
      appliedDiscountType: publicPromotion!.discountType,
      finalNetAmount,
      discountNetAmount,
      finalGrossAmount: grossAmount,
      taxAmount,
      rejectedPromotion: explicitPromotion && explicitReason
        ? { code: explicitPromotion.code, reason: explicitReason }
        : null,
    };
  }

  // Only explicit available
  if (explicitValid && !publicValid) {
    const { finalNetAmount, discountNetAmount } = resolvePromotionNet({
      discountType: explicitPromotion!.discountType,
      discountPercentBp: explicitPromotion!.discountPercentBp,
      fixedMonthlyNetAmount: explicitPromotion!.fixedMonthlyNetAmount,
      fixedAnnualNetAmount: explicitPromotion!.fixedAnnualNetAmount,
      billingInterval,
      baseNetAmount,
    });
    const { taxAmount, grossAmount } = calcMoney(finalNetAmount);
    return {
      appliedCode: explicitPromotion!.code,
      appliedDiscountType: explicitPromotion!.discountType,
      finalNetAmount,
      discountNetAmount,
      finalGrossAmount: grossAmount,
      taxAmount,
      rejectedPromotion: null,
    };
  }

  // Explicit code is identical to active public promotion
  if (publicValid && explicitValid && explicitPromotion!.code === publicPromotion!.code) {
    const { finalNetAmount, discountNetAmount } = resolvePromotionNet({
      discountType: publicPromotion!.discountType,
      discountPercentBp: publicPromotion!.discountPercentBp,
      fixedMonthlyNetAmount: publicPromotion!.fixedMonthlyNetAmount,
      fixedAnnualNetAmount: publicPromotion!.fixedAnnualNetAmount,
      billingInterval,
      baseNetAmount,
    });
    const { taxAmount, grossAmount } = calcMoney(finalNetAmount);
    return {
      appliedCode: publicPromotion!.code,
      appliedDiscountType: publicPromotion!.discountType,
      finalNetAmount,
      discountNetAmount,
      finalGrossAmount: grossAmount,
      taxAmount,
      rejectedPromotion: { code: explicitPromotion!.code, reason: 'PUBLIC_PROMOTION_ALREADY_APPLIED' },
    };
  }

  // Both valid — apply best price for customer
  const publicGross = calculateGross(publicPromotion!, billingInterval, baseNetAmount);
  const explicitGross = calculateGross(explicitPromotion!, billingInterval, baseNetAmount);

  const winner = publicGross <= explicitGross ? publicPromotion! : explicitPromotion!;
  const loser = publicGross <= explicitGross ? explicitPromotion! : publicPromotion!;

  const { finalNetAmount, discountNetAmount } = resolvePromotionNet({
    discountType: winner.discountType,
    discountPercentBp: winner.discountPercentBp,
    fixedMonthlyNetAmount: winner.fixedMonthlyNetAmount,
    fixedAnnualNetAmount: winner.fixedAnnualNetAmount,
    billingInterval,
    baseNetAmount,
  });
  const { taxAmount, grossAmount } = calcMoney(finalNetAmount);

  return {
    appliedCode: winner.code,
    appliedDiscountType: winner.discountType,
    finalNetAmount,
    discountNetAmount,
    finalGrossAmount: grossAmount,
    taxAmount,
    rejectedPromotion: { code: loser.code, reason: 'INFERIOR_PRICE' },
  };
}
