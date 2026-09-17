-- ==============================================================================
-- SevenPOS — Billing Cloud Schema
-- Migration: AG-15C-B
-- ==============================================================================

-- 1. BILLING_PLANS
CREATE TABLE IF NOT EXISTS public.billing_plans (
  id text PRIMARY KEY,
  plan_code text NOT NULL,
  billing_interval text NOT NULL,
  base_net_amount integer NOT NULL,
  reference_net_amount integer,
  tax_rate numeric(4,2) NOT NULL DEFAULT 0.19,
  currency text NOT NULL DEFAULT 'CLP',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_billing_plan_interval CHECK (billing_interval IN ('MONTHLY', 'ANNUAL')),
  CONSTRAINT chk_billing_plan_code CHECK (plan_code IN ('FREE', 'PRO')),
  CONSTRAINT chk_billing_plan_net_positive CHECK (base_net_amount > 0),
  CONSTRAINT chk_billing_plan_currency CHECK (currency = 'CLP')
);

-- 2. BILLING_PROMOTIONS
CREATE TABLE IF NOT EXISTS public.billing_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  promotion_scope text NOT NULL,
  discount_type text NOT NULL,
  discount_percent_bp integer,
  fixed_monthly_net_amount integer,
  fixed_annual_net_amount integer,
  applicable_billing_intervals text NOT NULL DEFAULT 'BOTH',
  duration_type text NOT NULL,
  duration_months integer,
  max_redemptions integer,
  redemptions_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ACTIVE',
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_promo_scope CHECK (promotion_scope IN ('PUBLIC', 'PRIVATE')),
  CONSTRAINT chk_promo_discount_type CHECK (discount_type IN ('PERCENT', 'FIXED_NET_PRICE', 'FREE')),
  CONSTRAINT chk_promo_duration_type CHECK (duration_type IN ('ONCE', 'N_MONTHS', 'FOREVER')),
  CONSTRAINT chk_promo_status CHECK (status IN ('ACTIVE', 'CLOSED')),
  CONSTRAINT chk_promo_applicable_intervals CHECK (applicable_billing_intervals IN ('MONTHLY', 'ANNUAL', 'BOTH')),
  CONSTRAINT chk_promo_percent_has_bp CHECK (discount_type != 'PERCENT' OR discount_percent_bp IS NOT NULL),
  CONSTRAINT chk_promo_percent_bp_range CHECK (discount_percent_bp IS NULL OR (discount_percent_bp > 0 AND discount_percent_bp <= 10000)),
  CONSTRAINT chk_promo_fixed_has_at_least_one_amount CHECK (
    discount_type != 'FIXED_NET_PRICE'
    OR (fixed_monthly_net_amount IS NOT NULL OR fixed_annual_net_amount IS NOT NULL)
  ),
  CONSTRAINT chk_promo_monthly_amount_present CHECK (
    applicable_billing_intervals NOT IN ('MONTHLY', 'BOTH')
    OR discount_type != 'FIXED_NET_PRICE'
    OR fixed_monthly_net_amount IS NOT NULL
  ),
  CONSTRAINT chk_promo_annual_amount_present CHECK (
    applicable_billing_intervals NOT IN ('ANNUAL', 'BOTH')
    OR discount_type != 'FIXED_NET_PRICE'
    OR fixed_annual_net_amount IS NOT NULL
  ),
  CONSTRAINT chk_promo_n_months_has_duration CHECK (duration_type != 'N_MONTHS' OR duration_months IS NOT NULL),
  CONSTRAINT chk_promo_amounts_positive CHECK (
    (fixed_monthly_net_amount IS NULL OR fixed_monthly_net_amount >= 0)
    AND (fixed_annual_net_amount IS NULL OR fixed_annual_net_amount >= 0)
  )
);

-- 3. BILLING_INTENTS
CREATE TABLE IF NOT EXISTS public.billing_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES public.billing_plans(id),
  promotion_id uuid REFERENCES public.billing_promotions(id),
  base_net_amount integer NOT NULL,
  discount_net_amount integer NOT NULL DEFAULT 0,
  final_net_amount integer NOT NULL,
  tax_amount integer NOT NULL,
  final_gross_amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'CLP',
  mp_preapproval_id text,
  mp_init_point text,
  status text NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + INTERVAL '2 hours'),
  CONSTRAINT chk_billing_intent_status CHECK (status IN ('PENDING', 'PROCESSED', 'EXPIRED', 'FAILED')),
  CONSTRAINT chk_billing_intent_amounts_positive CHECK (
    base_net_amount > 0 AND final_net_amount >= 0 AND tax_amount >= 0
    AND final_gross_amount >= 0 AND discount_net_amount >= 0
  ),
  CONSTRAINT chk_billing_intent_math CHECK (final_gross_amount = final_net_amount + tax_amount)
);

-- 4. BUSINESS_SUBSCRIPTIONS (mutable current state)
CREATE TABLE IF NOT EXISTS public.business_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid UNIQUE NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan_code text NOT NULL DEFAULT 'FREE',
  billing_interval text,
  status text NOT NULL DEFAULT 'ACTIVE',
  mp_preapproval_id text UNIQUE,
  mp_payer_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  cancel_requested_at timestamptz,
  provider_cancel_due_at timestamptz,
  provider_cancel_applied_at timestamptz,
  past_due_since timestamptz,
  price_transition_due_at timestamptz,
  price_transition_applied_at timestamptz,
  price_transition_confirmed_amount integer,
  active_contract_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_sub_plan_code CHECK (plan_code IN ('FREE', 'PRO')),
  CONSTRAINT chk_sub_status CHECK (status IN ('PENDING', 'ACTIVE', 'PAST_DUE', 'EXPIRED')),
  CONSTRAINT chk_sub_billing_interval CHECK (billing_interval IS NULL OR billing_interval IN ('MONTHLY', 'ANNUAL'))
);

-- 5. BILLING_CONTRACTS (APPEND-ONLY)
CREATE TABLE IF NOT EXISTS public.billing_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.business_subscriptions(id),
  pricing_version text NOT NULL,
  billing_interval text NOT NULL,
  base_net_amount integer NOT NULL,
  discount_net_amount integer NOT NULL DEFAULT 0,
  final_net_amount integer NOT NULL,
  tax_rate numeric(4,2) NOT NULL,
  tax_amount integer NOT NULL,
  final_gross_amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'CLP',
  promotion_code text,
  promotion_type text,
  promotion_duration_type text,
  promotion_duration_months integer,
  renewal_net_amount integer NOT NULL,
  renewal_gross_amount integer NOT NULL,
  promo_end_date timestamptz,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_contract_interval CHECK (billing_interval IN ('MONTHLY', 'ANNUAL')),
  CONSTRAINT chk_contract_math CHECK (final_gross_amount = final_net_amount + tax_amount),
  CONSTRAINT chk_contract_amounts_non_negative CHECK (
    final_net_amount >= 0 AND tax_amount >= 0
    AND final_gross_amount >= 0 AND discount_net_amount >= 0
  )
);

-- FK from business_subscriptions to billing_contracts
ALTER TABLE public.business_subscriptions
  ADD CONSTRAINT fk_active_contract
  FOREIGN KEY (active_contract_id)
  REFERENCES public.billing_contracts(id)
  DEFERRABLE INITIALLY DEFERRED;

-- APPEND-ONLY PROTECTION
CREATE OR REPLACE FUNCTION public.billing_contracts_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION
    'billing_contracts is append-only. UPDATE and DELETE are prohibited. '
    'Create a new contract row for commercial changes.';
END;
$$;

DROP TRIGGER IF EXISTS trg_billing_contracts_no_update ON public.billing_contracts;
CREATE TRIGGER trg_billing_contracts_no_update
  BEFORE UPDATE ON public.billing_contracts
  FOR EACH ROW EXECUTE FUNCTION public.billing_contracts_immutable();

DROP TRIGGER IF EXISTS trg_billing_contracts_no_delete ON public.billing_contracts;
CREATE TRIGGER trg_billing_contracts_no_delete
  BEFORE DELETE ON public.billing_contracts
  FOR EACH ROW EXECUTE FUNCTION public.billing_contracts_immutable();

-- 6. SUBSCRIPTION_PAYMENTS
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.business_subscriptions(id),
  contract_id uuid REFERENCES public.billing_contracts(id),
  provider text NOT NULL DEFAULT 'MERCADOPAGO',
  provider_payment_id text UNIQUE,
  status text NOT NULL,
  currency text NOT NULL DEFAULT 'CLP',
  gross_amount integer NOT NULL,
  provider_fee integer,
  net_settlement integer,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_payment_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'REFUNDED')),
  CONSTRAINT chk_payment_gross_positive CHECK (gross_amount > 0)
);

-- 7. SUBSCRIPTION_WEBHOOK_EVENTS
CREATE TABLE IF NOT EXISTS public.subscription_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway text NOT NULL DEFAULT 'MERCADOPAGO',
  notification_id text,
  event_type text,
  event_action text,
  resource_id text,
  x_request_id text,
  mp_preapproval_id text,
  processed boolean NOT NULL DEFAULT false,
  processing_error text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  CONSTRAINT uq_webhook_idempotency
    UNIQUE NULLS NOT DISTINCT (gateway, notification_id, event_type)
);

-- 8. SUBSCRIPTION_EVENTS
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.business_subscriptions(id),
  event_type text NOT NULL,
  previous_status text,
  new_status text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_billing_plans_active ON public.billing_plans(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_billing_promotions_code ON public.billing_promotions(code);
CREATE INDEX IF NOT EXISTS idx_billing_promotions_active ON public.billing_promotions(status) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_billing_intents_business ON public.billing_intents(business_id, status);
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_business ON public.business_subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_cancel_due ON public.business_subscriptions(provider_cancel_due_at) WHERE cancel_at_period_end = true AND provider_cancel_applied_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_transition_due ON public.business_subscriptions(price_transition_due_at) WHERE price_transition_applied_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_expiry ON public.business_subscriptions(current_period_end) WHERE status = 'ACTIVE' AND cancel_at_period_end = true;
CREATE INDEX IF NOT EXISTS idx_billing_contracts_business ON public.billing_contracts(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription ON public.subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_provider_id ON public.subscription_payments(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_idempotency ON public.subscription_webhook_events(gateway, notification_id, event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_unprocessed ON public.subscription_webhook_events(received_at) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_subscription_events_business ON public.subscription_events(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON public.subscription_events(event_type, created_at DESC);

-- RLS
ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Billing plans readable by authenticated users" ON public.billing_plans;
CREATE POLICY "Billing plans readable by authenticated users" ON public.billing_plans FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Public promotions readable by authenticated users" ON public.billing_promotions;
CREATE POLICY "Public promotions readable by authenticated users" ON public.billing_promotions FOR SELECT TO authenticated USING (promotion_scope = 'PUBLIC' AND status = 'ACTIVE');

DROP POLICY IF EXISTS "Billing intents readable by business owner" ON public.billing_intents;
CREATE POLICY "Billing intents readable by business owner" ON public.billing_intents FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.business_memberships bm WHERE bm.business_id = public.billing_intents.business_id AND bm.user_id = auth.uid() AND bm.role = 'OWNER' AND bm.status = 'ACTIVE'));

DROP POLICY IF EXISTS "Subscriptions readable by business owner" ON public.business_subscriptions;
CREATE POLICY "Subscriptions readable by business owner" ON public.business_subscriptions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.business_memberships bm WHERE bm.business_id = public.business_subscriptions.business_id AND bm.user_id = auth.uid() AND bm.role = 'OWNER' AND bm.status = 'ACTIVE'));

DROP POLICY IF EXISTS "Contracts readable by business owner" ON public.billing_contracts;
CREATE POLICY "Contracts readable by business owner" ON public.billing_contracts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.business_memberships bm WHERE bm.business_id = public.billing_contracts.business_id AND bm.user_id = auth.uid() AND bm.role = 'OWNER' AND bm.status = 'ACTIVE'));

DROP POLICY IF EXISTS "Payments readable by business owner" ON public.subscription_payments;
CREATE POLICY "Payments readable by business owner" ON public.subscription_payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.business_memberships bm WHERE bm.business_id = public.subscription_payments.business_id AND bm.user_id = auth.uid() AND bm.role = 'OWNER' AND bm.status = 'ACTIVE'));

DROP POLICY IF EXISTS "Subscription events readable by business owner" ON public.subscription_events;
CREATE POLICY "Subscription events readable by business owner" ON public.subscription_events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.business_memberships bm WHERE bm.business_id = public.subscription_events.business_id AND bm.user_id = auth.uid() AND bm.role = 'OWNER' AND bm.status = 'ACTIVE'));

-- GRANTS
REVOKE ALL ON public.billing_plans FROM anon, public;
REVOKE ALL ON public.billing_promotions FROM anon, public;
REVOKE ALL ON public.billing_intents FROM anon, public;
REVOKE ALL ON public.business_subscriptions FROM anon, public;
REVOKE ALL ON public.billing_contracts FROM anon, public;
REVOKE ALL ON public.subscription_payments FROM anon, public;
REVOKE ALL ON public.subscription_webhook_events FROM anon, public;
REVOKE ALL ON public.subscription_events FROM anon, public;

GRANT SELECT ON public.billing_plans TO authenticated;
GRANT SELECT ON public.billing_promotions TO authenticated;
GRANT SELECT ON public.billing_intents TO authenticated;
GRANT SELECT ON public.business_subscriptions TO authenticated;
GRANT SELECT ON public.billing_contracts TO authenticated;
GRANT SELECT ON public.subscription_payments TO authenticated;
GRANT SELECT ON public.subscription_events TO authenticated;
