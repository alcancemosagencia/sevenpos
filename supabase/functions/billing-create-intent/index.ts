import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')!;
const APP_URL = Deno.env.get('APP_URL') ?? 'https://sevenpos.pro';
// PRICING_VERSION is embedded in billing_contracts rows inserted by this function
export const PRICING_VERSION = '2026.1_LAUNCH';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
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

interface PromoRow {
  id: string;
  code: string;
  status: string;
  discount_type: 'PERCENT' | 'FIXED_NET_PRICE' | 'FREE';
  discount_percent_bp: number | null;
  fixed_monthly_net_amount: number | null;
  fixed_annual_net_amount: number | null;
  applicable_billing_intervals: 'MONTHLY' | 'ANNUAL' | 'BOTH';
  max_redemptions: number | null;
  redemptions_count: number;
  valid_from: string | null;
  valid_until: string | null;
  duration_type: 'FOREVER' | 'N_MONTHS' | null;
  duration_months: number | null;
}

const CLP_TAX_RATE = 0.19;

function calcTax(net: number): { taxAmount: number; grossAmount: number } {
  const taxAmount = Math.round(net * CLP_TAX_RATE);
  return { taxAmount, grossAmount: net + taxAmount };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Authenticate caller
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ error: 'UNAUTHORIZED' }, 401);

  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return jsonResponse({ error: 'UNAUTHORIZED' }, 401);
  console.log('[STAGE A] AUTH_OK user:', user.id);

  // Parse request — browser sends ONLY plan + optional coupon; NO amount
  const body = await req.json().catch(() => ({}));
  const planId: string = body.planId;
  const billingInterval: 'MONTHLY' | 'ANNUAL' = body.billingInterval;
  const rawCouponCode: string | undefined = body.couponCode;

  if (!planId || !billingInterval) {
    return jsonResponse({ error: 'MISSING_PARAMS' }, 400);
  }

  // Verify OWNER membership
  const { data: membership } = await supabase
    .from('business_memberships')
    .select('business_id')
    .eq('user_id', user.id)
    .eq('role', 'OWNER')
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (!membership) {
    return jsonResponse({ error: 'NOT_OWNER' }, 403);
  }
  const businessId = membership.business_id;
  console.log('[STAGE B] OWNER_MEMBERSHIP_OK business:', businessId);

  // SERVER-SIDE GUARD: Prevent active Pro subscribers from creating duplicate intents/subscriptions
  const { data: existingSub } = await supabase
    .from('business_subscriptions')
    .select('id, plan_code, status, current_period_end')
    .eq('business_id', businessId)
    .maybeSingle();

  if (existingSub && existingSub.plan_code === 'PRO' && existingSub.status === 'ACTIVE') {
    const isExpired = existingSub.current_period_end && new Date(existingSub.current_period_end).getTime() < Date.now();
    if (!isExpired) {
      console.log('[STAGE B.1] ALREADY_PRO guard triggered for business:', businessId);
      return jsonResponse({
        error: 'ALREADY_PRO',
        message: 'Tu negocio ya tiene SevenPOS Pro activo.',
      }, 409);
    }
  }

  // Load plan server-side (authoritative)
  const { data: plan, error: planErr } = await supabase
    .from('billing_plans')
    .select('*')
    .eq('id', planId)
    .eq('is_active', true)
    .maybeSingle();

  if (planErr || !plan) {
    return jsonResponse({ error: 'PLAN_NOT_FOUND' }, 404);
  }
  console.log('[STAGE C] PLAN_LOADED plan:', planId);

  const baseNet: number = plan.base_net_amount;
  let finalNet = baseNet;
  let discountNet = 0;
  let appliedCode: string | null = null;
  let appliedPromotionId: string | null = null;

  // Normalize coupon code
  const couponCode = rawCouponCode?.trim().toUpperCase() ?? null;

  // Resolve promotion server-side
  const { data: publicPromo } = await supabase
    .from('billing_promotions')
    .select('*')
    .eq('promotion_scope', 'PUBLIC')
    .eq('status', 'ACTIVE')
    .maybeSingle();

  let explicitPromo: PromoRow | null = null;
  if (couponCode) {
    const { data } = await supabase
      .from('billing_promotions')
      .select('*')
      .eq('code', couponCode)
      .maybeSingle();
    explicitPromo = data;
  }

  function applyPromo(promo: PromoRow): { finalNet: number; discountNet: number } {
    if (promo.discount_type === 'PERCENT') {
      const bp = promo.discount_percent_bp ?? 0;
      const net = Math.round(baseNet * (10000 - bp) / 10000);
      return { finalNet: net, discountNet: baseNet - net };
    }
    if (promo.discount_type === 'FIXED_NET_PRICE') {
      const net = billingInterval === 'MONTHLY'
        ? (promo.fixed_monthly_net_amount ?? baseNet)
        : (promo.fixed_annual_net_amount ?? baseNet);
      return { finalNet: net, discountNet: Math.max(0, baseNet - net) };
    }
    if (promo.discount_type === 'FREE') {
      return { finalNet: 0, discountNet: baseNet };
    }
    return { finalNet: baseNet, discountNet: 0 };
  }

  function intervalSupported(promo: PromoRow): boolean {
    return promo.applicable_billing_intervals === 'BOTH' ||
      promo.applicable_billing_intervals === billingInterval;
  }

  function isPromoValid(promo: PromoRow): boolean {
    if (promo.status !== 'ACTIVE') return false;
    if (!intervalSupported(promo)) return false;
    if (promo.max_redemptions !== null && promo.redemptions_count >= promo.max_redemptions) return false;
    const now = Date.now();
    if (promo.valid_from && new Date(promo.valid_from).getTime() > now) return false;
    if (promo.valid_until && new Date(promo.valid_until).getTime() < now) return false;
    return true;
  }

  const publicValid = publicPromo ? isPromoValid(publicPromo) : false;
  const explicitValid = explicitPromo ? isPromoValid(explicitPromo) : false;

  if (publicValid && explicitValid) {
    const pubResult = applyPromo(publicPromo!);
    const expResult = applyPromo(explicitPromo!);
    const { grossAmount: pubGross } = calcTax(pubResult.finalNet);
    const { grossAmount: expGross } = calcTax(expResult.finalNet);
    const winner = pubGross <= expGross ? { promo: publicPromo!, result: pubResult } : { promo: explicitPromo!, result: expResult };
    finalNet = winner.result.finalNet;
    discountNet = winner.result.discountNet;
    appliedCode = winner.promo.code;
    appliedPromotionId = winner.promo.id;
  } else if (publicValid) {
    const result = applyPromo(publicPromo!);
    finalNet = result.finalNet;
    discountNet = result.discountNet;
    appliedCode = publicPromo!.code;
    appliedPromotionId = publicPromo!.id;
  } else if (explicitValid) {
    const result = applyPromo(explicitPromo!);
    finalNet = result.finalNet;
    discountNet = result.discountNet;
    appliedCode = explicitPromo!.code;
    appliedPromotionId = explicitPromo!.id;
  }

  const { taxAmount, grossAmount } = calcTax(finalNet);
  console.log('[STAGE D] PROMOTION_RESOLVED promo:', appliedCode, 'gross:', grossAmount);

  // Persist billing intent
  const { data: intent, error: intentErr } = await supabase
    .from('billing_intents')
    .insert({
      business_id: businessId,
      plan_id: planId,
      promotion_id: appliedPromotionId,
      base_net_amount: baseNet,
      discount_net_amount: discountNet,
      final_net_amount: finalNet,
      tax_amount: taxAmount,
      final_gross_amount: grossAmount,
    })
    .select('id')
    .single();

  if (intentErr || !intent) {
    console.error('[billing-create-intent] Intent insertion failed:', intentErr);
    return jsonResponse({ error: 'INTENT_CREATE_FAILED' }, 500);
  }
  console.log('[STAGE E] INTENT_INSERTED intent:', intent.id);

  // Create Mercado Pago preapproval (individualized, no shared plan)
  const testPayerEmail = Deno.env.get('MP_TEST_PAYER_EMAIL');
  const payerSource = testPayerEmail ? 'MP_TEST_PAYER_EMAIL' : 'OWNER_EMAIL';
  const isTest = MP_ACCESS_TOKEN.startsWith('TEST-') || !!testPayerEmail;
  const tokenMode = isTest ? 'TEST' : 'PRODUCTION';
  const effectivePayerEmail = testPayerEmail || user.email;

  const rawBackUrl = body.backUrl;
  let backUrl = `${APP_URL}/subscription/return`;
  if (rawBackUrl && typeof rawBackUrl === 'string') {
    try {
      const parsedUrl = new URL(rawBackUrl);
      const allowedOrigins = ['https://sevenpos.pro', 'https://www.sevenpos.pro', 'http://localhost:5173', 'http://127.0.0.1:5173'];
      if (allowedOrigins.includes(parsedUrl.origin) && parsedUrl.pathname.startsWith('/subscription/return')) {
        backUrl = rawBackUrl;
      }
    } catch {
      // Fallback to APP_URL
    }
  }

  const mpPayload = {
    auto_recurring: {
      frequency,
      frequency_type: 'months',
      transaction_amount: grossAmount,
      currency_id: 'CLP',
    },
    reason: `SevenPOS Pro – ${billingInterval === 'MONTHLY' ? 'Mensual' : 'Anual'}`,
    external_reference: intent.id,
    payer_email: effectivePayerEmail,
    back_url: backUrl,
    status: 'pending',
  };

  const mpHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
  };
  if (MP_ACCESS_TOKEN.startsWith('TEST-')) {
    mpHeaders['X-scope'] = 'stage';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second timeout
  let mpRes: Response;
  try {
    console.log('[STAGE F] MP_REQUEST_STARTED tokenMode:', tokenMode, 'payerSource:', payerSource);
    mpRes = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: mpHeaders,
      body: JSON.stringify(mpPayload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (fetchErr: unknown) {
    clearTimeout(timeoutId);
    const isAbort = fetchErr instanceof Error && (fetchErr.name === 'AbortError' || fetchErr.message?.includes('aborted'));
    console.error('[billing-create-intent] MP fetch error:', isAbort ? 'TIMEOUT' : fetchErr);
    await supabase.from('billing_intents').update({ status: 'FAILED' }).eq('id', intent.id);
    if (isAbort) {
      return jsonResponse({
        error: 'PROVIDER_TIMEOUT',
        provider_http_status: 504,
        provider_error_code: 'TIMEOUT',
        provider_safe_message: 'Mercado Pago request timed out after 12s',
      }, 504);
    }
    return jsonResponse({
      error: 'PROVIDER_ERROR',
      provider_http_status: 502,
      provider_error_code: 'FETCH_FAILED',
      provider_safe_message: 'Could not connect to provider',
    }, 502);
  }

  console.log('[STAGE G] MP_RESPONSE_RECEIVED status:', mpRes.status);

  if (!mpRes.ok) {
    const mpBody = await mpRes.text();
    let safeError = mpBody;
    let errorCode = 'PROVIDER_REJECTED';
    try {
      const parsed = JSON.parse(mpBody);
      safeError = parsed.message || parsed.error || mpBody;
      errorCode = parsed.error || String(parsed.status) || 'PROVIDER_REJECTED';
    } catch {
      // safe fallback
    }
    console.error('[billing-create-intent] MP preapproval failed:', mpRes.status, errorCode, safeError);
    await supabase.from('billing_intents').update({ status: 'FAILED' }).eq('id', intent.id);
    return jsonResponse({
      error: 'PROVIDER_ERROR',
      provider_http_status: mpRes.status,
      provider_error_code: errorCode,
      provider_safe_message: safeError,
    }, 502);
  }

  const mpData = await mpRes.json().catch(() => ({}));
  const mpPreapprovalId: string = String(mpData.id || '');
  const initPoint: string = mpData.init_point;

  if (!initPoint) {
    console.error('[billing-create-intent] Missing init_point in MP response');
    await supabase.from('billing_intents').update({ status: 'FAILED' }).eq('id', intent.id);
    return jsonResponse({
      error: 'PROVIDER_ERROR',
      provider_http_status: 502,
      provider_error_code: 'MISSING_INIT_POINT',
      provider_safe_message: 'Missing init_point from provider response',
    }, 502);
  }

  // Update intent with provider reference
  await supabase
    .from('billing_intents')
    .update({ mp_preapproval_id: mpPreapprovalId, mp_init_point: initPoint, status: 'PROCESSED' })
    .eq('id', intent.id);

  console.log('[STAGE H] INTENT_UPDATED_WITH_PROVIDER');
  console.log('[STAGE I] RESPONSE_SENT');

  return jsonResponse({
    intentId: intent.id,
    initPoint,
    finalNetAmount: finalNet,
    taxAmount,
    finalGrossAmount: grossAmount,
    appliedPromotionCode: appliedCode,
  }, 200);
});
