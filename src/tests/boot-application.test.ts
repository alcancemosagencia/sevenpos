import { describe, it, expect, beforeEach } from 'vitest';
import { BootApplication } from '../application/boot/BootApplication';
import { DatabaseManager } from '../infrastructure/database/DatabaseManager';
import { InMemoryBusinessRepository } from '../infrastructure/repositories/InMemoryBusinessRepository';
import { InMemoryUserRepository } from '../infrastructure/repositories/InMemoryUserRepository';
import { WebCryptoPinVaultFallback } from '../infrastructure/security/WebCryptoPinVaultFallback';
import { generateUuid } from '../domain/common/IdGenerator';
import { getCurrentUtcIsoString } from '../domain/common/Timestamp';
import { setupMockLocalStorage } from './setupMockStorage';

describe('BootApplication Resolver (AG-03 Core)', () => {
  let dbManager: DatabaseManager;
  let businessRepo: InMemoryBusinessRepository;
  let userRepo: InMemoryUserRepository;
  let pinVault: WebCryptoPinVaultFallback;
  let bootService: BootApplication;

  beforeEach(() => {
    setupMockLocalStorage();
    localStorage.clear();
    dbManager = new DatabaseManager();
    businessRepo = new InMemoryBusinessRepository();
    userRepo = new InMemoryUserRepository();
    pinVault = new WebCryptoPinVaultFallback();
    bootService = new BootApplication(dbManager, businessRepo, userRepo, pinVault);
  });

  it('boots to incomplete onboarding when repositories are empty', async () => {
    const result = await bootService.execute();
    expect(result.status).toBe('READY');
    expect(result.onboardingStatus).toBe('incomplete');
    expect(result.business).toBeNull();
  });

  it('boots to completed onboarding and forces session locked on configured terminal', async () => {
    const businessId = generateUuid();
    await businessRepo.saveBusinessWithSettings(
      {
        id: businessId,
        name: 'Bodega Sol',
        countryCode: 'VE',
        createdAt: getCurrentUtcIsoString(),
        updatedAt: getCurrentUtcIsoString(),
      },
      {
        businessId,
        primaryCurrency: 'VES',
        secondaryCurrency: 'USD',
        secondaryCurrencyEnabled: true,
        createdAt: getCurrentUtcIsoString(),
        updatedAt: getCurrentUtcIsoString(),
      }
    );

    await userRepo.saveUser({
      id: generateUuid(),
      businessId,
      firstName: 'Elena',
      role: 'OWNER',
      active: true,
      createdAt: getCurrentUtcIsoString(),
      updatedAt: getCurrentUtcIsoString(),
    });

    const result = await bootService.execute();
    expect(result.status).toBe('READY');
    expect(result.onboardingStatus).toBe('completed');
    expect(result.sessionStatus).toBe('locked'); // Native start always locks session
    expect(result.business?.name).toBe('Bodega Sol');
  });
});
