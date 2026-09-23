import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CLP_TAX_RATE = 0.19;

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
  promotion_scope: 'PUBLIC' | 'PRIVATE';
  discount_type: 'PERCENT' | 'FIXED_NET_PRICE' | 'FREE';
  discount_percent_bp: number | null;
  fixed_monthly_net_amount: number | null;
  fixed_annual_net_amount: number | null;
  applicable_billing_intervals: 'MONTHLY' | 'ANNUAL' | 'BOTH';
  max_redemptions: number | null;
  redemptions_count: number;
  valid_from: string | null;
  valid_until: string | null;
  duration_type: 'FOREVER' | 'N_MONTHS' | 'ONCE' | null;
  duration_months: number | null;
}

function calcTax(net: number): { taxAmount: number; grossAmount: number } {
  const taxAmount = Math.round(net * CLP_TAX_RATE);
  return { taxAmount, grossAmount: net + taxAmount };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const body = await req.json().catch(() => ({}));
  const billingInterval: 'MONTHLY' | 'ANNUAL' = body.billingInterval || (body.planId === 'pro_annual' ? 'ANNUAL' : 'MONTHLY');
  const planId: string = body.planId || (billingInterval === 'ANNUAL' ? 'pro_annual' : 'pro_monthly');
  const rawCode: string | undefined = body.couponCode;
  const couponCode = rawCode?.trim().toUpperCase() || null;

  if (!planId || !billingInterval) {
    return jsonResponse({ valid: false, reason: 'MISSING_PARAMS' }, 400);
  }

  const { data: plan } = await supabase
    .from('billing_plans')
    .select('base_net_amount')
    .eq('id', planId)
    .eq('is_active', true)
    .maybeSingle();

  if (!plan) return jsonResponse({ valid: false, reason: 'PLAN_NOT_FOUND' }, 404);

  const baseNet: number = plan.base_net_amount;

  // 1. Fetch active PUBLIC promotion
  const { data: publicPromo } = await supabase
    .from('billing_promotions')
    .select('*')
    .eq('promotion_scope', 'PUBLIC')
    .eq('status', 'ACTIVE')
    .maybeSingle();

  // 2. Private coupon validation requires an authenticated Supabase user with active OWNER role.
  // Public price preview (no couponCode or user entering the public code) is public read-only.
  const isPrivateCouponCheck = Boolean(couponCode && (!publicPromo || couponCode !== publicPromo.code));
  if (isPrivateCouponCheck) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({
        valid: false,
        reason: 'AUTH_REQUIRED',
        message: 'Para aplicar cupones privados debes iniciar sesión con tu cuenta de propietario.',
      }, 401);
    }
    const userClient = createClient(SUPABASE_URL, authHeader.replace('Bearer ', ''), {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return jsonResponse({
        valid: false,
        reason: 'AUTH_REQUIRED',
        message: 'Para aplicar cupones privados debes iniciar sesión con tu cuenta de propietario.',
      }, 401);
    }

    // Verify ACTIVE OWNER membership using service client (authoritative)
    const { data: membership, error: memErr } = await supabase
      .from('business_memberships')
      .select('business_id, role, status')
      .eq('user_id', user.id)
      .eq('role', 'OWNER')
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (memErr || !membership) {
      return jsonResponse({
        valid: false,
        reason: 'NOT_OWNER',
        message: 'Solo el propietario del negocio puede aplicar cupones privados.',
      }, 403);
    }
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

  function isPromoValid(promo: PromoRow): { valid: boolean; reason?: string } {
    if (promo.status !== 'ACTIVE') return { valid: false, reason: 'INACTIVE' };
    if (!intervalSupported(promo)) return { valid: false, reason: 'INTERVAL_NOT_SUPPORTED' };
    if (promo.max_redemptions !== null && promo.redemptions_count >= promo.max_redemptions) {
      return { valid: false, reason: 'ALREADY_USED' };
    }
    const now = Date.now();
    if (promo.valid_from && new Date(promo.valid_from).getTime() > now) return { valid: false, reason: 'INACTIVE' };
    if (promo.valid_until && new Date(promo.valid_until).getTime() < now) return { valid: false, reason: 'EXPIRED' };
    return { valid: true };
  }

  const publicCheck = publicPromo ? isPromoValid(publicPromo) : { valid: false };
  const publicValid = publicCheck.valid;

  let finalNet = baseNet;
  let discountNet = 0;
  let appliedCode: string | null = null;
  let appliedType: string | null = null;
  let durationMonths: number | null = null;
  let durationType: string | null = null;
  let couponStatus: {
    code: string;
    valid: boolean;
    reason?: string;
    message?: string;
  } | null = null;

  if (couponCode) {
    if (publicValid && publicPromo && couponCode === publicPromo.code) {
      // User entered the active public promo code (e.g. FOUNDERS_50)
      const pubResult = applyPromo(publicPromo);
      finalNet = pubResult.finalNet;
      discountNet = pubResult.discountNet;
      appliedCode = publicPromo.code;
      appliedType = publicPromo.discount_type;
      durationMonths = publicPromo.duration_months;
      durationType = publicPromo.duration_type;
      couponStatus = {
        code: couponCode,
        valid: true,
        reason: 'PUBLIC_PROMOTION_ALREADY_APPLIED',
        message: 'Esta promoción ya está aplicada automáticamente.',
      };
    } else {
      // Query explicit coupon
      const { data: explicitPromo } = await supabase
        .from('billing_promotions')
        .select('*')
        .eq('code', couponCode)
        .maybeSingle();

      if (!explicitPromo) {
        couponStatus = { code: couponCode, valid: false, reason: 'INVALID', message: 'Código no válido.' };
      } else {
        const explicitCheck = isPromoValid(explicitPromo);
        if (!explicitCheck.valid) {
          const reasonMsgMap: Record<string, string> = {
            INACTIVE: 'Este cupón no está activo.',
            EXPIRED: 'Este cupón ha expirado.',
            INTERVAL_NOT_SUPPORTED: 'Este cupón no aplica para el período seleccionado.',
            ALREADY_USED: 'Este cupón ya alcanzó el límite de usos.',
          };
          couponStatus = {
            code: couponCode,
            valid: false,
            reason: explicitCheck.reason,
            message: reasonMsgMap[explicitCheck.reason || ''] || 'Código no válido.',
          };
        } else {
          // Explicit coupon is valid — compare with public promotion
          if (publicValid && publicPromo) {
            const pubResult = applyPromo(publicPromo);
            const expResult = applyPromo(explicitPromo);
            const { grossAmount: pubGross } = calcTax(pubResult.finalNet);
            const { grossAmount: expGross } = calcTax(expResult.finalNet);

            if (pubGross <= expGross) {
              // Public promotion is cheaper or equal
              finalNet = pubResult.finalNet;
              discountNet = pubResult.discountNet;
              appliedCode = publicPromo.code;
              appliedType = publicPromo.discount_type;
              durationMonths = publicPromo.duration_months;
              durationType = publicPromo.duration_type;
              couponStatus = {
                code: couponCode,
                valid: false,
                reason: 'INFERIOR_PRICE',
                message: 'El precio actual de Fundadores es mejor que este cupón.',
              };
            } else {
              // Explicit coupon is cheaper!
              finalNet = expResult.finalNet;
              discountNet = expResult.discountNet;
              appliedCode = explicitPromo.code;
              appliedType = explicitPromo.discount_type;
              durationMonths = explicitPromo.duration_months;
              durationType = explicitPromo.duration_type;
              couponStatus = {
                code: couponCode,
                valid: true,
                message: 'Cupón aplicado con éxito.',
              };
            }
          } else {
            // Only explicit coupon exists
            const expResult = applyPromo(explicitPromo);
            finalNet = expResult.finalNet;
            discountNet = expResult.discountNet;
            appliedCode = explicitPromo.code;
            appliedType = explicitPromo.discount_type;
            durationMonths = explicitPromo.duration_months;
            durationType = explicitPromo.duration_type;
            couponStatus = {
              code: couponCode,
              valid: true,
              message: 'Cupón aplicado con éxito.',
            };
          }
        }
      }

      // If explicit coupon failed and we haven't applied public promo yet, fall back to public promo if valid
      if (!appliedCode && publicValid && publicPromo) {
        const pubResult = applyPromo(publicPromo);
        finalNet = pubResult.finalNet;
        discountNet = pubResult.discountNet;
        appliedCode = publicPromo.code;
        appliedType = publicPromo.discount_type;
        durationMonths = publicPromo.duration_months;
        durationType = publicPromo.duration_type;
      }
    }
  } else {
    // No coupon code provided — auto-apply public promotion if valid
    if (publicValid && publicPromo) {
      const pubResult = applyPromo(publicPromo);
      finalNet = pubResult.finalNet;
      discountNet = pubResult.discountNet;
      appliedCode = publicPromo.code;
      appliedType = publicPromo.discount_type;
      durationMonths = publicPromo.duration_months;
      durationType = publicPromo.duration_type;
    }
  }

  const { taxAmount, grossAmount } = calcTax(finalNet);
  const renewalNet = baseNet;
  const { grossAmount: renewalGross } = calcTax(renewalNet);

  return jsonResponse({
    valid: true,
    planId,
    billingInterval,
    baseNetAmount: baseNet,
    discountNetAmount: discountNet,
    finalNetAmount: finalNet,
    taxAmount,
    finalGrossAmount: grossAmount,
    appliedPromotionCode: appliedCode,
    appliedPromotionType: appliedType,
    durationMonths,
    durationType,
    renewalNetAmount: renewalNet,
    renewalGrossAmount: renewalGross,
    isFounders: appliedCode === 'FOUNDERS_50',
    // Backwards-compatible fields for any existing callers:
    promotionCode: appliedCode,
    couponStatus,
  }, 200);
});

