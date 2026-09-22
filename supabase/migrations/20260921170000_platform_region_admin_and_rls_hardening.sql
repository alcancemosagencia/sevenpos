-- ==============================================================================
-- Migration: 20260921170000_platform_region_admin_and_rls_hardening.sql
-- Description:
--   1. RLS Least-Privilege Hardening:
--      - business_subscriptions: readable by any active member (OWNER, ADMIN, CASHIER) or super admin.
--      - billing_contracts: strictly restricted to OWNER, ADMIN, or super admin.
--      - subscription_payments: strictly restricted to OWNER, ADMIN, or super admin.
--      - subscription_events: strictly restricted to OWNER, ADMIN, or super admin.
--   2. Canonical RPC: platform_update_business_region
--      - Administrative region/country correction for Super Admin.
-- ==============================================================================

-- 1. HARDEN RLS ON billing_contracts (OWNER / ADMIN ONLY)
DROP POLICY IF EXISTS "Contracts readable by business owner" ON public.billing_contracts;
DROP POLICY IF EXISTS "Contracts readable by active business members" ON public.billing_contracts;
DROP POLICY IF EXISTS "Contracts readable by business owner and admin" ON public.billing_contracts;
CREATE POLICY "Contracts readable by business owner and admin" ON public.billing_contracts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = public.billing_contracts.business_id
        AND bm.user_id = auth.uid()
        AND bm.role IN ('OWNER', 'ADMIN')
        AND bm.status = 'ACTIVE'
    )
    OR public.is_super_admin(auth.uid())
  );

-- 2. HARDEN RLS ON subscription_payments (OWNER / ADMIN ONLY)
DROP POLICY IF EXISTS "Payments readable by business owner" ON public.subscription_payments;
DROP POLICY IF EXISTS "Payments readable by active business members" ON public.subscription_payments;
DROP POLICY IF EXISTS "Payments readable by business owner and admin" ON public.subscription_payments;
CREATE POLICY "Payments readable by business owner and admin" ON public.subscription_payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = public.subscription_payments.business_id
        AND bm.user_id = auth.uid()
        AND bm.role IN ('OWNER', 'ADMIN')
        AND bm.status = 'ACTIVE'
    )
    OR public.is_super_admin(auth.uid())
  );

-- 3. HARDEN RLS ON subscription_events (OWNER / ADMIN ONLY)
DROP POLICY IF EXISTS "Subscription events readable by business owner" ON public.subscription_events;
DROP POLICY IF EXISTS "Subscription events readable by active business members" ON public.subscription_events;
DROP POLICY IF EXISTS "Subscription events readable by business owner and admin" ON public.subscription_events;
CREATE POLICY "Subscription events readable by business owner and admin" ON public.subscription_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = public.subscription_events.business_id
        AND bm.user_id = auth.uid()
        AND bm.role IN ('OWNER', 'ADMIN')
        AND bm.status = 'ACTIVE'
    )
    OR public.is_super_admin(auth.uid())
  );

-- 4. RLS ON business_subscriptions (REMAINS ACCESSIBLE TO ALL ACTIVE MEMBERS FOR RUNTIME ENTITLEMENTS)
DROP POLICY IF EXISTS "Subscriptions readable by business owner" ON public.business_subscriptions;
DROP POLICY IF EXISTS "Subscriptions readable by active business members" ON public.business_subscriptions;
CREATE POLICY "Subscriptions readable by active business members" ON public.business_subscriptions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = public.business_subscriptions.business_id
        AND bm.user_id = auth.uid()
        AND bm.status = 'ACTIVE'
    )
    OR public.is_super_admin(auth.uid())
  );

-- 5. CANONICAL RPC: platform_update_business_region
CREATE OR REPLACE FUNCTION public.platform_update_business_region(
  p_business_id uuid,
  p_country_code text,
  p_currency_code text,
  p_reason text,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $BODY$
DECLARE
  v_caller_id uuid;
  v_business public.businesses%ROWTYPE;
  v_before_state jsonb;
  v_after_state jsonb;
  v_has_payments boolean := false;
BEGIN
  v_caller_id := auth.uid();
  IF NOT public.is_super_admin(v_caller_id) THEN
    RAISE EXCEPTION 'FORBIDDEN: Requires active SUPER_ADMIN role';
  END IF;

  SELECT * INTO v_business FROM public.businesses WHERE id = p_business_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'BUSINESS_NOT_FOUND: %', p_business_id;
  END IF;

  IF p_country_code NOT IN ('CL', 'CO', 'VE') THEN
    RAISE EXCEPTION 'INVALID_COUNTRY_CODE: %', p_country_code;
  END IF;

  -- Validate allowed combinations:
  -- CL -> CLP
  -- CO -> COP
  -- VE -> VES, USD
  IF p_country_code = 'CL' AND p_currency_code != 'CLP' THEN
    RAISE EXCEPTION 'INVALID_COUNTRY_CURRENCY_COMBINATION: Chile (CL) only supports CLP';
  ELSIF p_country_code = 'CO' AND p_currency_code != 'COP' THEN
    RAISE EXCEPTION 'INVALID_COUNTRY_CURRENCY_COMBINATION: Colombia (CO) only supports COP';
  ELSIF p_country_code = 'VE' AND p_currency_code NOT IN ('VES', 'USD') THEN
    RAISE EXCEPTION 'INVALID_COUNTRY_CURRENCY_COMBINATION: Venezuela (VE) only supports VES or USD';
  END IF;

  IF TRIM(p_reason) = '' OR p_reason IS NULL THEN
    RAISE EXCEPTION 'REASON_REQUIRED: A valid reason must be provided for regional configuration changes';
  END IF;

  v_before_state := jsonb_build_object(
    'country_code', v_business.country_code
  );

  -- Check if financial operations exist
  SELECT EXISTS(
    SELECT 1 FROM public.subscription_payments WHERE business_id = p_business_id
  ) INTO v_has_payments;

  -- Update business record
  UPDATE public.businesses
  SET 
    country_code = p_country_code,
    updated_at = now()
  WHERE id = p_business_id;

  v_after_state := jsonb_build_object(
    'country_code', p_country_code,
    'currency_code', p_currency_code
  );

  -- Audit event in platform_admin_events
  INSERT INTO public.platform_admin_events (
    admin_user_id,
    action,
    target_business_id,
    reason,
    before_state,
    after_state,
    metadata
  ) VALUES (
    v_caller_id,
    'BUSINESS_REGION_UPDATED',
    p_business_id,
    p_reason,
    v_before_state,
    v_after_state,
    jsonb_build_object(
      'notes', p_notes,
      'has_prior_financial_ops', v_has_payments
    )
  );

  RETURN json_build_object(
    'success', true,
    'business_id', p_business_id,
    'country_code', p_country_code,
    'currency_code', p_currency_code,
    'has_prior_financial_ops', v_has_payments
  );
END;
$BODY$;

REVOKE ALL ON FUNCTION public.platform_update_business_region(uuid, text, text, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.platform_update_business_region(uuid, text, text, text, text) TO authenticated;
