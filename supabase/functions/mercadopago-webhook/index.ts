import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')!;
const MP_WEBHOOK_SECRET = Deno.env.get('MP_WEBHOOK_SECRET')!;

// SEVENPOS SECURITY POLICY — not a Mercado Pago requirement
const MAX_TIMESTAMP_AGE_MS = 10 * 60 * 1000; // 10 minutes

async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const MP_STATUS_MAP: Record<string, string> = {
  pending: 'PENDING',
  authorized: 'ACTIVE',
  paused: 'PAST_DUE',
  cancelled: 'EXPIRED',
  expired: 'EXPIRED',
};

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const xSignature = req.headers.get('x-signature') ?? '';
  const xRequestId = req.headers.get('x-request-id') ?? '';

  const rawBody = await req.text();
  let body: Record<string, unknown>;
  try { body = JSON.parse(rawBody); } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const bodyData = body?.data as Record<string, unknown> | undefined;
  const dataId: string = bodyData?.id ? String(bodyData.id) : '';
  const notificationId: string | null = body?.id ? String(body.id) : null;
  const eventType: string | null = body?.type ? String(body.type) : null;

  // --- Signature validation (OFFICIAL MP algorithm) ---
  const parts = Object.fromEntries(
    xSignature.split(',').map((p: string) => {
      const idx = p.indexOf('=');
      return [p.slice(0, idx).trim(), p.slice(idx + 1).trim()];
    })
  );
  const ts = parts['ts'];
  const v1 = parts['v1'];

  if (!ts || !v1) {
    await supabase.from('subscription_webhook_events').insert({
      notification_id: notificationId,
      event_type: eventType,
      resource_id: dataId || null,
      x_request_id: xRequestId,
      processing_error: 'MISSING_SIGNATURE_PARTS',
    });
    return new Response('Invalid signature', { status: 400 });
  }

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const computed = await hmacHex(MP_WEBHOOK_SECRET, manifest);

  if (!timingSafeEqual(computed, v1)) {
    await supabase.from('subscription_webhook_events').insert({
      notification_id: notificationId,
      event_type: eventType,
      resource_id: dataId || null,
      x_request_id: xRequestId,
      processing_error: 'INVALID_SIGNATURE',
    });
    return new Response('Invalid signature', { status: 400 });
  }

  // SEVENPOS SECURITY POLICY: timestamp age check
  const tsMs = parseInt(ts, 10) * 1000;
  if (Date.now() - tsMs > MAX_TIMESTAMP_AGE_MS) {
    // Log but still process (timestamp policy is SevenPOS internal — not MP requirement)
    console.warn('[webhook] Timestamp older than 10 minutes — SEVENPOS SECURITY POLICY flag');
  }

  // --- Missing body.id handling (§23 contract) ---
  if (!notificationId) {
    await supabase.from('subscription_webhook_events').insert({
      notification_id: null,
      event_type: eventType,
      resource_id: dataId || null,
      x_request_id: xRequestId,
      processing_error: 'MISSING_NOTIFICATION_ID',
      processed: false,
    });
    // ACK 200 — stops MP retry loop. Reconciliation handles divergence.
    return new Response('OK', { status: 200 });
  }

  // --- Idempotency check ---
  const { error: insertErr } = await supabase
    .from('subscription_webhook_events')
    .insert({
      gateway: 'MERCADOPAGO',
      notification_id: notificationId,
      event_type: eventType,
      event_action: body?.action ?? null,
      resource_id: dataId || null,
      x_request_id: xRequestId,
    });

  if (insertErr) {
    // Unique constraint violation = duplicate webhook
    if (insertErr.code === '23505') {
      return new Response('OK', { status: 200 }); // ACK, no mutation
    }
    return new Response('DB error', { status: 500 });
  }

  // Only handle supported V1 topics
  const SUPPORTED_TOPICS = ['payment', 'subscription_preapproval', 'subscription_authorized_payment'];
  if (!eventType || !SUPPORTED_TOPICS.includes(eventType)) {
    await supabase.from('subscription_webhook_events')
      .update({ processed: true, processing_error: 'UNSUPPORTED_TOPIC', processed_at: new Date().toISOString() })
      .eq('gateway', 'MERCADOPAGO')
      .eq('notification_id', notificationId)
      .eq('event_type', eventType ?? '');
    return new Response('OK', { status: 200 });
  }

  try {
    // Provider re-fetch before mutation (webhook body is NOT source of truth)
    if (eventType === 'subscription_preapproval' && dataId) {
      const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(dataId)}`, {
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
      });
      if (!mpRes.ok) throw new Error(`MP re-fetch failed: ${mpRes.status}`);
      const mpData = await mpRes.json();

      const mpStatus: string = mpData.status ?? 'pending';
      const sevenposStatus: string = MP_STATUS_MAP[mpStatus] ?? 'PENDING';
      const externalReference: string = mpData.external_reference ?? '';

      // Resolve business from billing_intent external_reference
      const { data: intent } = await supabase
        .from('billing_intents')
        .select('id, business_id, plan_id, promotion_id, base_net_amount, discount_net_amount, final_net_amount, tax_amount, final_gross_amount')
        .eq('id', externalReference)
        .maybeSingle();

      if (!intent) {
        throw new Error(`billing_intent not found: ${externalReference}`);
      }

      const { data: existingSub } = await supabase
        .from('business_subscriptions')
        .select('id, status, plan_code, active_contract_id')
        .eq('business_id', intent.business_id)
        .maybeSingle();

      const now = new Date().toISOString();
      const periodStart = mpData.date_created ?? now;
      const periodEnd = mpData.next_payment_date ?? null;
      const billingInterval = intent.plan_id === 'pro_annual' ? 'ANNUAL' : 'MONTHLY';
      const planCode = sevenposStatus === 'ACTIVE' || sevenposStatus === 'PAST_DUE' ? 'PRO' : 'FREE';

      let subscriptionId: string;

      if (existingSub) {
        subscriptionId = existingSub.id;
        await supabase.from('business_subscriptions')
          .update({
            plan_code: planCode,
            billing_interval: billingInterval,
            status: sevenposStatus,
            mp_preapproval_id: String(mpData.id),
            mp_payer_id: mpData.payer?.id ? String(mpData.payer.id) : null,
            current_period_start: periodStart,
            current_period_end: periodEnd,
            past_due_since: sevenposStatus === 'PAST_DUE' ? now : null,
            updated_at: now,
          })
          .eq('id', existingSub.id);

        await supabase.from('subscription_events').insert({
          business_id: intent.business_id,
          subscription_id: existingSub.id,
          event_type: sevenposStatus === 'ACTIVE' ? 'SUBSCRIPTION_ACTIVATED' : 'PAYMENT_FAILED',
          previous_status: existingSub.status,
          new_status: sevenposStatus,
          metadata: { mp_preapproval_id: String(mpData.id), mp_status: mpStatus, source: 'WEBHOOK' },
        });
      } else {
        const { data: newSub } = await supabase.from('business_subscriptions')
          .insert({
            business_id: intent.business_id,
            plan_code: planCode,
            billing_interval: billingInterval,
            status: sevenposStatus,
            mp_preapproval_id: String(mpData.id),
            mp_payer_id: mpData.payer?.id ? String(mpData.payer.id) : null,
            current_period_start: periodStart,
            current_period_end: periodEnd,
          })
          .select('id')
          .single();

        if (newSub) {
          subscriptionId = newSub.id;
          await supabase.from('subscription_events').insert({
            business_id: intent.business_id,
            subscription_id: newSub.id,
            event_type: 'SUBSCRIPTION_CREATED',
            new_status: sevenposStatus,
            metadata: { mp_preapproval_id: String(mpData.id), source: 'WEBHOOK' },
          });
        } else {
          throw new Error('Failed to create subscription');
        }
      }

      // Ensure billing_contracts row exists (Append-Only)
      const { data: existingContract } = await supabase
        .from('billing_contracts')
        .select('id')
        .eq('subscription_id', subscriptionId)
        .maybeSingle();

      let contractId = existingContract?.id;
      if (!contractId) {
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

        const baseNet = intent.base_net_amount;
        const renewalTax = Math.round(baseNet * 0.19);
        const renewalGross = baseNet + renewalTax;

        const { data: newContract } = await supabase
          .from('billing_contracts')
          .insert({
            business_id: intent.business_id,
            subscription_id: subscriptionId,
            pricing_version: '2026.1_LAUNCH',
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
            starts_at: periodStart,
          })
          .select('id')
          .maybeSingle();

        if (newContract) {
          contractId = newContract.id;
          await supabase
            .from('business_subscriptions')
            .update({ active_contract_id: contractId })
            .eq('id', subscriptionId);
        }
      }
    }

    await supabase.from('subscription_webhook_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('gateway', 'MERCADOPAGO')
      .eq('notification_id', notificationId)
      .eq('event_type', eventType);

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await supabase.from('subscription_webhook_events')
      .update({ processing_error: msg, processed: false })
      .eq('gateway', 'MERCADOPAGO')
      .eq('notification_id', notificationId)
      .eq('event_type', eventType ?? '');
    console.error('[webhook] processing error:', msg);
  }

  return new Response('OK', { status: 200 });
});
