import { describe, expect, it } from 'vitest';
import {
  isActiveManualPro,
  isAuthorizedBillingScheduler,
} from '../../supabase/functions/_shared/billingReconcilePolicy';

describe('billing reconciliation access policy', () => {
  it('requires an exact internal credential for global reconciliation', () => {
    expect(isAuthorizedBillingScheduler(null, null, 'cron-secret', 'service-key')).toBe(false);
    expect(isAuthorizedBillingScheduler('Bearer user-jwt', null, 'cron-secret', 'service-key')).toBe(false);
    expect(isAuthorizedBillingScheduler(null, 'wrong', 'cron-secret', 'service-key')).toBe(false);
    expect(isAuthorizedBillingScheduler(null, 'cron-secret', 'cron-secret', 'service-key')).toBe(true);
    expect(isAuthorizedBillingScheduler('Bearer service-key', null, 'cron-secret', 'service-key')).toBe(true);
    expect(isAuthorizedBillingScheduler(null, 'cron-secret', undefined, 'service-key')).toBe(false);
  });

  it('protects only active manual PRO from MP reconciliation', () => {
    expect(isActiveManualPro({ billing_source: 'MANUAL', plan_code: 'PRO', status: 'ACTIVE' })).toBe(true);
    expect(isActiveManualPro({ billing_source: 'MERCADO_PAGO', plan_code: 'PRO', status: 'ACTIVE' })).toBe(false);
    expect(isActiveManualPro({ billing_source: 'MANUAL', plan_code: 'FREE', status: 'EXPIRED' })).toBe(false);
    expect(isActiveManualPro(null)).toBe(false);
  });
});
