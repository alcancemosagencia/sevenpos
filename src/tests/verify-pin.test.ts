import { describe, it, expect, beforeEach } from 'vitest';
import { VerifyPin } from '../application/auth/VerifyPin';
import { InMemoryUserRepository } from '../infrastructure/repositories/InMemoryUserRepository';
import { WebCryptoPinVaultFallback } from '../infrastructure/security/WebCryptoPinVaultFallback';
import { generateUuid } from '../domain/common/IdGenerator';
import { getCurrentUtcIsoString } from '../domain/common/Timestamp';

describe('VerifyPin Use Case (AG-03 Core)', () => {
  let userRepo: InMemoryUserRepository;
  let pinVault: WebCryptoPinVaultFallback;
  let verifyService: VerifyPin;
  const ownerId = generateUuid();

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    pinVault = new WebCryptoPinVaultFallback();
    verifyService = new VerifyPin(userRepo, pinVault);

    await userRepo.saveUser({
      id: ownerId,
      businessId: generateUuid(),
      firstName: 'Marcos',
      role: 'OWNER',
      active: true,
      createdAt: getCurrentUtcIsoString(),
      updatedAt: getCurrentUtcIsoString(),
    });

    await pinVault.savePinCredential(ownerId, '4321');
  });

  it('validates correct PIN', async () => {
    const result = await verifyService.execute('4321');
    expect(result.isValid).toBe(true);
    expect(result.isLockedOut).toBeFalsy();
  });

  it('rejects incorrect PIN and decrements remaining attempts', async () => {
    const result = await verifyService.execute('9999');
    expect(result.isValid).toBe(false);
    expect(result.remainingAttempts).toBe(4);
    expect(result.error).toContain('PIN incorrecto');
  });

  it('triggers lockout after 5 consecutive failures', async () => {
    for (let i = 0; i < 4; i++) {
      await verifyService.execute('0000');
    }
    const finalAttempt = await verifyService.execute('0000');
    expect(finalAttempt.isValid).toBe(false);
    expect(finalAttempt.isLockedOut).toBe(true);
    expect(finalAttempt.error).toContain('bloqueado temporalmente');
  });
});
