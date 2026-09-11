-- ==============================================================================
-- SevenPOS — Supabase External Activity Heartbeat & Health Job
-- Phase: INFRA-01B (Edge Function Auth Hardening & Vault Integration)
-- Architecture: pg_cron (15 3 * * *) -> invoke_system_healthcheck() (Vault) -> pg_net -> Edge Function
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- 2. Internal Healthcheck Function (Service Role Only / Restricted)
CREATE OR REPLACE FUNCTION public.system_healthcheck()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'status', 'ok',
    'checked_at', now(),
    'service', 'sevenpos-cloud'
  );
$$;

-- Enforce strict least-privilege: Revoke from all public/client roles
REVOKE ALL ON FUNCTION public.system_healthcheck() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_healthcheck() TO service_role;

-- 3. Dynamic cron runner leveraging Vault secret
CREATE OR REPLACE FUNCTION public.invoke_system_healthcheck()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
DECLARE
  v_secret text := '';
BEGIN
  -- Attempt to retrieve secure token from Supabase Vault if provisioned
  BEGIN
    SELECT decrypted_secret INTO v_secret 
    FROM vault.decrypted_secrets 
    WHERE name = 'healthcheck_token' 
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_secret := '';
  END;

  -- Issue authenticated GET request via pg_net to the Edge Function
  PERFORM net.http_get(
    url := 'https://byrjbrmsyusonhjovavp.supabase.co/functions/v1/system-health',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-health-token', COALESCE(v_secret, ''),
      'User-Agent', 'SevenPOS-HealthHeartbeat/1.0'
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.invoke_system_healthcheck() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invoke_system_healthcheck() TO postgres, service_role;

-- 4. Schedule Daily External Heartbeat Job (03:15 UTC)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sevenpos-daily-external-healthcheck') THEN
    PERFORM cron.unschedule('sevenpos-daily-external-healthcheck');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sevenpos-daily-healthcheck') THEN
    PERFORM cron.unschedule('sevenpos-daily-healthcheck');
  END IF;
END
$$;

SELECT cron.schedule(
  'sevenpos-daily-external-healthcheck',
  '15 3 * * *',
  $$ SELECT public.invoke_system_healthcheck(); $$
);
