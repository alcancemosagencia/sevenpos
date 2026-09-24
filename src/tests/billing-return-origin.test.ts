import { describe, expect, it } from 'vitest';
import { resolveBillingReturnUrl } from '../../supabase/functions/_shared/billingReturnOrigin';

describe('billing dual-host return origin', () => {
  const fallback = 'https://app.sevenpos.pro';

  it('returns each approved browser host to its own canonical route', () => {
    expect(resolveBillingReturnUrl('https://sevenpos.pro', 'https://sevenpos.pro', fallback))
      .toBe('https://sevenpos.pro/subscription/return');
    expect(resolveBillingReturnUrl('https://app.sevenpos.pro', 'https://app.sevenpos.pro', fallback))
      .toBe('https://app.sevenpos.pro/subscription/return');
  });

  it('rejects arbitrary, mismatched and path-bearing origins', () => {
    for (const requested of [
      'https://evil.example',
      'http://app.sevenpos.pro',
      'https://app.sevenpos.pro.evil.example',
      'https://app.sevenpos.pro/other',
      'https://app.sevenpos.pro/?next=evil',
    ]) {
      expect(resolveBillingReturnUrl(requested, 'https://app.sevenpos.pro', fallback))
        .toBe('https://app.sevenpos.pro/subscription/return');
    }
    expect(resolveBillingReturnUrl('https://app.sevenpos.pro', 'https://sevenpos.pro', fallback))
      .toBe('https://app.sevenpos.pro/subscription/return');
    expect(resolveBillingReturnUrl('https://app.sevenpos.pro', null, fallback))
      .toBe('https://app.sevenpos.pro/subscription/return');
  });

  it('keeps legacy clients on canonical APP_URL', () => {
    expect(resolveBillingReturnUrl(undefined, 'https://app.sevenpos.pro', fallback))
      .toBe('https://app.sevenpos.pro/subscription/return');
  });
});
