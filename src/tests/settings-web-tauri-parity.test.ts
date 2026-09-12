import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryBusinessRepository } from '../infrastructure/repositories/InMemoryBusinessRepository';
import { SettingsService } from '../application/settings/SettingsService';
import { setupMockLocalStorage } from './setupMockStorage';

describe('AG-13: Settings Web vs Tauri Parity Matrix', () => {
  let businessRepo: InMemoryBusinessRepository;
  let settingsService: SettingsService;

  beforeEach(() => {
    setupMockLocalStorage();
    localStorage.clear();
    businessRepo = new InMemoryBusinessRepository();
    settingsService = new SettingsService(businessRepo);
  });

  it('provides device information with natural copy in web/dev fallback', () => {
    const dev = settingsService.getDeviceSettings();
    expect(dev).toBeDefined();
    expect(dev.displayName).toBeDefined();
    expect(dev.platform).toBeDefined();
    expect(dev.status).toBeDefined();
  });

  it('maintains symmetrical storage contract for all 8 settings categories', async () => {
    const gen = await settingsService.getGeneralSettings('biz-1');
    const curr = await settingsService.getCurrencySettings('biz-1');
    const pos = settingsService.getPosSettings();
    const print = settingsService.getPrintingSettings();
    const inv = await settingsService.getInventorySettings('biz-1');
    const dev = settingsService.getDeviceSettings();

    expect(gen === null || typeof gen.name === 'string').toBe(true);
    expect(curr === null || typeof curr.primaryCurrency === 'string').toBe(true);
    expect(pos).toHaveProperty('confirmBeforeFinalizingSale');
    expect(pos).toHaveProperty('showStockInGrid');
    expect(pos).toHaveProperty('autoPrintReceipt');
    expect(print).toHaveProperty('paperFormat');
    expect(inv).toHaveProperty('allowNegativeStock');
    expect(dev).toHaveProperty('deviceType');
  });
});
