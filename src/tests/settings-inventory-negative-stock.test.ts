import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryBusinessRepository } from '../infrastructure/repositories/InMemoryBusinessRepository';
import { SettingsService } from '../application/settings/SettingsService';
import { setupMockLocalStorage } from './setupMockStorage';

describe('AG-13: Settings Inventory & Negative Stock Storage Isolation', () => {
  let businessRepo: InMemoryBusinessRepository;
  let settingsService: SettingsService;

  beforeEach(() => {
    setupMockLocalStorage();
    localStorage.clear();
    businessRepo = new InMemoryBusinessRepository();
    settingsService = new SettingsService(businessRepo);
  });

  it('defaults allowNegativeStock to false (strict inventory ledger)', async () => {
    const inv = await settingsService.getInventorySettings('biz-test-01');
    expect(inv.allowNegativeStock).toBe(false);
  });

  it('persists allowNegativeStock per businessId in meta storage', async () => {
    // Save true for biz-test-01
    await settingsService.saveInventorySettings(
      'biz-test-01',
      { allowNegativeStock: true },
      { userId: 'usr-1', userName: 'Admin 1' }
    );

    const inv1 = await settingsService.getInventorySettings('biz-test-01');
    const inv2 = await settingsService.getInventorySettings('biz-test-02');

    expect(inv1.allowNegativeStock).toBe(true);
    expect(inv2.allowNegativeStock).toBe(false); // Isolated by businessId
  });
});
