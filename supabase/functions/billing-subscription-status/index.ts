import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ error: 'UNAUTHORIZED' }, 401);

  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return jsonResponse({ error: 'UNAUTHORIZED' }, 401);

  const { data: membership } = await supabase
    .from('business_memberships')
    .select('business_id')
    .eq('user_id', user.id)
    .eq('role', 'OWNER')
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (!membership) return jsonResponse({ error: 'NOT_OWNER' }, 403);

  const { data: sub } = await supabase
    .from('business_subscriptions')
    .select('plan_code, billing_interval, status, cancel_at_period_end, current_period_end, updated_at, active_contract_id')
    .eq('business_id', membership.business_id)
    .maybeSingle();

  if (!sub) {
    return jsonResponse({
      planCode: 'FREE',
      status: 'ACTIVE',
      billingInterval: null,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      updatedAt: new Date().toISOString(),
      promotionCode: null,
      renewalGrossAmount: null,
    }, 200);
  }

  let promoCode: string | null = null;
  let renewalGross: number | null = null;
  if (sub.active_contract_id) {
    const { data: contract } = await supabase
      .from('billing_contracts')
      .select('promotion_code, renewal_gross_amount')
      .eq('id', sub.active_contract_id)
      .maybeSingle();
    if (contract) {
      promoCode = contract.promotion_code;
      renewalGross = contract.renewal_gross_amount;
    }
  }

  return jsonResponse({
    planCode: sub.plan_code,
    billingInterval: sub.billing_interval,
    status: sub.status,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    currentPeriodEnd: sub.current_period_end,
    updatedAt: sub.updated_at,
    promotionCode: promoCode,
    renewalGrossAmount: renewalGross,
  }, 200);
});
