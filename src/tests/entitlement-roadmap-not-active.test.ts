import { describe, it, expect } from 'vitest';
import { InMemorySubscriptionRepository } from '../infrastructure/repositories/InMemorySubscriptionRepository';
import { EntitlementService } from '../application/subscription/EntitlementService';
import { ROADMAP_FEATURES } from '../domain/subscription/Plan';

describe('Entitlement - Roadmap Features Not Active', () => {
  it('all roadmap features are defined as COMING_SOON and cannot be claimed as active', async () => {
    const subRepo = new InMemorySubscriptionRepository();
    const entitlementService = new EntitlementService(subRepo);

    expect(ROADMAP_FEATURES.length).toBeGreaterThan(0);

    for (const feature of ROADMAP_FEATURES) {
      expect(feature.status).toBe('COMING_SOON');
      expect(feature.isAvailable).toBe(false);

      const decision = await entitlementService.can('biz-road-test', feature.key);
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('FEATURE_IN_ROADMAP');
    }
  });
});
