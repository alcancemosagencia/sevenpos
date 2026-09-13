import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryUserRepository } from '../infrastructure/repositories/InMemoryUserRepository';
import { WebCryptoPinVaultFallback } from '../infrastructure/security/WebCryptoPinVaultFallback';
import { OperationalUserService } from '../application/user/OperationalUserService';
import { pinLockoutManager } from '../domain/auth/PinLockoutManager';

describe('Operational Users - PIN Lockout & Brute Force Protection Runtime', () => {
  let userRepo: InMemoryUserRepository;
  let pinVault: WebCryptoPinVaultFallback;
  let userService: OperationalUserService;

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    pinVault = new WebCryptoPinVaultFallback();
    userService = new OperationalUserService(userRepo, pinVault);
  });

  it('locks out user for 30s after 5 consecutive failed PIN attempts and fast-rejects 6th attempt', async () => {
    const createRes = await userService.createUser({
      businessId: 'biz-1',
      firstName: 'Cajero Protegido',
      role: 'CASHIER',
      pin: '9999',
    });
    expect(createRes.success).toBe(true);
    const userId = createRes.user!.id;

    for (let i = 1; i <= 5; i++) {
      const res = await userService.verifyUserPin('biz-1', userId, '0000', 'dev-1');
      expect(res.success).toBe(false);
      if (i < 5) {
        expect(res.isLockedOut).toBe(false);
        expect(res.error).toContain('PIN incorrecto');
      } else {
        expect(res.isLockedOut).toBe(true);
        expect(res.error).toContain('bloqueado');
        expect(res.remainingSeconds).toBeGreaterThan(0);
      }
    }

    const fastReject = await userService.verifyUserPin('biz-1', userId, '9999', 'dev-1');
    expect(fastReject.success).toBe(false);
    expect(fastReject.isLockedOut).toBe(true);
    expect(fastReject.error).toContain('bloqueado');

    const routeSwitchCheck = pinLockoutManager.getStatus(userId);
    expect(routeSwitchCheck.isLocked).toBe(true);
  });

  it('resets failed attempt counter upon entering the correct PIN before reaching threshold', async () => {
    const createRes = await userService.createUser({
      businessId: 'biz-1',
      firstName: 'Cajero Confiable',
      role: 'CASHIER',
      pin: '1234',
    });
    const userId = createRes.user!.id;

    await userService.verifyUserPin('biz-1', userId, '0000', 'dev-1');
    await userService.verifyUserPin('biz-1', userId, '0000', 'dev-1');

    const successRes = await userService.verifyUserPin('biz-1', userId, '1234', 'dev-1');
    expect(successRes.success).toBe(true);

    const status = pinLockoutManager.getStatus(userId);
    expect(status.isLocked).toBe(false);
  });
});
