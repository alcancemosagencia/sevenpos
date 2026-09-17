import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')!;

function isAuthorizedScheduler(req: Request): boolean {
  const authHeader = req.headers.get('Authorization');
  const cronSecret = req.headers.get('x-cron-secret');
  const expectedSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret && expectedSecret && cronSecret === expectedSecret) return true;
  if (authHeader && authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) return true;
  return false;
}

Deno.serve(async (req: Request) => {
  if (!isAuthorizedScheduler(req)) {
    return new Response(JSON.stringify({ error: 'UNAUTHORIZED_SCHEDULER' }), { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const now = new Date().toISOString();

  const { data: candidates } = await supabase
    .from('business_subscriptions')
    .select('id, business_id, mp_preapproval_id, current_period_end, provider_cancel_due_at')
    .eq('cancel_at_period_end', true)
    .is('provider_cancel_applied_at', null)
    .lte('provider_cancel_due_at', now)
    .not('mp_preapproval_id', 'is', null);

  let applied = 0;
  let failed = 0;

  for (const sub of (candidates ?? [])) {
    try {
      // Re-fetch before mutation
      const fetchRes = await fetch(
        `https://api.mercadopago.com/preapproval/${encodeURIComponent(sub.mp_preapproval_id)}`,
        { headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` } }
      );
      const mpData = await fetchRes.json();

      if (mpData.status === 'cancelled') {
        // Already cancelled — mark applied
        await supabase.from('business_subscriptions').update({
          provider_cancel_applied_at: now, updated_at: now,
        }).eq('id', sub.id);
        await supabase.from('subscription_events').insert({
          business_id: sub.business_id, subscription_id: sub.id,
          event_type: 'CANCELLATION_APPLIED',
          metadata: { source: 'PROVIDER_ALREADY_CANCELLED', mp_preapproval_id: sub.mp_preapproval_id },
        });
        applied++;
        continue;
      }

      // PUT cancel
      const putRes = await fetch(
        `https://api.mercadopago.com/preapproval/${encodeURIComponent(sub.mp_preapproval_id)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
          body: JSON.stringify({ status: 'cancelled' }),
        }
      );
      if (!putRes.ok) throw new Error(`PUT failed: ${putRes.status}`);

      // Confirm
      const confirmRes = await fetch(
        `https://api.mercadopago.com/preapproval/${encodeURIComponent(sub.mp_preapproval_id)}`,
        { headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` } }
      );
      const confirmed = await confirmRes.json();
      if (confirmed.status !== 'cancelled') throw new Error('Cancel not confirmed after PUT');

      await supabase.from('business_subscriptions').update({
        provider_cancel_applied_at: now, updated_at: now,
      }).eq('id', sub.id);
      await supabase.from('subscription_events').insert({
        business_id: sub.business_id, subscription_id: sub.id,
        event_type: 'CANCELLATION_APPLIED',
        metadata: { mp_preapproval_id: sub.mp_preapproval_id, confirmed_at: now },
      });
      applied++;
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      await supabase.from('subscription_events').insert({
        business_id: sub.business_id, subscription_id: sub.id,
        event_type: 'CANCELLATION_FAILED',
        metadata: { error: msg, attempt_at: now, mp_preapproval_id: sub.mp_preapproval_id },
      });

      // Escalate if past the safety window + 24h
      const dueAt = new Date(sub.provider_cancel_due_at);
      if (Date.now() - dueAt.getTime() > 24 * 60 * 60 * 1000) {
        console.error(`[billing-apply-provider-cancellations] CRITICAL: cancellation unresolved beyond 24h window. business_id=${sub.business_id}`);
        // In production: trigger alerting channel here
      }
    }
  }

  return new Response(JSON.stringify({ applied, failed }), { status: 200 });
});
