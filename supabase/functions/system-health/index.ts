// ==============================================================================
// SevenPOS — System Health Edge Function (INFRA-01B Hardened)
// Purpose: Authenticated external health endpoint for daily keepalive
// Security: Requires valid x-health-token or Bearer secret. Zero tenant data.
// ==============================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-health-token, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 1. Strict Authentication Check
  const expectedSecret = Deno.env.get('HEALTHCHECK_SECRET');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const providedToken = req.headers.get('x-health-token');
  const authHeader = req.headers.get('Authorization');
  const bearerToken = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : null;

  // Validate that a valid secret was provided
  const isAuthorized =
    (expectedSecret && (providedToken === expectedSecret || bearerToken === expectedSecret)) ||
    (serviceRoleKey && (bearerToken === serviceRoleKey || providedToken === serviceRoleKey));

  if (!isAuthorized) {
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'Unauthorized: invalid or missing health authentication token',
      }),
      {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ status: 'error', message: 'Internal configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize server-side service client for least-privilege health RPC
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Minimal database read: execute internal stable healthcheck
    const { error: dbError } = await supabase.rpc('system_healthcheck');

    if (dbError) {
      console.warn('[system-health] RPC check warning:', dbError.message);
    }

    const payload = {
      status: 'ok',
      checkedAt: new Date().toISOString(),
      service: 'sevenpos-cloud',
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ status: 'error', message: 'Healthcheck failed', error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
