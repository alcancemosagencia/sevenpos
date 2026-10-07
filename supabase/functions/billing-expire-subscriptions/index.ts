import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function isAuthorizedScheduler(req: Request): boolean {
  const authHeader = req.headers.get('Authorization');
  const cronSecret = req.headers.get('x-cron-secret');
  const expectedSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret && expectedSecret && cronSecret === expectedSecret) return true;
  if (SUPABASE_SERVICE_ROLE_KEY && authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) return true;
  return false;
}

Deno.serve(async (req: Request) => {
  if (!isAuthorizedScheduler(req)) {
    return new Response(JSON.stringify({ error: 'UNAUTHORIZED_SCHEDULER' }), { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const now = new Date().toISOString();

  // One transaction handles fixed manual terms and their event evidence.
  const { data: manualExpired, error: manualError } = await supabase.rpc('platform_expire_manual_pro');
  if (manualError) {
    return new Response(JSON.stringify({ error: 'MANUAL_EXPIRY_FAILED' }), { status: 500 });
  }

  // 1. Expire subscriptions past their period end (cancel_at_period_end)
  const { data: toExpire } = await supabase
    .from('business_subscriptions')
    .select('id, business_id, status')
    .eq('status', 'ACTIVE')
    .eq('cancel_at_period_end', true)
    .not('billing_source', 'in', '(MANUAL,INTERNAL,PROMOTIONAL)')
    .lte('current_period_end', now);

  for (const sub of (toExpire ?? [])) {
    await supabase.from('business_subscriptions').update({
      status: 'EXPIRED',
      plan_code: 'FREE',
      cancel_at_period_end: false,
      updated_at: now,
    }).eq('id', sub.id);

    await supabase.from('subscription_events').insert({
      business_id: sub.business_id,
      subscription_id: sub.id,
      event_type: 'SUBSCRIPTION_EXPIRED',
      previous_status: sub.status,
      new_status: 'EXPIRED',
      metadata: { reason: 'PERIOD_END_CANCEL', was_cancellation: true },
    });
  }

  // 2. Expire PAST_DUE subscriptions beyond 7-day grace period
  const graceCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: pastDueExpired } = await supabase
    .from('business_subscriptions')
    .select('id, business_id, status')
    .eq('status', 'PAST_DUE')
    .not('billing_source', 'in', '(MANUAL,INTERNAL,PROMOTIONAL)')
    .lte('past_due_since', graceCutoff);

  for (const sub of (pastDueExpired ?? [])) {
    await supabase.from('business_subscriptions').update({
      status: 'EXPIRED',
      plan_code: 'FREE',
      past_due_since: null,
      updated_at: now,
    }).eq('id', sub.id);

    await supabase.from('subscription_events').insert({
      business_id: sub.business_id,
      subscription_id: sub.id,
      event_type: 'SUBSCRIPTION_EXPIRED',
      previous_status: 'PAST_DUE',
      new_status: 'EXPIRED',
      metadata: { reason: 'PAST_DUE_GRACE_EXCEEDED' },
    });
  }

  const result = {
    success: true,
    manualExpired: Number(manualExpired),
    providerExpired: (toExpire?.length ?? 0) + (pastDueExpired?.length ?? 0),
    expired: Number(manualExpired) + (toExpire?.length ?? 0) + (pastDueExpired?.length ?? 0),
  };
  console.info(JSON.stringify({ action: 'billing_expiry', ...result }));
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
});
