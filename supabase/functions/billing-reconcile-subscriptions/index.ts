import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')!;
export const PRICING_VERSION = '2026.1_LAUNCH';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret, x-admin-action, x-preapproval-id',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const MP_STATUS_MAP: Record<string, string> = {
  pending: 'PENDING',
  authorized: 'ACTIVE',
  paused: 'PAST_DUE',
  cancelled: 'EXPIRED',
  expired: 'EXPIRED',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

async function reconcilePreapproval(
  supabase: ReturnType<typeof createClient>,
  preapprovalId: string
) {
  const mpHeaders: Record<string, string> = {
    Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
  };
  if (MP_ACCESS_TOKEN.startsWith('TEST-')) {
    mpHeaders['X-scope'] = 'stage';
  }

  const mpRes = await fetch(
    `https://api.mercadopago.com/preapproval/${encodeURIComponent(preapprovalId)}`,
    { headers: mpHeaders }
  );

  if (!mpRes.ok) {
    const errText = await mpRes.text();
    return { success: false, error: `MP API error ${mpRes.status}: ${errText}` };
  }

  const mpData = await mpRes.json();
  const mpStatus: string = mpData.status ?? 'pending';
  const sevenposStatus: string = MP_STATUS_MAP[mpStatus] ?? 'PENDING';
  const externalRef: string = mpData.external_reference ?? '';
  const payerEmail: string = mpData.payer_email ?? mpData.payer?.email ?? '';
  const transactionAmount: number = mpData.auto_recurring?.transaction_amount ?? 0;
  const nextPaymentDate: string | null = mpData.next_payment_date ?? null;
  const dateCreated: string = mpData.date_created ?? new Date().toISOString();
  const now = new Date().toISOString();

  // Find billing intent by ID (external_reference) or mp_preapproval_id
  let intentQuery = supabase
    .from('billing_intents')
    .select('id, business_id, plan_id, promotion_id, base_net_amount, discount_net_amount, final_net_amount, tax_amount, final_gross_amount');

  if (externalRef) {
    intentQuery = intentQuery.eq('id', externalRef);
  } else {
    intentQuery = intentQuery.eq('mp_preapproval_id', preapprovalId);
  }

  const { data: intent, error: intentErr } = await intentQuery.maybeSingle();

  if (intentErr || !intent) {
    return {
      success: false,
      error: `Billing intent not found for preapproval ${preapprovalId} (ref: ${externalRef})`,
      mpData: {
        id: mpData.id,
        status: mpStatus,
        payer_email: payerEmail,
        auto_recurring: mpData.auto_recurring,
        date_created: dateCreated,
        last_modified: mpData.last_modified,
        next_payment_date: nextPaymentDate,
        external_reference: externalRef,
      },
    };
  }

  const businessId = intent.business_id;

  // Resolve promotion details if any
  let promoCode: string | null = null;
  let promoType: string | null = null;
  let promoDurationType: string | null = null;
  let promoDurationMonths: number | null = null;
  let promoEndDate: string | null = null;

  if (intent.promotion_id) {
    const { data: promo } = await supabase
      .from('billing_promotions')
      .select('code, discount_type, duration_type, duration_months')
      .eq('id', intent.promotion_id)
      .maybeSingle();

    if (promo) {
      promoCode = promo.code;
      promoType = promo.discount_type;
      promoDurationType = promo.duration_type;
      promoDurationMonths = promo.duration_months;

      if (promo.duration_months) {
        const end = new Date();
        end.setMonth(end.getMonth() + promo.duration_months);
        promoEndDate = end.toISOString();
      }
    }
  }

  const billingInterval = intent.plan_id === 'pro_annual' ? 'ANNUAL' : 'MONTHLY';
  const planCode = sevenposStatus === 'ACTIVE' || sevenposStatus === 'PAST_DUE' ? 'PRO' : 'FREE';

  // Check if business_subscriptions row exists
  const { data: existingSub } = await supabase
    .from('business_subscriptions')
    .select('id, status, plan_code, active_contract_id')
    .eq('business_id', businessId)
    .maybeSingle();

  let subscriptionId: string;

  if (existingSub) {
    subscriptionId = existingSub.id;
    await supabase
      .from('business_subscriptions')
      .update({
        plan_code: planCode,
        billing_interval: billingInterval,
        status: sevenposStatus,
        mp_preapproval_id: String(mpData.id),
        mp_payer_id: mpData.payer_id ? String(mpData.payer_id) : (mpData.payer?.id ? String(mpData.payer.id) : null),
        current_period_start: dateCreated,
        current_period_end: nextPaymentDate,
        past_due_since: sevenposStatus === 'PAST_DUE' ? now : null,
        updated_at: now,
      })
      .eq('id', existingSub.id);
  } else {
    const { data: newSub, error: createSubErr } = await supabase
      .from('business_subscriptions')
      .insert({
        business_id: businessId,
        plan_code: planCode,
        billing_interval: billingInterval,
        status: sevenposStatus,
        mp_preapproval_id: String(mpData.id),
        mp_payer_id: mpData.payer_id ? String(mpData.payer_id) : (mpData.payer?.id ? String(mpData.payer.id) : null),
        current_period_start: dateCreated,
        current_period_end: nextPaymentDate,
      })
      .select('id')
      .single();

    if (createSubErr || !newSub) {
      return { success: false, error: `Failed to create business_subscription: ${createSubErr?.message}` };
    }
    subscriptionId = newSub.id;
  }

  // Create or verify billing_contracts (Append-Only)
  const { data: existingContract } = await supabase
    .from('billing_contracts')
    .select('id')
    .eq('subscription_id', subscriptionId)
    .maybeSingle();

  let contractId = existingContract?.id;

  if (!contractId) {
    const baseNet = intent.base_net_amount;
    const renewalTax = Math.round(baseNet * 0.19);
    const renewalGross = baseNet + renewalTax;

    const { data: newContract, error: contractErr } = await supabase
      .from('billing_contracts')
      .insert({
        business_id: businessId,
        subscription_id: subscriptionId,
        pricing_version: PRICING_VERSION,
        billing_interval: billingInterval,
        base_net_amount: intent.base_net_amount,
        discount_net_amount: intent.discount_net_amount,
        final_net_amount: intent.final_net_amount,
        tax_rate: 0.19,
        tax_amount: intent.tax_amount,
        final_gross_amount: intent.final_gross_amount,
        currency: 'CLP',
        promotion_code: promoCode,
        promotion_type: promoType,
        promotion_duration_type: promoDurationType,
        promotion_duration_months: promoDurationMonths,
        renewal_net_amount: baseNet,
        renewal_gross_amount: renewalGross,
        promo_end_date: promoEndDate,
        starts_at: dateCreated,
      })
      .select('id')
      .single();

    if (contractErr) {
      console.error('[reconcile] Contract insertion error:', contractErr);
    } else if (newContract) {
      contractId = newContract.id;
      // Link active contract to business_subscriptions
      await supabase
        .from('business_subscriptions')
        .update({ active_contract_id: contractId })
        .eq('id', subscriptionId);
    }
  }

  // Insert subscription_event
  await supabase.from('subscription_events').insert({
    business_id: businessId,
    subscription_id: subscriptionId,
    event_type: sevenposStatus === 'ACTIVE' ? 'SUBSCRIPTION_ACTIVATED' : 'SUBSCRIPTION_RECONCILED',
    previous_status: existingSub?.status ?? null,
    new_status: sevenposStatus,
    metadata: {
      mp_preapproval_id: String(mpData.id),
      mp_status: mpStatus,
      transaction_amount: transactionAmount,
      contract_id: contractId,
      source: 'RECONCILIATION',
    },
  });

  // Record initial payment in subscription_payments if active
  if (sevenposStatus === 'ACTIVE' && transactionAmount > 0) {
    const { data: existingPayment } = await supabase
      .from('subscription_payments')
      .select('id')
      .eq('subscription_id', subscriptionId)
      .eq('provider_payment_id', `preapproval_${preapprovalId}_initial`)
      .maybeSingle();

    if (!existingPayment) {
      await supabase.from('subscription_payments').insert({
        business_id: businessId,
        subscription_id: subscriptionId,
        contract_id: contractId,
        provider: 'MERCADOPAGO',
        provider_payment_id: `preapproval_${preapprovalId}_initial`,
        status: 'APPROVED',
        currency: 'CLP',
        gross_amount: transactionAmount,
        period_start: dateCreated,
        period_end: nextPaymentDate || dateCreated,
        paid_at: dateCreated,
      });
    }
  }

  return {
    success: true,
    businessId,
    subscriptionId,
    contractId,
    planCode,
    status: sevenposStatus,
    mpData: {
      id: mpData.id,
      status: mpStatus,
      payer_email: payerEmail,
      auto_recurring: mpData.auto_recurring,
      date_created: dateCreated,
      last_modified: mpData.last_modified,
      next_payment_date: nextPaymentDate,
      external_reference: externalRef,
    },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const body = await req.json().catch(() => ({}));

  // Diagnostic / targeted reconciliation by preapproval_id
  const targetPreapprovalId = body.preapproval_id || req.headers.get('x-preapproval-id');
  if (targetPreapprovalId) {
    const result = await reconcilePreapproval(supabase, targetPreapprovalId);
    return jsonResponse(result, result.success ? 200 : 400);
  }

  // Scan all subscriptions and processed billing intents
  let checked = 0;
  let divergent = 0;
  let corrected = 0;

  // 1. Check existing business_subscriptions
  const { data: subs } = await supabase
    .from('business_subscriptions')
    .select('id, business_id, status, plan_code, mp_preapproval_id')
    .not('mp_preapproval_id', 'is', null);

  for (const sub of subs ?? []) {
    checked++;
    const res = await reconcilePreapproval(supabase, sub.mp_preapproval_id);
    if (res.success && (res.status !== sub.status || res.planCode !== sub.plan_code)) {
      divergent++;
      corrected++;
    }
  }

  // 2. Check processed billing_intents that might not be in business_subscriptions yet
  const { data: intents } = await supabase
    .from('billing_intents')
    .select('mp_preapproval_id')
    .eq('status', 'PROCESSED')
    .not('mp_preapproval_id', 'is', null);

  for (const item of intents ?? []) {
    if (!item.mp_preapproval_id) continue;
    checked++;
    const res = await reconcilePreapproval(supabase, item.mp_preapproval_id);
    if (res.success) {
      corrected++;
    }
  }

  return jsonResponse({ checked, divergent, corrected }, 200);
});
