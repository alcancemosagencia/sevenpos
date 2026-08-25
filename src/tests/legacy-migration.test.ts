import { describe, it, expect, beforeEach } from 'vitest';
import { LegacyOnboardingMigrator } from '../application/migration/LegacyOnboardingMigrator';
import { InMemoryBusinessRepository } from '../infrastructure/repositories/InMemoryBusinessRepository';
import { InMemoryUserRepository } from '../infrastructure/repositories/InMemoryUserRepository';
import { WebCryptoPinVaultFallback } from '../infrastructure/security/WebCryptoPinVaultFallback';
import { setupMockLocalStorage } from './setupMockStorage';

describe('LegacyOnboardingMigrator (AG-03 Core)', () => {
  let businessRepo: InMemoryBusinessRepository;
  let userRepo: InMemoryUserRepository;
  let pinVault: WebCryptoPinVaultFallback;
  let migrator: LegacyOnboardingMigrator;

  beforeEach(() => {
    setupMockLocalStorage();
    localStorage.clear();
    businessRepo = new InMemoryBusinessRepository();
    userRepo = new InMemoryUserRepository();
    pinVault = new WebCryptoPinVaultFallback();
    migrator = new LegacyOnboardingMigrator(businessRepo, userRepo, pinVault);
  });

  it('migrates legacy completed onboarding from localStorage to repositories and is idempotent', async () => {
    const legacyState = {
      onboardingStatus: 'completed',
      sessionStatus: 'locked',
      currentStep: 6,
      countryCode: 'CL',
      business: {
        name: 'Minimarket Don Pepe',
        fiscalId: '76.999.888-1',
        phone: '912345678',
        phonePrefix: '+56',
        address: 'Av. Providencia 1234',
      },
      regionalSettings: {
        primaryCurrencyCode: 'CLP',
        enableSecondaryUSD: false,
      },
      owner: {
        firstName: 'José',
        lastName: 'Pérez',
        email: 'pepe@donpepe.cl',
        role: 'Dueño',
      },
      pinHash: 'mock-hash',
      pinSalt: 'mock-salt',
    };

    localStorage.setItem('sevenpos-onboarding-state', JSON.stringify(legacyState));
    localStorage.setItem('sevenpos-theme-preference', 'dark');

    // Run Migration 1
    const result1 = await migrator.migrateIfNeeded();
    expect(result1.migrated).toBe(true);
    expect(result1.businessName).toBe('Minimarket Don Pepe');

    // Verify Repository Data
    const business = await businessRepo.getPrimaryBusiness();
    expect(business?.name).toBe('Minimarket Don Pepe');
    expect(business?.countryCode).toBe('CL');

    const owner = await userRepo.getOwnerUser();
    expect(owner?.firstName).toBe('José');

    // Verify localStorage cleanup (domain key removed, theme preserved)
    expect(localStorage.getItem('sevenpos-onboarding-state')).toBeNull();
    expect(localStorage.getItem('sevenpos-theme-preference')).toBe('dark');

    // Run Migration 2 (Idempotency Check)
    const result2 = await migrator.migrateIfNeeded();
    expect(result2.migrated).toBe(false);
  });
});
