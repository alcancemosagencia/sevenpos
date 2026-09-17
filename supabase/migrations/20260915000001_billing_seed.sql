-- SevenPOS Billing Seed — AG-15C-B

INSERT INTO public.billing_plans
  (id, plan_code, billing_interval, base_net_amount, reference_net_amount, tax_rate, currency, is_active)
VALUES
  ('pro_monthly', 'PRO', 'MONTHLY', 19990, 39990, 0.19, 'CLP', true),
  ('pro_annual',  'PRO', 'ANNUAL',  199990, NULL,  0.19, 'CLP', true)
ON CONFLICT (id) DO UPDATE
  SET base_net_amount = EXCLUDED.base_net_amount,
      reference_net_amount = EXCLUDED.reference_net_amount,
      is_active = EXCLUDED.is_active;

INSERT INTO public.billing_promotions
  (code, name, promotion_scope, discount_type,
   fixed_monthly_net_amount, fixed_annual_net_amount,
   applicable_billing_intervals, duration_type, duration_months,
   max_redemptions, status)
VALUES
  ('FOUNDERS_50', 'Precio Fundadores — Campaña de Lanzamiento', 'PUBLIC', 'FIXED_NET_PRICE',
   9990, 99990, 'BOTH', 'N_MONTHS', 12, NULL, 'ACTIVE')
ON CONFLICT (code) DO UPDATE
  SET fixed_monthly_net_amount = EXCLUDED.fixed_monthly_net_amount,
      fixed_annual_net_amount = EXCLUDED.fixed_annual_net_amount,
      status = EXCLUDED.status;

-- TEST FIXTURES ONLY
INSERT INTO public.billing_promotions
  (code, name, promotion_scope, discount_type, discount_percent_bp,
   applicable_billing_intervals, duration_type, duration_months, max_redemptions, status)
VALUES
  ('TESTAMIGO50', '[TEST] Cupón Amigo 50%', 'PRIVATE', 'PERCENT', 5000,
   'MONTHLY', 'N_MONTHS', 3, 10, 'ACTIVE')
ON CONFLICT (code) DO UPDATE SET discount_percent_bp = EXCLUDED.discount_percent_bp;

INSERT INTO public.billing_promotions
  (code, name, promotion_scope, discount_type, fixed_annual_net_amount,
   applicable_billing_intervals, duration_type, max_redemptions, status)
VALUES
  ('TESTANUAL', '[TEST] Cupón Anual Fijo', 'PRIVATE', 'FIXED_NET_PRICE', 149990,
   'ANNUAL', 'ONCE', 5, 'ACTIVE')
ON CONFLICT (code) DO UPDATE SET fixed_annual_net_amount = EXCLUDED.fixed_annual_net_amount;
