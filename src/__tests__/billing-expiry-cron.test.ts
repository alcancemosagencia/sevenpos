import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../../api/cron/billing-expiry';

const request = (authorization?: string) => new Request('https://platform.sevenpos.pro/api/cron/billing-expiry', {
  headers: authorization ? { authorization } : {},
});

describe('server cron authorization and sanitized Edge boundary', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'test-cron-secret');
    vi.stubEnv('SUPABASE_URL', 'https://byrjbrmsyusonhjovavp.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
    vi.stubGlobal('fetch', vi.fn());
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it.each([undefined, 'Bearer wrong', 'test-cron-secret', 'Bearer test-cron-secret extra'])('rejects %s before any upstream call', async (header) => {
    expect((await GET(request(header))).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('fails closed when the server cron secret is absent', async () => {
    vi.stubEnv('CRON_SECRET', '');
    expect((await GET(request('Bearer '))).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(['', 'https://different-project.supabase.co', 'http://byrjbrmsyusonhjovavp.supabase.co'])('never forwards server credentials to %s', async (url) => {
    vi.stubEnv('SUPABASE_URL', url);
    expect((await GET(request('Bearer test-cron-secret'))).status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('requires a separate server-side Supabase credential', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    expect((await GET(request('Bearer test-cron-secret'))).status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('returns only validated operational counts and preserves zero on retry', async () => {
    for (const count of [1, 0]) {
      vi.mocked(fetch).mockResolvedValueOnce(Response.json({ success: true, manualExpired: count, providerExpired: 0, expired: count, raw: 'must-not-escape' }));
      const response = await GET(request('Bearer test-cron-secret'));
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(await response.json()).toEqual({ success: true, manualExpired: count, providerExpired: 0, expired: count });
    }
    expect(fetch).toHaveBeenCalledWith('https://byrjbrmsyusonhjovavp.supabase.co/functions/v1/billing-expire-subscriptions', expect.objectContaining({ method: 'POST', redirect: 'error', headers: { Authorization: 'Bearer test-server-key', apikey: 'test-server-key' } }));
  });
  it.each([{}, { success: false }, { success: true, manualExpired: -1, providerExpired: 0, expired: -1 }, { success: true, manualExpired: 1, providerExpired: 0, expired: 2 }])('rejects an invalid upstream result', async (body) => {
    vi.mocked(fetch).mockResolvedValue(Response.json(body));
    const response = await GET(request('Bearer test-cron-secret'));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ success: false, error: 'EXPIRY_UPSTREAM_FAILED' });
  });
  it.each([401, 500])('does not expose upstream error %s', async (status) => {
    vi.mocked(fetch).mockResolvedValue(new Response('secret raw provider payload', { status }));
    expect(await (await GET(request('Bearer test-cron-secret'))).text()).not.toContain('secret raw');
  });
  it('sanitizes timeout/network exceptions', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('secret request header'));
    expect(await (await GET(request('Bearer test-cron-secret'))).json()).toEqual({ success: false, error: 'EXPIRY_UPSTREAM_FAILED' });
    expect(console.info).not.toHaveBeenCalled();
  });
});
