import { createHash, timingSafeEqual } from 'node:crypto';

const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const respond = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers });

/** Server-only Vercel Function. Never imported by the merchant application. */
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');
  if (!secret || !authorization || !timingSafeEqual(
    createHash('sha256').update(authorization).digest(),
    createHash('sha256').update(`Bearer ${secret}`).digest(),
  )) return respond(401, { success: false, error: 'UNAUTHORIZED_SCHEDULER' });

  const supabaseUrl = process.env.SUPABASE_URL;
  // This production maintenance route must never target an arbitrary upstream.
  if (supabaseUrl !== 'https://byrjbrmsyusonhjovavp.supabase.co') {
    return respond(503, { success: false, error: 'SCHEDULER_NOT_CONFIGURED' });
  }

  try {
    const upstream = await fetch(`${supabaseUrl}/functions/v1/billing-expire-subscriptions`, {
      method: 'POST',
      headers: { 'x-cron-secret': secret },
      signal: AbortSignal.timeout(25_000),
      redirect: 'error',
    });
    if (!upstream.ok) return respond(502, { success: false, error: 'EXPIRY_UPSTREAM_FAILED' });
    const result: unknown = await upstream.json();
    if (!result || typeof result !== 'object') throw new Error('INVALID_RESULT');
    const { success, manualExpired, providerExpired, expired } = result as Record<string, unknown>;
    const validCount = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
    if (success !== true || !validCount(manualExpired) || !validCount(providerExpired)
      || !validCount(expired) || expired !== manualExpired + providerExpired) throw new Error('INVALID_RESULT');
    console.info(JSON.stringify({ action: 'billing_expiry', success: true, manualExpired, providerExpired, expired }));
    return respond(200, { success: true, manualExpired, providerExpired, expired });
  } catch {
    // Do not return/log upstream bodies, headers, credentials or exception text.
    return respond(502, { success: false, error: 'EXPIRY_UPSTREAM_FAILED' });
  }
}
