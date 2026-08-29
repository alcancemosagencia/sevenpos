-- ==============================================================================
-- SevenPOS — Cloud Identity & Device Enrollment Canonical Schema
-- Phase: DEPLOY-01A.3 (Hardened Edition)
-- ==============================================================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Businesses Table
CREATE TABLE IF NOT EXISTS public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  name text NOT NULL,
  country_code text NOT NULL DEFAULT 'CL',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Business Memberships Table
CREATE TABLE IF NOT EXISTS public.business_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'CASHIER')),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'REVOKED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_business_memberships_pair UNIQUE (business_id, user_id)
);

-- 4. Devices Table
CREATE TABLE IF NOT EXISTS public.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name text NOT NULL,
  platform text NOT NULL,
  device_type text NOT NULL CHECK (device_type IN ('DESKTOP', 'TABLET', 'MOBILE')),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS uq_memberships_one_owner_business_per_user 
  ON public.business_memberships(user_id) 
  WHERE role = 'OWNER';

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_businesses_owner ON public.businesses(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user_status ON public.business_memberships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_devices_user_business ON public.devices(user_id, business_id);
CREATE INDEX IF NOT EXISTS idx_devices_business ON public.devices(business_id);
CREATE INDEX IF NOT EXISTS idx_devices_name ON public.devices(business_id, device_name);

-- RLS Enforcement
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Profiles are readable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are readable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Businesses Policies
DROP POLICY IF EXISTS "Businesses readable by active members" ON public.businesses;
CREATE POLICY "Businesses readable by active members"
  ON public.businesses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = public.businesses.id
        AND bm.user_id = auth.uid()
        AND bm.status = 'ACTIVE'
    )
  );

-- Business Memberships Policies
DROP POLICY IF EXISTS "Memberships readable by user" ON public.business_memberships;
CREATE POLICY "Memberships readable by user"
  ON public.business_memberships FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Devices Policies
DROP POLICY IF EXISTS "Devices accessible by active members" ON public.devices;
CREATE POLICY "Devices accessible by active members"
  ON public.devices FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = public.devices.business_id
        AND bm.user_id = auth.uid()
        AND bm.status = 'ACTIVE'
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = public.devices.business_id
        AND bm.user_id = auth.uid()
        AND bm.status = 'ACTIVE'
    )
  );

-- Grants
REVOKE ALL ON public.profiles FROM anon, public;
REVOKE ALL ON public.businesses FROM anon, public;
REVOKE ALL ON public.business_memberships FROM anon, public;
REVOKE ALL ON public.devices FROM anon, public;

GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.businesses TO authenticated;
GRANT SELECT ON public.business_memberships TO authenticated;
GRANT SELECT, INSERT(business_id, user_id, device_name, platform, device_type), UPDATE(device_name, last_seen_at) ON public.devices TO authenticated;

-- Canonical RPC: bootstrap_owner_business
CREATE OR REPLACE FUNCTION public.bootstrap_owner_business(
  p_first_name text,
  p_last_name text DEFAULT '',
  p_business_name text DEFAULT 'Mi Negocio',
  p_country_code text DEFAULT 'CL'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_business_id uuid;
  v_existing_membership record;
  v_existing_business record;
  v_created boolean := false;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Authoritative email from auth.users
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'User email not found';
  END IF;

  -- Advisory transaction lock to prevent race conditions per user
  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text));

  -- Upsert Profile
  INSERT INTO public.profiles (id, email, first_name, last_name, updated_at)
  VALUES (v_user_id, v_user_email, p_first_name, COALESCE(p_last_name, ''), now())
  ON CONFLICT (id) DO UPDATE
  SET first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      updated_at = now();

  -- Check existing OWNER membership
  SELECT * INTO v_existing_membership
  FROM public.business_memberships
  WHERE user_id = v_user_id AND role = 'OWNER'
  LIMIT 1;

  IF FOUND THEN
    IF v_existing_membership.status = 'REVOKED' THEN
      RAISE EXCEPTION 'OWNER membership is revoked';
    END IF;
    IF v_existing_membership.status = 'INACTIVE' THEN
      RAISE EXCEPTION 'OWNER membership is inactive';
    END IF;

    v_business_id := v_existing_membership.business_id;
    SELECT * INTO v_existing_business FROM public.businesses WHERE id = v_business_id;
  ELSE
    -- Create Business & Active Membership
    INSERT INTO public.businesses (owner_user_id, name, country_code)
    VALUES (v_user_id, COALESCE(p_business_name, 'Mi Negocio'), COALESCE(p_country_code, 'CL'))
    RETURNING id INTO v_business_id;

    INSERT INTO public.business_memberships (business_id, user_id, role, status)
    VALUES (v_business_id, v_user_id, 'OWNER', 'ACTIVE');

    SELECT * INTO v_existing_business FROM public.businesses WHERE id = v_business_id;
    v_created := true;
  END IF;

  RETURN json_build_object(
    'user_id', v_user_id,
    'email', v_user_email,
    'first_name', p_first_name,
    'last_name', COALESCE(p_last_name, ''),
    'business_id', v_business_id,
    'business_name', v_existing_business.name,
    'country_code', v_existing_business.country_code,
    'role', 'OWNER',
    'bootstrap_created', v_created
  );
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_owner_business(text, text, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.bootstrap_owner_business(text, text, text, text) TO authenticated;
