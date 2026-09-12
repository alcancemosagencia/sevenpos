import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryBusinessRepository } from '../infrastructure/repositories/InMemoryBusinessRepository';
import { SettingsService } from '../application/settings/SettingsService';
import { Business } from '../domain/business/Business';

describe('AG-13: Settings Currency & Venezuela Multi-Currency', () => {
  let businessRepo: InMemoryBusinessRepository;
  let settingsService: SettingsService;

  const mockVeBusiness: Business = {
    id: 'biz-ve-01',
    name: 'Bodegón Caracas',
    countryCode: 'VE',
    fiscalId: 'J-12345678-9',
    phone: '4141234567',
    phonePrefix: '+58',
    address: 'Av. Las Mercedes 100',
    createdAt: '2026-09-11T10:00:00.000Z',
    updatedAt: '2026-09-11T10:00:00.000Z',
  };

  beforeEach(async () => {
    businessRepo = new InMemoryBusinessRepository();
    await businessRepo.saveBusinessWithSettings(mockVeBusiness, {
      businessId: 'biz-ve-01',
      primaryCurrency: 'VES',
      secondaryCurrency: 'USD',
      secondaryCurrencyEnabled: false,
      exchangeRateProvider: 'MANUAL',
      createdAt: '2026-09-11T10:00:00.000Z',
      updatedAt: '2026-09-11T10:00:00.000Z',
    });
    settingsService = new SettingsService(businessRepo);
  });

  it('loads Venezuela currency settings with primary VES', async () => {
    const data = await settingsService.getCurrencySettings('biz-ve-01');
    expect(data).not.toBeNull();
    expect(data?.countryCode).toBe('VE');
    expect(data?.primaryCurrency).toBe('VES');
    expect(data?.secondaryCurrencyEnabled).toBe(false);
  });

  it('enables USD multi-currency and saves manual exchange rate', async () => {
    const saveRes = await settingsService.saveCurrencySettings(
      'biz-ve-01',
      {
        countryCode: 'VE',
        primaryCurrency: 'VES',
        secondaryCurrencyEnabled: true,
        secondaryCurrency: 'USD',
        exchangeRateProvider: 'MANUAL',
        manualExchangeRate: 980.5,
      },
      {
        userId: 'usr-1',
        userName: 'Admin VE',
      }
    );

    expect(saveRes.success).toBe(true);

    const updated = await settingsService.getCurrencySettings('biz-ve-01');
    expect(updated?.secondaryCurrencyEnabled).toBe(true);
    expect(updated?.manualExchangeRate).toBe(980.5);
  });

  it('rejects non-positive exchange rate', async () => {
    const saveRes = await settingsService.saveCurrencySettings(
      'biz-ve-01',
      {
        countryCode: 'VE',
        primaryCurrency: 'VES',
        secondaryCurrencyEnabled: true,
        secondaryCurrency: 'USD',
        exchangeRateProvider: 'MANUAL',
        manualExchangeRate: 0,
      },
      {
        userId: 'usr-1',
        userName: 'Admin VE',
      }
    );

    expect(saveRes.success).toBe(false);
    expect(saveRes.error).toContain('mayor a 0');
  });
});
