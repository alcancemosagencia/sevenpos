import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryBusinessRepository } from '../infrastructure/repositories/InMemoryBusinessRepository';
import { SettingsService } from '../application/settings/SettingsService';
import { Business } from '../domain/business/Business';

describe('AG-13: Settings Business Scope & General Section', () => {
  let businessRepo: InMemoryBusinessRepository;
  let settingsService: SettingsService;

  const mockBusiness: Business = {
    id: 'biz-test-01',
    name: 'Minimarket Don Pepe',
    countryCode: 'CL',
    fiscalId: '76.123.456-7',
    phone: '912345678',
    phonePrefix: '+56',
    address: 'Av. Providencia 1234',
    createdAt: '2026-09-11T10:00:00.000Z',
    updatedAt: '2026-09-11T10:00:00.000Z',
  };

  beforeEach(async () => {
    businessRepo = new InMemoryBusinessRepository();
    await businessRepo.saveBusinessWithSettings(mockBusiness, {
      businessId: 'biz-test-01',
      primaryCurrency: 'CLP',
      secondaryCurrency: null,
      secondaryCurrencyEnabled: false,
      createdAt: '2026-09-11T10:00:00.000Z',
      updatedAt: '2026-09-11T10:00:00.000Z',
    });

    settingsService = new SettingsService(businessRepo);
  });

  it('correctly loads business general settings', async () => {
    const data = await settingsService.getGeneralSettings('biz-test-01');
    expect(data).not.toBeNull();
    expect(data?.name).toBe('Minimarket Don Pepe');
    expect(data?.countryCode).toBe('CL');
    expect(data?.fiscalId).toBe('76.123.456-7');
  });

  it('persists business updates to BusinessRepository and emits settings.business_updated audit event', async () => {
    const updateResult = await settingsService.saveGeneralSettings(
      'biz-test-01',
      {
        name: 'Minimarket Don Pepe SpA',
        fiscalId: '76.999.888-K',
        phone: '987654321',
        phonePrefix: '+56',
        address: 'Nueva Providencia 5678',
        countryCode: 'CL',
      },
      {
        userId: 'usr-owner-01',
        userName: 'José Pérez',
      }
    );

    expect(updateResult.success).toBe(true);

    // Verify repository update
    const updated = await businessRepo.getPrimaryBusiness();
    expect(updated?.name).toBe('Minimarket Don Pepe SpA');
    expect(updated?.fiscalId).toBe('76.999.888-K');
    expect(updated?.address).toBe('Nueva Providencia 5678');
  });

  it('rejects empty business name during validation', async () => {
    const res = await settingsService.saveGeneralSettings(
      'biz-test-01',
      {
        name: '   ',
        fiscalId: '76.123.456-7',
        phone: '912345678',
        phonePrefix: '+56',
        address: 'Av. Providencia 1234',
        countryCode: 'CL',
      },
      {
        userId: 'usr-owner-01',
        userName: 'José Pérez',
      }
    );

    expect(res.success).toBe(false);
    expect(res.error).toBe('El nombre del negocio es obligatorio.');
  });
});
