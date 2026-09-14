import { describe, it, expect } from 'vitest';
import { InMemorySubscriptionRepository } from '../infrastructure/repositories/InMemorySubscriptionRepository';
import { EntitlementService } from '../application/subscription/EntitlementService';

describe('Entitlement - Device Display Only & Non-Enforced', () => {
  it('device limit is explicitly configured as display only / non-enforced on Free and Pro', async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const entitlementService = new EntitlementService(subRepo);

    // Free
    const freeDeviceLimit = await entitlementService.getLimit('biz-dev-test', 'devices.registered');
    expect(freeDeviceLimit.enforced).toBe(false);
    expect(freeDeviceLimit.value).toBe(1);

    const checkFree = await entitlementService.checkLimit('biz-dev-test', 'devices.registered');
    expect(checkFree.allowed).toBe(true);
    expect(checkFree.status).toBe('DISPLAY_ONLY');

    // Pro
    await subRepo.setPlan('biz-dev-test', 'PRO');
    const proDeviceLimit = await entitlementService.getLimit('biz-dev-test', 'devices.registered');
    expect(proDeviceLimit.enforced).toBe(false);

    const checkPro = await entitlementService.checkLimit('biz-dev-test', 'devices.registered');
    expect(checkPro.allowed).toBe(true);
  });
});
