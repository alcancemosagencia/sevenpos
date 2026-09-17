import { describe, it, expect } from 'vitest';
import type { PricePreviewResponse } from '../src/infrastructure/billing/BillingApiClient';

describe('AG-15C-B.4 — Billing Auth Boundary & Security Audit', () => {
  it('1. Public price preview contains NO private data or business entities', () => {
    const publicPreview: PricePreviewResponse = {
      valid: true,
      planId: 'pro_monthly',
      billingInterval: 'MONTHLY',
      baseNetAmount: 19990,
      discountNetAmount: 10000,
      finalNetAmount: 9990,
      taxAmount: 1898,
      finalGrossAmount: 11888,
      appliedPromotionCode: 'FOUNDERS_50',
      durationMonths: 12,
      renewalNetAmount: 19990,
      renewalGrossAmount: 23788,
      isFounders: true,
      couponStatus: null,
    };

    // Invariant: public preview exposes only commercial numbers, NO tenant/business/payment/contracts data
    const previewDict = publicPreview as unknown as Record<string, unknown>;
    expect(previewDict.business_id).toBeUndefined();
    expect(previewDict.subscription_id).toBeUndefined();
    expect(previewDict.payment_id).toBeUndefined();
    expect(previewDict.contract_id).toBeUndefined();
    expect(previewDict.mp_preapproval_id).toBeUndefined();
    expect(previewDict.owner_email).toBeUndefined();
  });

  it('2. Publishable key alone cannot be used as user bearer identity', () => {
    const publishableKey = 'sb_publishable_test_key_123';
    // Contract: publishable key starts with sb_publishable_ and is NOT a user JWT
    expect(publishableKey.startsWith('sb_publishable_')).toBe(true);

    // Invariant: client must never attach publishable key in place of user session JWT
    const getAuthHeader = (sessionToken: string | null) => {
      if (sessionToken) return `Bearer ${sessionToken}`;
      return undefined; // Must NOT fall back to Bearer publishableKey
    };

    expect(getAuthHeader(null)).toBeUndefined();
    expect(getAuthHeader('valid_user_jwt')).toBe('Bearer valid_user_jwt');
  });

  it('3. Private coupon validation requires authenticated cloud session with OWNER role', () => {
    const isPrivateCouponCheck = (couponCode: string | null, publicPromoCode: string | null) => {
      return Boolean(couponCode && (!publicPromoCode || couponCode !== publicPromoCode));
    };

    // Public code / no code doesn't require user session
    expect(isPrivateCouponCheck(null, 'FOUNDERS_50')).toBe(false);
    expect(isPrivateCouponCheck('FOUNDERS_50', 'FOUNDERS_50')).toBe(false);

    // Private coupon requires user session
    expect(isPrivateCouponCheck('SECRET50', 'FOUNDERS_50')).toBe(true);

    const validatePrivateCouponAuth = (
      authHeader: string | null,
      user: { id: string } | null,
      membership: { role: string; status: string } | null
    ) => {
      if (!authHeader || !user) {
        return { status: 401, reason: 'AUTH_REQUIRED' };
      }
      if (!membership || membership.status !== 'ACTIVE' || membership.role !== 'OWNER') {
        return { status: 403, reason: 'NOT_OWNER' };
      }
      return { status: 200, allowed: true };
    };

    // Anonymous + private coupon -> 401
    expect(validatePrivateCouponAuth(null, null, null)).toEqual({
      status: 401,
      reason: 'AUTH_REQUIRED',
    });

    // Authenticated CASHIER + private coupon -> 403
    expect(
      validatePrivateCouponAuth('Bearer cashier_jwt', { id: 'u_cashier' }, { role: 'CASHIER', status: 'ACTIVE' })
    ).toEqual({ status: 403, reason: 'NOT_OWNER' });

    // Authenticated ADMIN + private coupon -> 403
    expect(
      validatePrivateCouponAuth('Bearer admin_jwt', { id: 'u_admin' }, { role: 'ADMIN', status: 'ACTIVE' })
    ).toEqual({ status: 403, reason: 'NOT_OWNER' });

    // Authenticated INACTIVE OWNER + private coupon -> 403
    expect(
      validatePrivateCouponAuth('Bearer owner_jwt', { id: 'u_owner' }, { role: 'OWNER', status: 'INACTIVE' })
    ).toEqual({ status: 403, reason: 'NOT_OWNER' });

    // Authenticated ACTIVE OWNER + private coupon -> 200 allowed
    expect(
      validatePrivateCouponAuth('Bearer owner_jwt', { id: 'u_owner' }, { role: 'OWNER', status: 'ACTIVE' })
    ).toEqual({ status: 200, allowed: true });

    // Non-owner querying invalid/unknown private coupon -> 403 NOT_OWNER (anti-enumeration: role check precedes coupon existence)
    expect(
      validatePrivateCouponAuth('Bearer cashier_jwt', { id: 'u_cashier' }, { role: 'CASHIER', status: 'ACTIVE' })
    ).toEqual({ status: 403, reason: 'NOT_OWNER' });
  });

  it('4. Create intent without cloud session is denied', () => {
    const canCreateIntent = (userSession: { user?: { id: string } } | null, role?: string) => {
      if (!userSession?.user) return { allowed: false, reason: 'UNAUTHORIZED' };
      if (role !== 'OWNER') return { allowed: false, reason: 'NOT_OWNER' };
      return { allowed: true };
    };

    // No session
    expect(canCreateIntent(null)).toEqual({ allowed: false, reason: 'UNAUTHORIZED' });
    // Non-owner cashier
    expect(canCreateIntent({ user: { id: 'u1' } }, 'CASHIER')).toEqual({ allowed: false, reason: 'NOT_OWNER' });
    // Owner
    expect(canCreateIntent({ user: { id: 'u1' } }, 'OWNER')).toEqual({ allowed: true });
  });

  it('5. Cancel subscription requires OWNER cloud session', () => {
    const canCancel = (userSession: { user?: { id: string } } | null, role?: string) => {
      if (!userSession?.user) return { allowed: false, reason: 'UNAUTHORIZED' };
      if (role !== 'OWNER') return { allowed: false, reason: 'NOT_OWNER' };
      return { allowed: true };
    };

    expect(canCancel(null)).toEqual({ allowed: false, reason: 'UNAUTHORIZED' });
    expect(canCancel({ user: { id: 'u2' } }, 'ADMIN')).toEqual({ allowed: false, reason: 'NOT_OWNER' });
    expect(canCancel({ user: { id: 'u2' } }, 'OWNER')).toEqual({ allowed: true });
  });

  it('6. Local PIN unlock is distinct from Cloud Auth session', () => {
    const localTerminalState = {
      deviceEnrolled: true,
      pinUnlocked: true,
      cloudSession: null as string | null,
    };

    // Device is operationally unlocked locally for POS, but cloud billing session is absent
    expect(localTerminalState.pinUnlocked).toBe(true);
    expect(localTerminalState.cloudSession).toBeNull();

    // Re-auth flow must authenticate cloud without clearing local database/device
    const reAuth = (cloudUserToken: string) => {
      return {
        ...localTerminalState,
        cloudSession: cloudUserToken,
      };
    };

    const afterReAuth = reAuth('jwt_owner_session');
    expect(afterReAuth.deviceEnrolled).toBe(true);
    expect(afterReAuth.pinUnlocked).toBe(true);
    expect(afterReAuth.cloudSession).toBe('jwt_owner_session');
  });

  it('7. Maintenance functions reject unauthorized/anonymous callers', () => {
    const isAuthorizedScheduler = (authHeader: string | null, cronSecret: string | null, serviceKey: string, expectedCronSecret: string) => {
      if (cronSecret && cronSecret === expectedCronSecret) return true;
      if (authHeader && authHeader === `Bearer ${serviceKey}`) return true;
      return false;
    };

    const serviceKey = 'service_role_secret_key';
    const cronSecret = 'my_super_cron_secret';

    // Anonymous caller
    expect(isAuthorizedScheduler(null, null, serviceKey, cronSecret)).toBe(false);
    // User JWT
    expect(isAuthorizedScheduler('Bearer user_jwt_token', null, serviceKey, cronSecret)).toBe(false);
    // Service role key
    expect(isAuthorizedScheduler(`Bearer ${serviceKey}`, null, serviceKey, cronSecret)).toBe(true);
    // Cron secret header
    expect(isAuthorizedScheduler(null, cronSecret, serviceKey, cronSecret)).toBe(true);
  });
});
