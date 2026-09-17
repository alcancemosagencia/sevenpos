import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
// 48-hour safety buffer before period end — SEVENPOS INTERNAL POLICY (not MP requirement)
const CANCEL_BUFFER_MS = 48 * 60 * 60 * 1000;

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

  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

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
    .select('id, status, plan_code, current_period_end, cancel_at_period_end')
    .eq('business_id', membership.business_id)
    .maybeSingle();

  if (!sub || sub.plan_code !== 'PRO' || sub.status === 'EXPIRED') {
    return jsonResponse({ error: 'NO_ACTIVE_SUBSCRIPTION' }, 400);
  }

  if (sub.cancel_at_period_end) {
    return jsonResponse({ error: 'ALREADY_SCHEDULED_FOR_CANCELLATION' }, 400);
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const periodEnd = sub.current_period_end ? new Date(sub.current_period_end) : null;
  // provider_cancel_due_at = period_end - 48h (SEVENPOS INTERNAL SAFETY BUFFER)
  const providerCancelDue = periodEnd
    ? new Date(periodEnd.getTime() - CANCEL_BUFFER_MS).toISOString()
    : null;

  await supabase.from('business_subscriptions').update({
    cancel_at_period_end: true,
    cancel_requested_at: nowIso,
    provider_cancel_due_at: providerCancelDue,
    updated_at: nowIso,
  }).eq('id', sub.id);

  await supabase.from('subscription_events').insert({
    business_id: membership.business_id,
    subscription_id: sub.id,
    event_type: 'CANCELLATION_SCHEDULED',
    previous_status: sub.status,
    new_status: sub.status,
    metadata: {
      cancel_requested_at: nowIso,
      provider_cancel_due_at: providerCancelDue,
      current_period_end: sub.current_period_end,
    },
  });

  return jsonResponse({
    success: true,
    cancelAtPeriodEnd: true,
    cancelRequestedAt: nowIso,
    providerCancelDueAt: providerCancelDue,
  }, 200);
});
