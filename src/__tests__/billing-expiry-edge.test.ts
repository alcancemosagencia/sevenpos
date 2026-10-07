import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { transpileModule } from 'typescript';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync(new URL('../../supabase/functions/billing-expire-subscriptions/index.ts', import.meta.url), 'utf8');
function fixture(manualExpired = 1, manualError: object | null = null, serviceKey = 'server-key') {
  let handler!: (request: Request) => Promise<Response>;
  const filters: unknown[][] = [];
  const subscriptions = [
    { id: 'provider-cancel', business_id: 'provider-business', status: 'ACTIVE' },
    { id: 'provider-grace', business_id: 'grace-business', status: 'PAST_DUE' },
  ];
  let queryIndex = 0;
  const writes: unknown[] = [];
  const rpc = vi.fn().mockResolvedValue({ data: manualExpired, error: manualError });
  const createClient = vi.fn(() => ({
    rpc,
    from: (table: string) => ({
      select: () => {
        const chain = {
          eq: (...args: unknown[]) => { filters.push(args); return chain; },
          not: (...args: unknown[]) => { filters.push(args); return chain; },
          lte: async () => ({ data: [subscriptions[queryIndex++]] }),
        };
        return chain;
      },
      update: (row: unknown) => ({ eq: async () => { writes.push({ table, row }); return { error: null }; } }),
      insert: async (row: unknown) => { writes.push({ table, row }); return { error: null }; },
    }),
  }));
  const env: Record<string, string> = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: serviceKey, CRON_SECRET: 'edge-cron-secret' };
  runInNewContext(transpileModule(source.replace(/^import .*;\r?\n/, ''), {}).outputText, {
    createClient, Request, Response, Date, console: { info: vi.fn() },
    Deno: { env: { get: (key: string) => env[key] }, serve: (fn: typeof handler) => { handler = fn; } },
  });
  return { handler, createClient, rpc, filters, writes };
}
describe('deployed Edge maintenance contract', () => {
  it.each([undefined, 'Bearer invalid', 'Bearer undefined'])('rejects %s without any database call', async (authorization) => {
    const f = fixture();
    expect((await f.handler(new Request('https://example.com', { headers: authorization ? { authorization } : {} }))).status).toBe(401);
    expect(f.createClient).not.toHaveBeenCalled();
  });
  it('does not authorize an empty service key', async () => {
    const f = fixture(1, null, '');
    expect((await f.handler(new Request('https://example.com', { headers: { authorization: 'Bearer ' } }))).status).toBe(401);
  });
  it('runs the canonical manual expiry and keeps provider cancellation/grace paths separate', async () => {
    const f = fixture();
    const response = await f.handler(new Request('https://example.com', { headers: { authorization: 'Bearer server-key' } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, manualExpired: 1, providerExpired: 2, expired: 3 });
    expect(f.rpc).toHaveBeenCalledExactlyOnceWith('platform_expire_manual_pro');
    expect(f.filters.filter(row => row[0] === 'billing_source')).toEqual([
      ['billing_source', 'in', '(MANUAL,INTERNAL,PROMOTIONAL)'],
      ['billing_source', 'in', '(MANUAL,INTERNAL,PROMOTIONAL)'],
    ]);
    expect(f.writes).toHaveLength(4);
    expect(JSON.stringify(f.writes)).toContain('PERIOD_END_CANCEL');
    expect(JSON.stringify(f.writes)).toContain('PAST_DUE_GRACE_EXCEEDED');
  });
  it('preserves the existing cron-secret authorization convention', async () => {
    const f = fixture(0);
    const response = await f.handler(new Request('https://example.com', { headers: { 'x-cron-secret': 'edge-cron-secret' } }));
    expect(response.status).toBe(200);
    expect((await response.json()).manualExpired).toBe(0);
  });
  it('stops before provider mutation when the canonical RPC fails without exposing its error', async () => {
    const f = fixture(0, { message: 'raw sensitive SQL' });
    const response = await f.handler(new Request('https://example.com', { headers: { authorization: 'Bearer server-key' } }));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'MANUAL_EXPIRY_FAILED' });
    expect(f.writes).toHaveLength(0);
  });
});
