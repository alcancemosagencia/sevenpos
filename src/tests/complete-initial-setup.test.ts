import { describe, it, expect, beforeEach } from 'vitest';
import { CompleteInitialSetup } from '../application/onboarding/CompleteInitialSetup';
import { InMemoryBusinessRepository } from '../infrastructure/repositories/InMemoryBusinessRepository';
import { InMemoryUserRepository } from '../infrastructure/repositories/InMemoryUserRepository';
import { WebCryptoPinVaultFallback } from '../infrastructure/security/WebCryptoPinVaultFallback';
import { PinVault } from '../domain/auth/PinVault';

describe('CompleteInitialSetup Use Case (AG-03 Core)', () => {
  let businessRepo: InMemoryBusinessRepository;
  let userRepo: InMemoryUserRepository;
  let pinVault: WebCryptoPinVaultFallback;
  let setupService: CompleteInitialSetup;

  beforeEach(() => {
    businessRepo = new InMemoryBusinessRepository();
    userRepo = new InMemoryUserRepository();
    pinVault = new WebCryptoPinVaultFallback();
    setupService = new CompleteInitialSetup(businessRepo, userRepo, pinVault);
  });

  it('completes initial setup successfully across business, settings, owner and vault', async () => {
    const result = await setupService.execute({
      business: {
        name: 'Panadería La Aurora',
        countryCode: 'CO',
        fiscalId: '900.123.456-1',
        phone: '3001234567',
        phonePrefix: '+57',
        address: 'Calle 10 # 5-20',
      },
      settings: {
        primaryCurrency: 'COP',
        secondaryCurrency: null,
        secondaryCurrencyEnabled: false,
        exchangeRateProvider: null,
      },
      owner: {
        firstName: 'Andrea',
        lastName: 'Gómez',
        email: 'andrea@laaurora.co',
      },
      pin: '5678',
    });

    expect(result.success).toBe(true);
    expect(result.business?.name).toBe('Panadería La Aurora');
    expect(result.owner?.role).toBe('OWNER');

    // Verify stored state in repositories
    const savedBusiness = await businessRepo.getPrimaryBusiness();
    expect(savedBusiness).not.toBeNull();
    expect(savedBusiness?.countryCode).toBe('CO');

    const savedOwner = await userRepo.getOwnerUser();
    expect(savedOwner).not.toBeNull();
    expect(savedOwner?.firstName).toBe('Andrea');

    // Verify PIN verification in vault
    const isPinValid = await pinVault.verifyPin(result.owner!.id, '5678');
    expect(isPinValid).toBe(true);
    const isPinInvalid = await pinVault.verifyPin(result.owner!.id, '0000');
    expect(isPinInvalid).toBe(false);
  });

  it('executes rollback compensation if vault storage fails', async () => {
    const failingVault: PinVault = {
      savePinCredential: async () => {
        throw new Error('Vault write simulated hardware error');
      },
      verifyPin: async () => false,
      hasPinCredential: async () => false,
      resetVault: async () => {},
    };

    const failingService = new CompleteInitialSetup(businessRepo, userRepo, failingVault);

    const result = await failingService.execute({
      business: {
        name: 'Abasto Caracas',
        countryCode: 'VE',
      },
      settings: {
        primaryCurrency: 'VES',
        secondaryCurrency: 'USD',
        secondaryCurrencyEnabled: true,
      },
      owner: {
        firstName: 'Pedro',
      },
      pin: '1234',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Vault write simulated hardware error');

    // Verify database was cleanly rolled back / cleaned
    const savedBusiness = await businessRepo.getPrimaryBusiness();
    expect(savedBusiness).toBeNull();
    const savedOwner = await userRepo.getOwnerUser();
    expect(savedOwner).toBeNull();
  });
});
