-- ==============================================================================
-- SevenPOS — Platform Super Admin Canonical Schema & Security Infrastructure
-- Migration: PLATFORM-01
-- ==============================================================================

-- 1. PLATFORM_ADMINS TABLE
CREATE TABLE IF NOT EXISTS public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('SUPER_ADMIN', 'SUPPORT_ADMIN', 'BILLING_ADMIN', 'READ_ONLY')) DEFAULT 'SUPER_ADMIN',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  last_login_at timestamptz
);

-- 2. PLATFORM_ADMIN_EVENTS TABLE (AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS public.platform_admin_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  target_business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. EXTEND BUSINESS_SUBSCRIPTIONS WITH CANONICAL BILLING SOURCE & MANUAL METADATA
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'business_subscriptions' AND column_name = 'billing_source'
  ) THEN
    ALTER TABLE public.business_subscriptions 
      ADD COLUMN billing_source text NOT NULL DEFAULT 'NONE' 
      CONSTRAINT chk_sub_billing_source CHECK (billing_source IN ('NONE', 'MERCADO_PAGO', 'MANUAL', 'PROMOTIONAL', 'INTERNAL'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'business_subscriptions' AND column_name = 'manual_reason'
  ) THEN
    ALTER TABLE public.business_subscriptions 
      ADD COLUMN manual_reason text 
      CONSTRAINT chk_sub_manual_reason CHECK (manual_reason IS NULL OR manual_reason IN ('FRIEND_FAMILY', 'TESTER', 'ASSISTED_SALE', 'COMPENSATION', 'INTERNAL', 'OTHER'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'business_subscriptions' AND column_name = 'manual_notes'
  ) THEN
    ALTER TABLE public.business_subscriptions ADD COLUMN manual_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'business_subscriptions' AND column_name = 'activated_by_admin_id'
  ) THEN
    ALTER TABLE public.business_subscriptions ADD COLUMN activated_by_admin_id uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'business_subscriptions' AND column_name = 'manual_activated_at'
  ) THEN
    ALTER TABLE public.business_subscriptions ADD COLUMN manual_activated_at timestamptz;
  END IF;
END $$;

-- Backfill existing business_subscriptions
UPDATE public.business_subscriptions
SET billing_source = 'MERCADO_PAGO'
WHERE mp_preapproval_id IS NOT NULL AND (billing_source IS NULL OR billing_source = 'NONE');

UPDATE public.business_subscriptions
SET billing_source = 'NONE'
WHERE mp_preapproval_id IS NULL AND billing_source IS NULL;

-- 4. EXTEND BILLING_CONTRACTS WITH BILLING SOURCE & MANUAL METADATA
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'billing_contracts' AND column_name = 'billing_source'
  ) THEN
    ALTER TABLE public.billing_contracts 
      ADD COLUMN billing_source text NOT NULL DEFAULT 'NONE'
      CONSTRAINT chk_contract_billing_source CHECK (billing_source IN ('NONE', 'MERCADO_PAGO', 'MANUAL', 'PROMOTIONAL', 'INTERNAL'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'billing_contracts' AND column_name = 'manual_reason'
  ) THEN
    ALTER TABLE public.billing_contracts ADD COLUMN manual_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'billing_contracts' AND column_name = 'manual_notes'
  ) THEN
    ALTER TABLE public.billing_contracts ADD COLUMN manual_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'billing_contracts' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE public.billing_contracts ADD COLUMN payment_method text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'billing_contracts' AND column_name = 'external_reference'
  ) THEN
    ALTER TABLE public.billing_contracts ADD COLUMN external_reference text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'billing_contracts' AND column_name = 'created_by_admin_id'
  ) THEN
    ALTER TABLE public.billing_contracts ADD COLUMN created_by_admin_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- 5. INDEXES FOR PLATFORM QUERIES
CREATE INDEX IF NOT EXISTS idx_platform_admins_user ON public.platform_admins(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_platform_admin_events_business ON public.platform_admin_events(target_business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_admin_events_admin ON public.platform_admin_events(admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_source ON public.business_subscriptions(billing_source, status);

-- 6. RLS FOR PLATFORM TABLES
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admin_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins readable by active super admins" ON public.platform_admins;
CREATE POLICY "Platform admins readable by active super admins"
  ON public.platform_admins FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.platform_admins pa 
      WHERE pa.user_id = auth.uid() AND pa.is_active = true AND pa.role = 'SUPER_ADMIN'
    )
  );

DROP POLICY IF EXISTS "Platform admin events readable by active super admins" ON public.platform_admin_events;
CREATE POLICY "Platform admin events readable by active super admins"
  ON public.platform_admin_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins pa 
      WHERE pa.user_id = auth.uid() AND pa.is_active = true AND pa.role = 'SUPER_ADMIN'
    )
  );

REVOKE ALL ON public.platform_admins FROM anon, public;
REVOKE ALL ON public.platform_admin_events FROM anon, public;
GRANT SELECT ON public.platform_admins TO authenticated;
GRANT SELECT ON public.platform_admin_events TO authenticated;

-- 7. HELPER FUNCTION: is_super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = p_user_id
      AND is_active = true
      AND role = 'SUPER_ADMIN'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_super_admin(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;

-- ==============================================================================
-- 8. CANONICAL RPC 1: platform_get_current_admin
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.platform_get_current_admin()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
  v_admin record;
  v_user_email text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('is_admin', false, 'error', 'UNAUTHENTICATED');
  END IF;

  SELECT * INTO v_admin
  FROM public.platform_admins
  WHERE user_id = v_user_id AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('is_admin', false, 'error', 'NOT_PLATFORM_ADMIN');
  END IF;

  -- Record last login
  UPDATE public.platform_admins
  SET last_login_at = now()
  WHERE id = v_admin.id;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  RETURN json_build_object(
    'is_admin', true,
    'id', v_admin.id,
    'user_id', v_admin.user_id,
    'email', COALESCE(v_user_email, ''),
    'role', v_admin.role,
    'created_at', v_admin.created_at,
    'last_login_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.platform_get_current_admin() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.platform_get_current_admin() TO authenticated;

-- ==============================================================================
-- 9. CANONICAL RPC 2: platform_get_dashboard_metrics
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.platform_get_dashboard_metrics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id uuid;
  v_total_businesses integer := 0;
  v_pro_active integer := 0;
  v_free_active integer := 0;
  v_manual_active integer := 0;
  v_mercadopago_active integer := 0;
  v_promotional_active integer := 0;
  v_internal_active integer := 0;
  v_country_dist json;
  v_growth_trend json;
  v_recent_activity json;
BEGIN
  v_caller_id := auth.uid();
  IF NOT public.is_super_admin(v_caller_id) THEN
    RAISE EXCEPTION 'FORBIDDEN: Requires active SUPER_ADMIN role';
  END IF;

  -- Total businesses
  SELECT count(*) INTO v_total_businesses FROM public.businesses;

  -- Plan and source distributions based on current business_subscriptions
  SELECT count(*) INTO v_pro_active 
  FROM public.business_subscriptions 
  WHERE plan_code = 'PRO' AND status = 'ACTIVE';

  SELECT count(*) INTO v_manual_active 
  FROM public.business_subscriptions 
  WHERE plan_code = 'PRO' AND status = 'ACTIVE' AND billing_source = 'MANUAL';

  SELECT count(*) INTO v_mercadopago_active 
  FROM public.business_subscriptions 
  WHERE plan_code = 'PRO' AND status = 'ACTIVE' AND billing_source = 'MERCADO_PAGO';

  SELECT count(*) INTO v_promotional_active 
  FROM public.business_subscriptions 
  WHERE plan_code = 'PRO' AND status = 'ACTIVE' AND billing_source = 'PROMOTIONAL';

  SELECT count(*) INTO v_internal_active 
  FROM public.business_subscriptions 
  WHERE plan_code = 'PRO' AND status = 'ACTIVE' AND billing_source = 'INTERNAL';

  -- FREE active is total businesses minus active PRO businesses
  v_free_active := GREATEST(0, v_total_businesses - v_pro_active);

  -- Country distribution
  SELECT json_agg(c) INTO v_country_dist FROM (
    SELECT country_code, count(*) as count
    FROM public.businesses
    GROUP BY country_code
    ORDER BY count DESC
  ) c;

  -- Growth trend (last 6 months by month)
  SELECT json_agg(g) INTO v_growth_trend FROM (
    SELECT 
      to_char(date_trunc('month', created_at), 'YYYY-MM') as month,
      count(*) as count
    FROM public.businesses
    WHERE created_at >= (now() - interval '6 months')
    GROUP BY date_trunc('month', created_at)
    ORDER BY date_trunc('month', created_at) ASC
  ) g;

  -- Recent Admin Activity
  SELECT json_agg(a) INTO v_recent_activity FROM (
    SELECT 
      pae.id,
      pae.action,
      pae.reason,
      pae.created_at,
      b.name as business_name,
      b.id as business_id,
      u.email as admin_email
    FROM public.platform_admin_events pae
    LEFT JOIN public.businesses b ON b.id = pae.target_business_id
    LEFT JOIN auth.users u ON u.id = pae.admin_user_id
    ORDER BY pae.created_at DESC
    LIMIT 10
  ) a;

  RETURN json_build_object(
    'total_businesses', v_total_businesses,
    'pro_active', v_pro_active,
    'free_active', v_free_active,
    'manual_active', v_manual_active,
    'mercadopago_active', v_mercadopago_active,
    'promotional_active', v_promotional_active,
    'internal_active', v_internal_active,
    'country_distribution', COALESCE(v_country_dist, '[]'::json),
    'growth_trend', COALESCE(v_growth_trend, '[]'::json),
    'recent_activity', COALESCE(v_recent_activity, '[]'::json)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.platform_get_dashboard_metrics() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.platform_get_dashboard_metrics() TO authenticated;

-- ==============================================================================
-- 10. CANONICAL RPC 3: platform_list_businesses
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.platform_list_businesses(
  p_search text DEFAULT NULL,
  p_plan text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_page int DEFAULT 1,
  p_page_size int DEFAULT 25
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id uuid;
  v_offset int;
  v_total_count int := 0;
  v_items json;
BEGIN
  v_caller_id := auth.uid();
  IF NOT public.is_super_admin(v_caller_id) THEN
    RAISE EXCEPTION 'FORBIDDEN: Requires active SUPER_ADMIN role';
  END IF;

  p_page := GREATEST(1, COALESCE(p_page, 1));
  p_page_size := LEAST(100, GREATEST(1, COALESCE(p_page_size, 25)));
  v_offset := (p_page - 1) * p_page_size;

  -- Count matching businesses
  SELECT count(*) INTO v_total_count
  FROM public.businesses b
  LEFT JOIN auth.users u ON u.id = b.owner_user_id
  LEFT JOIN public.profiles p ON p.id = b.owner_user_id
  LEFT JOIN public.business_subscriptions s ON s.business_id = b.id
  WHERE 
    (p_search IS NULL OR p_search = '' OR 
      b.name ILIKE '%' || p_search || '%' OR 
      u.email ILIKE '%' || p_search || '%' OR 
      b.id::text = p_search)
    AND (p_plan IS NULL OR p_plan = '' OR p_plan = 'ALL' OR COALESCE(s.plan_code, 'FREE') = p_plan)
    AND (p_status IS NULL OR p_status = '' OR p_status = 'ALL' OR COALESCE(s.status, 'ACTIVE') = p_status)
    AND (p_source IS NULL OR p_source = '' OR p_source = 'ALL' OR COALESCE(s.billing_source, 'NONE') = p_source)
    AND (p_country IS NULL OR p_country = '' OR p_country = 'ALL' OR b.country_code = p_country);

  -- Fetch items with pagination
  SELECT json_agg(row_to_json(t)) INTO v_items FROM (
    SELECT 
      b.id as business_id,
      b.name as business_name,
      b.country_code,
      b.created_at,
      b.owner_user_id,
      COALESCE(u.email, p.email, '') as owner_email,
      COALESCE(p.first_name || ' ' || p.last_name, 'Propietario') as owner_name,
      COALESCE(s.plan_code, 'FREE') as plan_code,
      COALESCE(s.status, 'ACTIVE') as subscription_status,
      COALESCE(s.billing_source, 'NONE') as billing_source,
      s.manual_reason,
      s.current_period_end,
      (SELECT count(*) FROM public.devices d WHERE d.business_id = b.id AND d.revoked_at IS NULL) as active_devices_count,
      (SELECT count(*) FROM public.business_memberships bm WHERE bm.business_id = b.id AND bm.status = 'ACTIVE') as active_members_count
    FROM public.businesses b
    LEFT JOIN auth.users u ON u.id = b.owner_user_id
    LEFT JOIN public.profiles p ON p.id = b.owner_user_id
    LEFT JOIN public.business_subscriptions s ON s.business_id = b.id
    WHERE 
      (p_search IS NULL OR p_search = '' OR 
        b.name ILIKE '%' || p_search || '%' OR 
        u.email ILIKE '%' || p_search || '%' OR 
        b.id::text = p_search)
      AND (p_plan IS NULL OR p_plan = '' OR p_plan = 'ALL' OR COALESCE(s.plan_code, 'FREE') = p_plan)
      AND (p_status IS NULL OR p_status = '' OR p_status = 'ALL' OR COALESCE(s.status, 'ACTIVE') = p_status)
      AND (p_source IS NULL OR p_source = '' OR p_source = 'ALL' OR COALESCE(s.billing_source, 'NONE') = p_source)
      AND (p_country IS NULL OR p_country = '' OR p_country = 'ALL' OR b.country_code = p_country)
    ORDER BY b.created_at DESC
    LIMIT p_page_size OFFSET v_offset
  ) t;

  RETURN json_build_object(
    'items', COALESCE(v_items, '[]'::json),
    'total_count', v_total_count,
    'page', p_page,
    'page_size', p_page_size,
    'total_pages', CEIL(v_total_count::numeric / p_page_size::numeric)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.platform_list_businesses(text, text, text, text, text, int, int) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.platform_list_businesses(text, text, text, text, text, int, int) TO authenticated;

-- ==============================================================================
-- 11. CANONICAL RPC 4: platform_get_business_detail
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.platform_get_business_detail(
  p_business_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id uuid;
  v_business record;
  v_owner record;
  v_sub record;
  v_contract record;
  v_devices json;
  v_members json;
  v_admin_events json;
  v_admin_user record;
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

  -- Owner Info
  SELECT 
    u.id,
    u.email,
    p.first_name,
    p.last_name,
    u.created_at as account_created_at
  INTO v_owner
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = v_business.owner_user_id;

  -- Subscription State
  SELECT * INTO v_sub FROM public.business_subscriptions WHERE business_id = p_business_id;

  -- Active Contract (if any)
  IF v_sub.active_contract_id IS NOT NULL THEN
    SELECT * INTO v_contract FROM public.billing_contracts WHERE id = v_sub.active_contract_id;
  END IF;

  -- Admin user who activated manual PRO (if any)
  IF v_sub.activated_by_admin_id IS NOT NULL THEN
    SELECT email INTO v_admin_user FROM auth.users WHERE id = v_sub.activated_by_admin_id;
  END IF;

  -- Devices List
  SELECT json_agg(d) INTO v_devices FROM (
    SELECT id, device_name, platform, device_type, created_at, last_seen_at, revoked_at
    FROM public.devices
    WHERE business_id = p_business_id
    ORDER BY last_seen_at DESC
  ) d;

  -- Memberships List
  SELECT json_agg(m) INTO v_members FROM (
    SELECT bm.id, bm.user_id, bm.role, bm.status, bm.created_at, u.email, p.first_name, p.last_name
    FROM public.business_memberships bm
    LEFT JOIN auth.users u ON u.id = bm.user_id
    LEFT JOIN public.profiles p ON p.id = bm.user_id
    WHERE bm.business_id = p_business_id
    ORDER BY bm.created_at ASC
  ) m;

  -- Admin Activity Log
  SELECT json_agg(e) INTO v_admin_events FROM (
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
      'user_id', v_owner.id,
      'email', v_owner.email,
      'name', COALESCE(v_owner.first_name || ' ' || v_owner.last_name, ''),
      'created_at', v_owner.account_created_at
    ),
    'subscription', CASE WHEN v_sub.id IS NOT NULL THEN json_build_object(
      'id', v_sub.id,
      'plan_code', v_sub.plan_code,
      'status', v_sub.status,
      'billing_interval', v_sub.billing_interval,
      'billing_source', v_sub.billing_source,
      'manual_reason', v_sub.manual_reason,
      'manual_notes', v_sub.manual_notes,
      'activated_by_email', v_admin_user.email,
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
    'active_contract', CASE WHEN v_contract.id IS NOT NULL THEN json_build_object(
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
    'devices', COALESCE(v_devices, '[]'::json),
    'members', COALESCE(v_members, '[]'::json),
    'admin_events', COALESCE(v_admin_events, '[]'::json),
    'diagnostic', json_build_object(
      'cloud_business_id', v_business.id,
      'owner_user_id', v_business.owner_user_id,
      'subscription_row_exists', (v_sub.id IS NOT NULL),
      'canonical_plan', COALESCE(v_sub.plan_code, 'FREE'),
      'canonical_status', COALESCE(v_sub.status, 'ACTIVE'),
      'canonical_source', COALESCE(v_sub.billing_source, 'NONE'),
      'has_active_contract', (v_sub.active_contract_id IS NOT NULL)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.platform_get_business_detail(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.platform_get_business_detail(uuid) TO authenticated;

-- ==============================================================================
-- 12. CANONICAL RPC 5: platform_activate_manual_pro
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.platform_activate_manual_pro(
  p_business_id uuid,
  p_interval text,
  p_starts_at timestamptz,
  p_period_end timestamptz,
  p_reason text,
  p_amount integer DEFAULT 0,
  p_currency text DEFAULT 'CLP',
  p_payment_method text DEFAULT NULL,
  p_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id uuid;
  v_existing_sub record;
  v_sub_id uuid;
  v_contract_id uuid;
  v_before_state jsonb;
  v_after_state jsonb;
  v_tax_rate numeric(4,2) := 0.19;
  v_net_amount integer := 0;
  v_tax_amount integer := 0;
  v_gross_amount integer := 0;
BEGIN
  v_caller_id := auth.uid();
  IF NOT public.is_super_admin(v_caller_id) THEN
    RAISE EXCEPTION 'FORBIDDEN: Requires active SUPER_ADMIN role';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = p_business_id) THEN
    RAISE EXCEPTION 'BUSINESS_NOT_FOUND: %', p_business_id;
  END IF;

  IF p_interval NOT IN ('MONTHLY', 'ANNUAL') THEN
    RAISE EXCEPTION 'INVALID_INTERVAL: %', p_interval;
  END IF;

  IF p_reason NOT IN ('FRIEND_FAMILY', 'TESTER', 'ASSISTED_SALE', 'COMPENSATION', 'INTERNAL', 'OTHER') THEN
    RAISE EXCEPTION 'INVALID_REASON: %', p_reason;
  END IF;

  IF p_period_end <= p_starts_at THEN
    RAISE EXCEPTION 'INVALID_PERIOD: period_end must be strictly after starts_at';
  END IF;

  -- Lock row and inspect existing subscription
  SELECT * INTO v_existing_sub FROM public.business_subscriptions WHERE business_id = p_business_id FOR UPDATE;

  IF FOUND THEN
    -- Guard: Never overwrite active Mercado Pago provider subscription
    IF v_existing_sub.plan_code = 'PRO' AND v_existing_sub.status = 'ACTIVE' AND v_existing_sub.billing_source = 'MERCADO_PAGO' THEN
      RAISE EXCEPTION 'CANNOT_OVERWRITE_ACTIVE_MERCADO_PAGO_PRO: Business already has an active provider-backed subscription';
    END IF;

    v_before_state := row_to_json(v_existing_sub)::jsonb;
    v_sub_id := v_existing_sub.id;
  ELSE
    v_before_state := jsonb_build_object('plan_code', 'FREE', 'status', 'ACTIVE', 'billing_source', 'NONE');
  END IF;

  -- Calculate amounts for assisted sale if specified
  IF p_reason = 'ASSISTED_SALE' AND p_amount > 0 THEN
    v_gross_amount := p_amount;
    v_net_amount := ROUND(v_gross_amount / (1.0 + v_tax_rate));
    v_tax_amount := v_gross_amount - v_net_amount;
  ELSE
    v_gross_amount := 0;
    v_net_amount := 0;
    v_tax_amount := 0;
  END IF;

  -- 1. Create or upsert mutable business_subscriptions row
  IF v_sub_id IS NOT NULL THEN
    UPDATE public.business_subscriptions
    SET
      plan_code = 'PRO',
      billing_interval = p_interval,
      status = 'ACTIVE',
      billing_source = 'MANUAL',
      manual_reason = p_reason,
      manual_notes = p_notes,
      activated_by_admin_id = v_caller_id,
      manual_activated_at = now(),
      current_period_start = p_starts_at,
      current_period_end = p_period_end,
      cancel_at_period_end = false,
      updated_at = now()
    WHERE id = v_sub_id;
  ELSE
    INSERT INTO public.business_subscriptions (
      business_id,
      plan_code,
      billing_interval,
      status,
      billing_source,
      manual_reason,
      manual_notes,
      activated_by_admin_id,
      manual_activated_at,
      current_period_start,
      current_period_end,
      cancel_at_period_end
    ) VALUES (
      p_business_id,
      'PRO',
      p_interval,
      'ACTIVE',
      'MANUAL',
      p_reason,
      p_notes,
      v_caller_id,
      now(),
      p_starts_at,
      p_period_end,
      false
    ) RETURNING id INTO v_sub_id;
  END IF;

  -- 2. Create append-only billing_contracts row
  INSERT INTO public.billing_contracts (
    business_id,
    subscription_id,
    pricing_version,
    billing_interval,
    base_net_amount,
    discount_net_amount,
    final_net_amount,
    tax_rate,
    tax_amount,
    final_gross_amount,
    currency,
    billing_source,
    manual_reason,
    manual_notes,
    payment_method,
    external_reference,
    created_by_admin_id,
    renewal_net_amount,
    renewal_gross_amount,
    starts_at,
    ends_at
  ) VALUES (
    p_business_id,
    v_sub_id,
    'MANUAL_V1',
    p_interval,
    GREATEST(1, v_net_amount),
    0,
    v_net_amount,
    v_tax_rate,
    v_tax_amount,
    v_gross_amount,
    COALESCE(p_currency, 'CLP'),
    'MANUAL',
    p_reason,
    p_notes,
    p_payment_method,
    p_reference,
    v_caller_id,
    0,
    0,
    p_starts_at,
    p_period_end
  ) RETURNING id INTO v_contract_id;

  -- Link active contract to subscription
  UPDATE public.business_subscriptions
  SET active_contract_id = v_contract_id
  WHERE id = v_sub_id;

  -- 3. Optionally record payment ONLY for assisted paid sales with amount > 0
  IF p_reason = 'ASSISTED_SALE' AND v_gross_amount > 0 THEN
    INSERT INTO public.subscription_payments (
      business_id,
      subscription_id,
      contract_id,
      provider,
      provider_payment_id,
      status,
      currency,
      gross_amount,
      period_start,
      period_end,
      paid_at
    ) VALUES (
      p_business_id,
      v_sub_id,
      v_contract_id,
      'MANUAL_ASSISTED',
      'MANUAL-' || v_contract_id::text,
      'APPROVED',
      COALESCE(p_currency, 'CLP'),
      v_gross_amount,
      p_starts_at,
      p_period_end,
      now()
    );
  END IF;

  -- 4. Subscription Event
  INSERT INTO public.subscription_events (
    business_id,
    subscription_id,
    event_type,
    previous_status,
    new_status,
    metadata
  ) VALUES (
    p_business_id,
    v_sub_id,
    'MANUAL_PRO_ACTIVATED',
    v_before_state->>'status',
    'ACTIVE',
    jsonb_build_object(
      'admin_user_id', v_caller_id,
      'reason', p_reason,
      'interval', p_interval,
      'period_end', p_period_end,
      'contract_id', v_contract_id,
      'amount', v_gross_amount
    )
  );

  -- 5. Platform Admin Audit Event
  v_after_state := jsonb_build_object(
    'plan_code', 'PRO',
    'status', 'ACTIVE',
    'billing_source', 'MANUAL',
    'manual_reason', p_reason,
    'current_period_end', p_period_end,
    'active_contract_id', v_contract_id
  );

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
    'MANUAL_PRO_ACTIVATED',
    p_business_id,
    p_reason,
    v_before_state,
    v_after_state,
    jsonb_build_object(
      'interval', p_interval,
      'starts_at', p_starts_at,
      'period_end', p_period_end,
      'notes', p_notes,
      'reference', p_reference,
      'amount', v_gross_amount
    )
  );

  RETURN json_build_object(
    'success', true,
    'business_id', p_business_id,
    'subscription_id', v_sub_id,
    'contract_id', v_contract_id,
    'plan_code', 'PRO',
    'status', 'ACTIVE',
    'billing_source', 'MANUAL',
    'current_period_end', p_period_end
  );
END;
$$;

REVOKE ALL ON FUNCTION public.platform_activate_manual_pro(uuid, text, timestamptz, timestamptz, text, integer, text, text, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.platform_activate_manual_pro(uuid, text, timestamptz, timestamptz, text, integer, text, text, text, text) TO authenticated;

-- ==============================================================================
-- 13. CANONICAL RPC 6: platform_end_manual_pro
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.platform_end_manual_pro(
  p_business_id uuid,
  p_reason text DEFAULT 'FINALIZADO_POR_ADMINISTRADOR'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id uuid;
  v_existing_sub record;
  v_before_state jsonb;
  v_after_state jsonb;
BEGIN
  v_caller_id := auth.uid();
  IF NOT public.is_super_admin(v_caller_id) THEN
    RAISE EXCEPTION 'FORBIDDEN: Requires active SUPER_ADMIN role';
  END IF;

  SELECT * INTO v_existing_sub FROM public.business_subscriptions WHERE business_id = p_business_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUBSCRIPTION_NOT_FOUND for business: %', p_business_id;
  END IF;

  IF v_existing_sub.billing_source != 'MANUAL' AND v_existing_sub.billing_source != 'INTERNAL' THEN
    RAISE EXCEPTION 'CANNOT_TERMINATE_NON_MANUAL_SUBSCRIPTION: Billing source is %', v_existing_sub.billing_source;
  END IF;

  v_before_state := row_to_json(v_existing_sub)::jsonb;

  -- Set subscription to EXPIRED/FREE while preserving history and data
  UPDATE public.business_subscriptions
  SET
    plan_code = 'FREE',
    status = 'EXPIRED',
    cancel_at_period_end = false,
    updated_at = now()
  WHERE id = v_existing_sub.id;

  -- Subscription Event
  INSERT INTO public.subscription_events (
    business_id,
    subscription_id,
    event_type,
    previous_status,
    new_status,
    metadata
  ) VALUES (
    p_business_id,
    v_existing_sub.id,
    'MANUAL_PRO_ENDED',
    v_existing_sub.status,
    'EXPIRED',
    jsonb_build_object(
      'admin_user_id', v_caller_id,
      'reason', p_reason
    )
  );

  -- Platform Admin Event
  v_after_state := jsonb_build_object(
    'plan_code', 'FREE',
    'status', 'EXPIRED',
    'billing_source', v_existing_sub.billing_source
  );

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
    'MANUAL_PRO_ENDED',
    p_business_id,
    p_reason,
    v_before_state,
    v_after_state,
    jsonb_build_object('ended_at', now())
  );

  RETURN json_build_object(
    'success', true,
    'business_id', p_business_id,
    'plan_code', 'FREE',
    'status', 'EXPIRED'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.platform_end_manual_pro(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.platform_end_manual_pro(uuid, text) TO authenticated;
