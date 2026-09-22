-- ==============================================================================
-- SevenPOS — Platform Super Admin Password Change Audit RPC
-- Migration: PLATFORM-01D
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.platform_log_password_changed()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id uuid;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'UNAUTHENTICATED');
  END IF;

  IF NOT public.is_super_admin(v_caller_id) THEN
    RETURN json_build_object('success', false, 'error', 'FORBIDDEN');
  END IF;

  -- Insert audit event with STRICTLY ZERO password or credential data
  INSERT INTO public.platform_admin_events (
    admin_user_id,
    action,
    target_user_id,
    reason,
    metadata
  ) VALUES (
    v_caller_id,
    'PLATFORM_PASSWORD_CHANGED',
    v_caller_id,
    'CAMBIO_CONTRASENA_SUPER_ADMIN',
    jsonb_build_object('event', 'password_updated_successfully')
  );

  RETURN json_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.platform_log_password_changed() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.platform_log_password_changed() TO authenticated;