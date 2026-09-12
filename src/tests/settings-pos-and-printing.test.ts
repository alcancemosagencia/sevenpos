import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryBusinessRepository } from '../infrastructure/repositories/InMemoryBusinessRepository';
import { SettingsService } from '../application/settings/SettingsService';
import { setupMockLocalStorage } from './setupMockStorage';

describe('AG-13: Settings POS & Printing Preferences', () => {
  let businessRepo: InMemoryBusinessRepository;
  let settingsService: SettingsService;

  beforeEach(() => {
    setupMockLocalStorage();
    localStorage.clear();
    businessRepo = new InMemoryBusinessRepository();
    settingsService = new SettingsService(businessRepo);
  });

  it('provides sensible defaults for POS preferences', () => {
    const pos = settingsService.getPosSettings();
    expect(pos.confirmBeforeFinalizingSale).toBe(true);
    expect(pos.showStockInGrid).toBe(true);
    expect(pos.autoPrintReceipt).toBe(false);
  });

  it('persists POS settings changes to centralized storage and reads them correctly', async () => {
    const res = await settingsService.savePosSettings(
      {
        confirmBeforeFinalizingSale: false,
        showStockInGrid: true,
        autoPrintReceipt: true,
      },
      {
        userId: 'usr-1',
        userName: 'Omar Admin',
        businessId: 'biz-1',
      }
    );

    expect(res.success).toBe(true);

    const updated = settingsService.getPosSettings();
    expect(updated.confirmBeforeFinalizingSale).toBe(false);
    expect(updated.showStockInGrid).toBe(true);
    expect(updated.autoPrintReceipt).toBe(true);
  });

  it('defaults printer format to 80mm and allows switching to 58mm', async () => {
    expect(settingsService.getPrintingSettings().paperFormat).toBe('80mm');

    const res = await settingsService.savePrintingSettings(
      { paperFormat: '58mm' },
      {
        userId: 'usr-1',
        userName: 'Omar Admin',
        businessId: 'biz-1',
      }
    );

    expect(res.success).toBe(true);
    expect(settingsService.getPrintingSettings().paperFormat).toBe('58mm');
  });
});
