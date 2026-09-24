import { describe, expect, it } from 'vitest';
import { canonicalWwwRedirect, isPublicMarketingPath, legacyCustomerRedirect, resolveAppHost, resolveHostEntry } from '../app/hostRouting';
import { authRedirectOrigin } from '../infrastructure/cloud/authRedirectOrigin';
import { getCustomerAppUrl } from '../app/customerAppUrls';

describe('host-first routing preflight', () => {
  it('keeps root on the existing app until the cutover flag is enabled', () => {
    expect(resolveAppHost('sevenpos.pro', '/', '', false)).toBe('customer');
    expect(resolveAppHost('sevenpos.pro', '/landing', '', false)).toBe('marketing');
  });

  it('serves marketing on root after cutover while preserving one-time links', () => {
    expect(resolveAppHost('sevenpos.pro', '/', '', true)).toBe('marketing');
    expect(resolveAppHost('www.sevenpos.pro', '/negocios', '', true)).toBe('marketing');
    expect(resolveAppHost('sevenpos.pro', '/auth/callback', '', true)).toBe('customer');
    expect(resolveAppHost('sevenpos.pro', '/auth/reset-password', '', true)).toBe('customer');
    expect(resolveAppHost('sevenpos.pro', '/subscription/return', '', true)).toBe('customer');
  });

  it('isolates the three production hosts when root cutover is enabled', () => {
    expect(resolveAppHost('sevenpos.pro', '/negocios/mascotas', '', true)).toBe('marketing');
    expect(resolveAppHost('sevenpos.pro', '/pos', '', true)).toBe('marketing');
    expect(resolveAppHost('app.sevenpos.pro', '/negocios/mascotas', '', true)).toBe('customer');
    expect(resolveAppHost('platform.sevenpos.pro', '/pos', '', true)).toBe('platform');
    expect(resolveAppHost('app.sevenpos.pro', '/platform', '?__platform=1', true)).toBe('customer');
    expect(resolveAppHost('sevenpos.pro', '/platform', '?__platform=1', true)).toBe('marketing');
  });

  it('retains local aliases and existing shortcuts', () => {
    expect(resolveAppHost('localhost', '/', '', false)).toBe('customer');
    expect(resolveAppHost('app.localhost', '/', '', false)).toBe('customer');
    expect(resolveAppHost('marketing.localhost', '/', '', false)).toBe('marketing');
    expect(resolveAppHost('platform.localhost', '/', '', false)).toBe('platform');
    expect(resolveAppHost('localhost', '/', '?__marketing=1', false)).toBe('marketing');
  });

  it('recognizes public business routes but not POS routes', () => {
    expect(isPublicMarketingPath('/negocios/mascotas')).toBe(true);
    expect(isPublicMarketingPath('/legal/privacidad')).toBe(true);
    expect(isPublicMarketingPath('/pos')).toBe(false);
  });

  it('uses only approved auth redirect origins', () => {
    expect(authRedirectOrigin('sevenpos.pro', 'https://sevenpos.pro')).toBe('https://app.sevenpos.pro');
    expect(authRedirectOrigin('app.sevenpos.pro', 'https://app.sevenpos.pro')).toBe('https://app.sevenpos.pro');
    expect(authRedirectOrigin('localhost', 'http://localhost:5173')).toBe('http://localhost:5173');
    expect(authRedirectOrigin('evil.example', 'https://evil.example')).toBe('https://app.sevenpos.pro');
  });

  it('redirects only explicit legacy app routes, stripping sensitive query fields', () => {
    expect(legacyCustomerRedirect('sevenpos.pro', '/login', '?next=https://evil.example&code=secret&utm_source=email'))
      .toBe('https://app.sevenpos.pro/login?utm_source=email');
    expect(legacyCustomerRedirect('sevenpos.pro', '/reports', '')).toBe('https://app.sevenpos.pro/reports');
    expect(legacyCustomerRedirect('sevenpos.pro', '/negocios/retail', '')).toBeNull();
    expect(legacyCustomerRedirect('sevenpos.pro', '/auth/callback', '?code=secret')).toBeNull();
    expect(legacyCustomerRedirect('sevenpos.pro', '//evil.example/login', '')).toBeNull();
    expect(legacyCustomerRedirect('sevenpos.pro', '/login', '?access_token=secret&refresh_token=secret')).toBe('https://app.sevenpos.pro/login');
    expect(legacyCustomerRedirect('app.sevenpos.pro', '/login', '')).toBeNull();
    expect(canonicalWwwRedirect('www.sevenpos.pro', '/planes', '?next=https://evil.example&utm_campaign=launch'))
      .toBe('https://sevenpos.pro/planes?utm_campaign=launch');
  });

  it('never boots CustomerApp on root after cutover, even for a return or callback', () => {
    for (const path of ['/dashboard', '/pos', '/reports', '/subscription', '/login', '/register']) {
      expect(resolveHostEntry('sevenpos.pro', path, '', true)).toEqual({
        entry: 'redirect', destination: `https://app.sevenpos.pro${path}`,
      });
    }
    expect(resolveHostEntry('sevenpos.pro', '/subscription/return', '?status=approved', true).entry).toBe('legacy-billing-return');
    expect(resolveHostEntry('sevenpos.pro', '/auth/callback', '?code=one-time', true).entry).toBe('legacy-auth-callback');
    expect(resolveHostEntry('sevenpos.pro', '/auth/reset-password', '?code=one-time', true).entry).toBe('legacy-password-reset');
    expect(resolveHostEntry('www.sevenpos.pro', '/dashboard', '', true).entry).toBe('redirect');
    expect(resolveHostEntry('sevenpos.pro', '/', '', true).entry).toBe('marketing');
    expect(resolveHostEntry('app.sevenpos.pro', '/dashboard', '', true).entry).toBe('customer');
    expect(resolveHostEntry('platform.sevenpos.pro', '/dashboard', '', true).entry).toBe('platform');
  });

  it('allows a report tab but never forwards credentials in a generic redirect', () => {
    expect(legacyCustomerRedirect('sevenpos.pro', '/reports', '?tab=sales&access_token=x&refresh_token=y&code_verifier=z&PIN=1234&password=p&jwt=j&device_secret=d'))
      .toBe('https://app.sevenpos.pro/reports?tab=sales');
    expect(legacyCustomerRedirect('sevenpos.pro', '/reports', '?tab=unknown')).toBe('https://app.sevenpos.pro/reports');
    expect(getCustomerAppUrl('/subscription', 'sevenpos.pro', 'https://sevenpos.pro')).toBe('https://app.sevenpos.pro/subscription');
    expect(getCustomerAppUrl('/login', 'localhost', 'http://localhost:5173')).toBe('http://localhost:5173/login');
  });
});
