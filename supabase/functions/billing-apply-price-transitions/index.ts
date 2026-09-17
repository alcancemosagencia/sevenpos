import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')!;
const CLP_TAX_RATE = 0.19;

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
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = now.toISOString();

  // Find subscriptions whose promo ends within 7 days and transition not yet applied
  const { data: contracts } = await supabase
    .from('billing_contracts')
    .select('id, subscription_id, business_id, renewal_net_amount, promo_end_date')
    .not('promo_end_date', 'is', null)
    .lte('promo_end_date', sevenDaysFromNow);

  // Join with business_subscriptions to check transition state
  let applied = 0;
  let failed = 0;

  for (const contract of (contracts ?? [])) {
    const { data: sub } = await supabase
      .from('business_subscriptions')
      .select('id, mp_preapproval_id, price_transition_applied_at, business_id')
      .eq('id', contract.subscription_id)
      .eq('active_contract_id', contract.id)
      .is('price_transition_applied_at', null)
      .maybeSingle();

    if (!sub || !sub.mp_preapproval_id) continue;

    // Recalculate from contract
    const taxAmount = Math.round(contract.renewal_net_amount * CLP_TAX_RATE);
    const renewalGrossAmount = contract.renewal_net_amount + taxAmount;

    try {
      const putRes = await fetch(
        `https://api.mercadopago.com/preapproval/${encodeURIComponent(sub.mp_preapproval_id)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
          body: JSON.stringify({ auto_recurring: { transaction_amount: renewalGrossAmount } }),
        }
      );
      if (!putRes.ok) throw new Error(`PUT failed: ${putRes.status}`);

      // Re-fetch to confirm
      const confirmRes = await fetch(
        `https://api.mercadopago.com/preapproval/${encodeURIComponent(sub.mp_preapproval_id)}`,
        { headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` } }
      );
      const confirmed = await confirmRes.json();
      const confirmedAmount = confirmed?.auto_recurring?.transaction_amount;

      if (confirmedAmount !== renewalGrossAmount) {
        throw new Error(`Amount mismatch after PUT: expected ${renewalGrossAmount}, got ${confirmedAmount}`);
      }

      // Mark on business_subscriptions (NOT billing_contracts — immutable)
      await supabase.from('business_subscriptions').update({
        price_transition_applied_at: nowIso,
        price_transition_confirmed_amount: confirmedAmount,
        price_transition_due_at: contract.promo_end_date,
        updated_at: nowIso,
      }).eq('id', sub.id);

      await supabase.from('subscription_events').insert({
        business_id: contract.business_id,
        subscription_id: sub.id,
        event_type: 'PRICE_TRANSITION_APPLIED',
        metadata: {
          contract_id: contract.id,
          renewal_net: contract.renewal_net_amount,
          renewal_gross: renewalGrossAmount,
          confirmed_amount: confirmedAmount,
          mp_preapproval_id: sub.mp_preapproval_id,
        },
      });
      applied++;
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      await supabase.from('subscription_events').insert({
        business_id: contract.business_id,
        subscription_id: sub.id,
        event_type: 'PRICE_TRANSITION_FAILED',
        metadata: { error: msg, attempt_at: nowIso, contract_id: contract.id },
      });
      console.error(`[billing-apply-price-transitions] FAILED: ${msg}`);
    }
  }

  return new Response(JSON.stringify({ applied, failed }), { status: 200 });
});
