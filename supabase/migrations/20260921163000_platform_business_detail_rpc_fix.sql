-- ==============================================================================
-- Migration: 20260921163000_platform_business_detail_rpc_fix.sql
-- Description: 
--   1. Fixes platform_get_business_detail RPC to prevent unassigned record runtime errors.
--   2. Updates RLS policy on business_subscriptions, billing_contracts, subscription_payments,
--      and subscription_events so any active member of a business can verify subscription state.
-- ==============================================================================

-- 1. UPDATE RLS ON business_subscriptions
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

-- 2. UPDATE RLS ON billing_contracts
DROP POLICY IF EXISTS "Contracts readable by business owner" ON public.billing_contracts;
DROP POLICY IF EXISTS "Contracts readable by active business members" ON public.billing_contracts;
CREATE POLICY "Contracts readable by active business members" ON public.billing_contracts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = public.billing_contracts.business_id
        AND bm.user_id = auth.uid()
        AND bm.status = 'ACTIVE'
    )
    OR public.is_super_admin(auth.uid())
  );

-- 3. UPDATE RLS ON subscription_payments
DROP POLICY IF EXISTS "Payments readable by business owner" ON public.subscription_payments;
DROP POLICY IF EXISTS "Payments readable by active business members" ON public.subscription_payments;
CREATE POLICY "Payments readable by active business members" ON public.subscription_payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = public.subscription_payments.business_id
        AND bm.user_id = auth.uid()
        AND bm.status = 'ACTIVE'
    )
    OR public.is_super_admin(auth.uid())
  );

-- 4. UPDATE RLS ON subscription_events
DROP POLICY IF EXISTS "Subscription events readable by business owner" ON public.subscription_events;
DROP POLICY IF EXISTS "Subscription events readable by active business members" ON public.subscription_events;
CREATE POLICY "Subscription events readable by active business members" ON public.subscription_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = public.subscription_events.business_id
        AND bm.user_id = auth.uid()
        AND bm.status = 'ACTIVE'
    )
    OR public.is_super_admin(auth.uid())
  );

-- 5. RE-DEFINE platform_get_business_detail RPC WITH SAFE SCALARS
CREATE OR REPLACE FUNCTION public.platform_get_business_detail(
  p_business_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $BODY$
DECLARE
  v_caller_id uuid;
  v_business public.businesses%ROWTYPE;
  v_owner_id uuid := NULL;
  v_owner_email text := NULL;
  v_owner_name text := '';
  v_owner_created_at timestamptz := NULL;
  v_sub public.business_subscriptions%ROWTYPE;
  v_contract public.billing_contracts%ROWTYPE;
  v_devices json := '[]'::json;
  v_members json := '[]'::json;
  v_admin_events json := '[]'::json;
  v_activated_by_email text := NULL;
  v_has_sub boolean := false;
  v_has_contract boolean := false;
BEGIN
  v_caller_id := auth.uid();
  IF NOT public.is_super_admin(v_caller_id) THEN
    RAISE EXCEPTION 'FORBIDDEN: Requires active SUPER_ADMIN role';
  END IF;

  -- Business Overview
  SELECT * INTO v_business FROM public.businesses WHERE id = p_business_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'BUSINESS_NOT_FOUND: %', p_business_id;
  END IF;

  -- Owner Info (safe scalars)
  IF v_business.owner_user_id IS NOT NULL THEN
    SELECT 
      u.id,
      u.email,
      COALESCE(NULLIF(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), ''), u.email, 'Sin nombre'),
      u.created_at
    INTO 
      v_owner_id,
      v_owner_email,
      v_owner_name,
      v_owner_created_at
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE u.id = v_business.owner_user_id;
  END IF;

  -- Subscription State
  SELECT * INTO v_sub FROM public.business_subscriptions WHERE business_id = p_business_id;
  IF FOUND THEN
    v_has_sub := true;

    -- Active Contract (if any)
    IF v_sub.active_contract_id IS NOT NULL THEN
      SELECT * INTO v_contract FROM public.billing_contracts WHERE id = v_sub.active_contract_id;
      IF FOUND THEN
        v_has_contract := true;
      END IF;
    END IF;

    -- Admin user who activated manual PRO (if any)
    IF v_sub.activated_by_admin_id IS NOT NULL THEN
      SELECT email INTO v_activated_by_email FROM auth.users WHERE id = v_sub.activated_by_admin_id;
    END IF;
  END IF;

  -- Devices List
  SELECT COALESCE(json_agg(d), '[]'::json) INTO v_devices FROM (
    SELECT id, device_name, platform, device_type, created_at, last_seen_at, revoked_at
    FROM public.devices
    WHERE business_id = p_business_id
    ORDER BY last_seen_at DESC
  ) d;

  -- Memberships List
  SELECT COALESCE(json_agg(m), '[]'::json) INTO v_members FROM (
    SELECT bm.id, bm.user_id, bm.role, bm.status, bm.created_at, u.email, p.first_name, p.last_name
    FROM public.business_memberships bm
    LEFT JOIN auth.users u ON u.id = bm.user_id
    LEFT JOIN public.profiles p ON p.id = bm.user_id
    WHERE bm.business_id = p_business_id
    ORDER BY bm.created_at ASC
  ) m;

  -- Admin Activity Log
  SELECT COALESCE(json_agg(e), '[]'::json) INTO v_admin_events FROM (
    SELECT pae.id, pae.action, pae.reason, pae.created_at, pae.before_state, pae.after_state, pae.metadata, u.email as admin_email
    FROM public.platform_admin_events pae
    LEFT JOIN auth.users u ON u.id = pae.admin_user_id
    WHERE pae.target_business_id = p_business_id
    ORDER BY pae.created_at DESC
    LIMIT 20
  ) e;

  RETURN json_build_object(
    'business', json_build_object(
      'id', v_business.id,
      'name', v_business.name,
      'country_code', v_business.country_code,
      'created_at', v_business.created_at,
      'updated_at', v_business.updated_at
    ),
    'owner', json_build_object(
      'user_id', v_owner_id,
      'email', v_owner_email,
      'name', v_owner_name,
      'created_at', v_owner_created_at
    ),
    'subscription', CASE WHEN v_has_sub THEN json_build_object(
      'id', v_sub.id,
      'plan_code', v_sub.plan_code,
      'status', v_sub.status,
      'billing_interval', v_sub.billing_interval,
      'billing_source', v_sub.billing_source,
      'manual_reason', v_sub.manual_reason,
      'manual_notes', v_sub.manual_notes,
      'activated_by_email', v_activated_by_email,
      'manual_activated_at', v_sub.manual_activated_at,
      'mp_preapproval_id', v_sub.mp_preapproval_id,
      'current_period_start', v_sub.current_period_start,
      'current_period_end', v_sub.current_period_end,
      'cancel_at_period_end', v_sub.cancel_at_period_end,
      'active_contract_id', v_sub.active_contract_id,
      'updated_at', v_sub.updated_at
    ) ELSE json_build_object(
      'plan_code', 'FREE',
      'status', 'ACTIVE',
      'billing_source', 'NONE'
    ) END,
    'active_contract', CASE WHEN v_has_contract THEN json_build_object(
      'id', v_contract.id,
      'pricing_version', v_contract.pricing_version,
      'billing_interval', v_contract.billing_interval,
      'final_gross_amount', v_contract.final_gross_amount,
      'currency', v_contract.currency,
      'starts_at', v_contract.starts_at,
      'ends_at', v_contract.ends_at,
      'created_at', v_contract.created_at,
      'payment_method', v_contract.payment_method,
      'external_reference', v_contract.external_reference
    ) ELSE NULL END,
    'devices', v_devices,
    'members', v_members,
    'admin_events', v_admin_events,
    'diagnostic', json_build_object(
      'cloud_business_id', v_business.id,
      'owner_user_id', v_business.owner_user_id,
      'subscription_row_exists', v_has_sub,
      'canonical_plan', CASE WHEN v_has_sub THEN v_sub.plan_code ELSE 'FREE' END,
      'canonical_status', CASE WHEN v_has_sub THEN v_sub.status ELSE 'ACTIVE' END,
      'canonical_source', CASE WHEN v_has_sub THEN v_sub.billing_source ELSE 'NONE' END,
      'has_active_contract', v_has_contract,
      'resolved_entitlement_plan', CASE WHEN v_has_sub AND v_sub.plan_code = 'PRO' AND v_sub.status = 'ACTIVE' THEN 'PRO' ELSE 'FREE' END
    )
  );
END;
$BODY$;

REVOKE ALL ON FUNCTION public.platform_get_business_detail(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.platform_get_business_detail(uuid) TO authenticated;
