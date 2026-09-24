import { describe, expect, it } from 'vitest';
import {
  allowedBillingOrigins,
  billingCorsHeaders,
  billingPreflightResponse,
  isAllowedBillingOrigin,
} from '../../supabase/functions/_shared/billingCors';

describe('billing CORS during host transition', () => {
  it('permits only the exact transition origins', () => {
    expect(allowedBillingOrigins).toEqual([
      'https://app.sevenpos.pro',
      'https://sevenpos.pro',
      'https://www.sevenpos.pro',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ]);
    expect(isAllowedBillingOrigin('https://evil.example')).toBe(false);
    expect(isAllowedBillingOrigin('https://app.sevenpos.pro.evil.example')).toBe(false);
  });

  it('never emits a wildcard or reflects an unapproved Origin', () => {
    expect(billingCorsHeaders('https://app.sevenpos.pro')['Access-Control-Allow-Origin']).toBe('https://app.sevenpos.pro');
    expect(billingCorsHeaders('https://evil.example')['Access-Control-Allow-Origin']).toBeUndefined();
    expect(billingCorsHeaders(null)['Access-Control-Allow-Origin']).toBeUndefined();
  });

  it('rejects unapproved preflight requests', () => {
    expect(billingPreflightResponse('https://app.sevenpos.pro', billingCorsHeaders('https://app.sevenpos.pro')).status).toBe(204);
    expect(billingPreflightResponse('https://evil.example', billingCorsHeaders('https://evil.example')).status).toBe(403);
  });

  it('allows the headers emitted by the current Supabase client', () => {
    const headers = billingCorsHeaders('https://app.sevenpos.pro')['Access-Control-Allow-Headers'];
    expect(headers).toContain('x-retry-count');
    expect(headers).toContain('traceparent');
    expect(headers).toContain('tracestate');
    expect(headers).toContain('baggage');
  });
});
